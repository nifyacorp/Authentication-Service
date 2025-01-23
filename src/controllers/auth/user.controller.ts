import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { JWT_SECRET, MAX_LOGIN_ATTEMPTS, LOCK_TIME, RESET_TOKEN_EXPIRES_IN } from '../../config/jwt.js';
import { signupSchema, loginSchema } from '../../utils/validation.js';
import { generateAccessToken, generateRefreshToken } from '../../utils/jwt.js';
import { z } from 'zod';
import { AuthRequest, LoginBody, SignupBody, VerifyEmailBody, UserProfile } from './types.js';

export const login = async (req: Request<{}, {}, LoginBody>, res: Response) => {
  try {
    const { email, password } = req.body;

    try {
      loginSchema.parse({ email, password });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          message: 'Validation failed',
          errors: error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message
          }))
        });
      }
    }

    // TODO: Replace with actual database queries
    const user = {
      id: 'user-id',
      email: 'user@example.com',
      name: 'John Doe',
      password: await bcrypt.hash('Password123!', 10),
      loginAttempts: 0,
      lockUntil: null as number | null
    };

    if (user.lockUntil && user.lockUntil > Date.now()) {
      return res.status(401).json({
        message: 'Account is locked. Please try again later.',
        lockExpires: new Date(user.lockUntil).toISOString()
      });
    }

    const isValidPassword = await bcrypt.compare(password, user.password);

    if (!isValidPassword) {
      const loginAttempts = user.loginAttempts + 1;

      if (loginAttempts >= MAX_LOGIN_ATTEMPTS) {
        const lockUntil = Date.now() + LOCK_TIME;
        return res.status(401).json({
          message: 'Account locked due to too many failed attempts',
          lockExpires: new Date(lockUntil).toISOString()
        });
      }

      console.log(`Failed login attempt for email: ${email}`);

      return res.status(400).json({
        message: 'Invalid credentials',
        attemptsRemaining: MAX_LOGIN_ATTEMPTS - loginAttempts
      });
    }

    const accessToken = generateAccessToken(user.id);
    const refreshToken = generateRefreshToken(user.id);
    
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
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const signup = async (req: Request<{}, {}, SignupBody>, res: Response) => {
  try {
    const { email, password, name } = req.body;

    try {
      signupSchema.parse({ email, password, name });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          message: 'Validation failed',
          errors: error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message
          }))
        });
      }
    }

    // TODO: Check if email exists
    const emailExists = false;
    if (emailExists) {
      return res.status(409).json({ message: 'Email already exists' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const userId = 'generated-user-id';
    const createdAt = new Date().toISOString();

    const token = generateAccessToken(userId);

    try {
      // TODO: Implement welcome email
    } catch (error) {
      console.error('Failed to send welcome email:', error);
    }
    
    res.status(201).json({
      user: {
        id: userId,
        email,
        name,
        createdAt
      },
      token
    });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const getCurrentUser = async (req: AuthRequest, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Missing or invalid token' });
    }
    
    const token = authHeader.split(' ')[1];
    
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
      
      // TODO: Replace with actual database query
      const user: UserProfile = {
        id: decoded.userId,
        email: 'user@example.com',
        name: 'John Doe',
        createdAt: new Date().toISOString(),
        emailVerified: true,
        preferences: {
          theme: 'light',
          language: 'en',
          notifications: true
        }
      };
      
      console.log(`Profile retrieved for user: ${user.id}`);
      
      res.json(user);
    } catch (jwtError) {
      return res.status(401).json({ message: 'Invalid or expired token' });
    }
  } catch (error) {
    console.error('Get current user error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const verifyEmail = async (req: Request<{}, {}, VerifyEmailBody>, res: Response) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ message: 'Verification token is required' });
    }

    try {
      // Verify and decode the token
      const decoded = jwt.verify(token, JWT_SECRET) as {
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