import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { getJwtSecret, MAX_LOGIN_ATTEMPTS, LOCK_TIME } from '../../config/jwt.js';
import { signupSchema, loginSchema } from '../../utils/validation.js';
import { generateAccessToken, generateRefreshToken } from '../../utils/jwt.js';
import { z } from 'zod';
import { AuthRequest, LoginBody, SignupBody, VerifyEmailBody, UserProfile } from './types.js';
import { queries } from '../../models/index.js';

export const login = async (req: Request<{}, {}, LoginBody>, res: Response) => {
  try {
    console.log('Processing login request');
    const { email, password } = req.body;

    try {
      loginSchema.parse({ email, password });
    } catch (error) {
      if (error instanceof z.ZodError) {
        console.log('Login validation failed:', error.errors);
        return res.status(400).json({
          message: 'Validation failed',
          errors: error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message
          }))
        });
      }
    }

    // Get user from database
    const user = await queries.getUserByEmail(email);
    
    if (!user) {
      console.log('Login attempt with non-existent email:', email);
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Check if account is locked
    if (user.locked_until && new Date(user.locked_until) > new Date()) {
      console.log(`Account locked for user ${user.id} until ${user.locked_until}`);
      return res.status(401).json({
        message: 'Account is locked. Please try again later.',
        lockExpires: user.locked_until.toISOString()
      });
    }

    // Verify password
    if (!user.password_hash) {
      console.log(`User ${user.id} has no password (OAuth account)`);
      return res.status(401).json({ message: 'Invalid login method' });
    }

    const isValidPassword = await bcrypt.compare(password, user.password_hash);

    if (!isValidPassword) {
      const loginAttempts = (user.login_attempts || 0) + 1;
      let lockUntil: Date | undefined;

      if (loginAttempts >= MAX_LOGIN_ATTEMPTS) {
        lockUntil = new Date(Date.now() + LOCK_TIME);
        console.log(`Locking account for user ${user.id} until ${lockUntil}`);
      }

      // Update login attempts and lock status
      await queries.updateLoginAttempts(user.id, loginAttempts, lockUntil);

      if (lockUntil) {
        return res.status(401).json({
          message: 'Account locked due to too many failed attempts',
          lockExpires: lockUntil.toISOString()
        });
      }

      console.log(`Failed login attempt for email: ${email}`);

      return res.status(400).json({
        message: 'Invalid credentials',
        attemptsRemaining: MAX_LOGIN_ATTEMPTS - loginAttempts
      });
    }

    // Reset login attempts on successful login
    if (user.login_attempts > 0) {
      await queries.updateLoginAttempts(user.id, 0, undefined);
    }

    const [accessToken, refreshToken] = await Promise.all([
      generateAccessToken(user.id),
      generateRefreshToken(user.id)
    ]);
    
    // Store refresh token
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days from now
    await queries.createRefreshToken(user.id, refreshToken, expiresAt);
    
    console.log(`Successful login for user: ${user.id}`);
    
    res.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name
      },
      accessToken,
      refreshToken
    });
  } catch (error) {
    console.error('Login error:', error);
    if (error instanceof Error) {
      res.status(500).json({ 
        message: 'Internal server error',
        error: error.message 
      });
    } else {
      res.status(500).json({ message: 'Internal server error' });
    }
  }
};

export const signup = async (req: Request<{}, {}, SignupBody>, res: Response) => {
  try {
    console.log('Processing signup request');
    const { email, password, name } = req.body;

    try {
      signupSchema.parse({ email, password, name });
    } catch (error) {
      if (error instanceof z.ZodError) {
        console.log('Validation failed:', error.errors);
        return res.status(400).json({
          message: 'Validation failed',
          errors: error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message
          }))
        });
      }
    }

    // Check if email exists
    const existingUser = await queries.getUserByEmail(email);
    if (existingUser) {
      console.log('Email already exists:', email);
      return res.status(409).json({ message: 'Email already exists' });
    }

    console.log('Creating new user with email:', email);

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create user in database
    const user = await queries.createUser(
      email,
      hashedPassword,
      name
    );

    console.log('User created successfully:', user.id);

    // Generate tokens
    const [accessToken, refreshToken] = await Promise.all([
      generateAccessToken(user.id),
      generateRefreshToken(user.id)
    ]);

    // Store refresh token
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days from now
    await queries.createRefreshToken(user.id, refreshToken, expiresAt);

    console.log('Tokens generated and stored for user:', user.id);
    
    res.status(201).json({
      user: {
        id: user.id,
        email,
        name,
        createdAt: user.created_at
      },
      accessToken,
      refreshToken
    });
  } catch (error) {
    console.error('Signup error:', error);
    if (error instanceof Error) {
      res.status(500).json({ 
        message: 'Internal server error',
        error: error.message 
      });
    } else {
      res.status(500).json({ message: 'Internal server error' });
    }
  }
};

export const getCurrentUser = async (req: AuthRequest, res: Response) => {
  try {
    console.log('Processing get current user request');
    const authHeader = req.headers.authorization;
    
    if (!authHeader?.startsWith('Bearer ')) {
      console.log('Missing or invalid authorization header');
      return res.status(401).json({ message: 'Missing or invalid token' });
    }
    
    const token = authHeader.split(' ')[1];
    
    try {
      const secret = await getJwtSecret();
      const decoded = jwt.verify(token, secret) as { sub: string, type: string };

      // Verify token type
      if (decoded.type !== 'access') {
        console.log('Invalid token type for profile access');
        return res.status(401).json({ message: 'Invalid token type' });
      }
      
      // Get user from database
      const user = await queries.getUserById(decoded.sub);
      
      if (!user) {
        console.log('User not found:', decoded.sub);
        return res.status(404).json({ message: 'User not found' });
      }
      
      console.log(`Profile retrieved for user: ${decoded.sub}`);
      
      // Transform database user to UserProfile format
      const userProfile: UserProfile = {
        id: user.id,
        email: user.email,
        name: user.name,
        createdAt: user.created_at.toISOString(),
        emailVerified: user.email_verified,
        preferences: {
          theme: 'light', // Default preferences
          language: 'en',
          notifications: true
        }
      };
      
      res.json(userProfile);
    } catch (jwtError) {
      console.log('JWT verification failed:', jwtError);
      return res.status(401).json({ message: 'Invalid or expired token' });
    }
  } catch (error) {
    console.error('Get current user error:', error);
    if (error instanceof Error) {
      res.status(500).json({ 
        message: 'Internal server error',
        error: error.message 
      });
    } else {
      res.status(500).json({ message: 'Internal server error' });
    }
  }
};

export const verifyEmail = async (req: Request<{}, {}, VerifyEmailBody>, res: Response) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ message: 'Verification token is required' });
    }

    try {
      const secret = await getJwtSecret();
      // Verify and decode the token
      const decoded = jwt.verify(token, secret) as {
        userId: string;
        type: string;
        email: string;
      };

      // Validate token type
      if (decoded.type !== 'email_verification') {
        return res.status(400).json({ message: 'Invalid verification token' });
      }

      // TODO: Replace with actual database query
      const user = {
        id: decoded.userId,
        email: decoded.email,
        emailVerified: false
      };

      if (!user) {
        return res.status(400).json({ message: 'Invalid verification token' });
      }

      if (user.emailVerified) {
        return res.status(400).json({ message: 'Email already verified' });
      }

      try {
        // TODO: Database operations:
        // await db.user.update({
        //   where: { id: decoded.userId },
        //   data: { emailVerified: true }
        // });

        // Log verification
        console.log(`Email verified for user: ${decoded.userId}`);

        // Send confirmation email
        try {
          // await sendEmail({
          //   to: decoded.email,
          //   subject: 'Email Verification Successful',
          //   template: 'email-verified',
          //   context: {
          //     email: decoded.email,
          //     verifiedAt: new Date().toISOString()
          //   }
          // });
        } catch (emailError) {
          // Log but don't fail the request
          console.error('Failed to send verification confirmation email:', emailError);
        }

        res.json({
          message: 'Email verified successfully',
          email: decoded.email
        });
      } catch (dbError) {
        console.error('Database error during email verification:', dbError);
        throw new Error('Failed to verify email');
      }
    } catch (jwtError) {
      return res.status(401).json({ message: 'Invalid or expired verification token' });
    }
  } catch (error) {
    console.error('Email verification error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};