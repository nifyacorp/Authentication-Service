import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { getJwtSecret, MAX_LOGIN_ATTEMPTS, LOCK_TIME } from '../../config/jwt.js';
import { signupSchema, loginSchema } from '../../utils/validation.js';
import { generateAccessToken, generateRefreshToken } from '../../utils/jwt.js';
import { z } from 'zod';
import { AuthRequest, LoginBody, SignupBody, VerifyEmailBody, UserProfile } from './types.js';
import { queries } from '../../models/index.js';
import { errorBuilders } from '../../interfaces/http/middleware/errorHandler.js';

export const login = async (req: Request<{}, {}, LoginBody>, res: Response, next: NextFunction) => {
  try {
    console.log('Processing login request');
    const { email, password } = req.body;

    try {
      loginSchema.parse({ email, password });
    } catch (error) {
      if (error instanceof z.ZodError) {
        console.log('Login validation failed:', error.errors);
        // Use the error builder for validation errors
        return next(error);
      }
    }

    // Get user from database
    const user = await queries.getUserByEmail(email);
    
    if (!user) {
      console.log('Login attempt with non-existent email:', email);
      const { statusCode, body } = errorBuilders.unauthorized(req, 'Invalid credentials');
      return res.status(statusCode).json(body);
    }

    // Check if account is locked
    if (user.locked_until && new Date(user.locked_until) > new Date()) {
      console.log(`Account locked for user ${user.id} until ${user.locked_until}`);
      const { statusCode, body } = errorBuilders.accountLocked(req, user.locked_until.toISOString());
      return res.status(statusCode).json(body);
    }

    // Verify password
    if (!user.password_hash) {
      console.log(`User ${user.id} has no password (OAuth account)`);
      const { statusCode, body } = errorBuilders.invalidLoginMethod(req);
      return res.status(statusCode).json(body);
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
        const { statusCode, body } = errorBuilders.accountLocked(req, lockUntil.toISOString());
        return res.status(statusCode).json(body);
      }

      console.log(`Failed login attempt for email: ${email}`);

      const { statusCode, body } = errorBuilders.badRequest(req, 'Invalid credentials', {
        attemptsRemaining: MAX_LOGIN_ATTEMPTS - loginAttempts
      });
      return res.status(statusCode).json(body);
    }

    // Reset login attempts on successful login
    if (user.login_attempts > 0) {
      await queries.updateLoginAttempts(user.id, 0, undefined);
    }

    const [accessToken, refreshToken] = await Promise.all([
      generateAccessToken(user.id, user.email, user.name, user.email_verified),
      generateRefreshToken(user.id, user.email)
    ]);
    
    // Store refresh token
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days from now
    await queries.createRefreshToken(user.id, refreshToken, expiresAt);
    
    console.log(`Successful login for user: ${user.id}`);
    
    res.json({
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        email_verified: user.email_verified
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    next(error);
  }
};

export const signup = async (req: Request<{}, {}, SignupBody>, res: Response, next: NextFunction) => {
  try {
    console.log('Processing signup request');
    const { email, password, name } = req.body;

    try {
      signupSchema.parse({ email, password, name });
    } catch (error) {
      if (error instanceof z.ZodError) {
        console.log('Validation failed:', error.errors);
        return next(error);
      }
    }

    // Check if email exists
    const existingUser = await queries.getUserByEmail(email);
    if (existingUser) {
      console.log('Email already exists:', email);
      const { statusCode, body } = errorBuilders.badRequest(req, 'Email already exists');
      return res.status(statusCode).json(body);
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

    // Return success response
    res.status(201).json({
      message: 'User created successfully',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        email_verified: user.email_verified
      }
    });
  } catch (error) {
    console.error('Signup error:', error);
    next(error);
  }
};

export const getCurrentUser = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    console.log('Processing get current user request');
    const authHeader = req.headers.authorization;
    
    if (!authHeader?.startsWith('Bearer ')) {
      console.log('Missing or invalid authorization header');
      return next(errorBuilders.unauthorized(req, 'Missing or invalid token'));
    }
    
    const token = authHeader.split(' ')[1];
    
    try {
      const secret = await getJwtSecret();
      const decoded = jwt.verify(token, secret) as { sub: string, email: string, type: string };

      // Verify token type
      if (decoded.type !== 'access') {
        console.log('Invalid token type for profile access');
        return next(errorBuilders.unauthorized(req, 'Invalid token type'));
      }
      
      // Get user from database
      const user = await queries.getUserById(decoded.sub);
      
      if (!user) {
        console.log('User not found:', decoded.sub);
        return next(errorBuilders.notFound(req, 'User not found'));
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
      return next(errorBuilders.unauthorized(req, 'Invalid or expired token'));
    }
  } catch (error) {
    console.error('Get current user error:', error);
    return next(errorBuilders.serverError(req, 'Internal server error'));
  }
};

export const verifyEmail = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { token } = req.body;

    if (!token) {
      return next(errorBuilders.badRequest(req, 'Verification token is required'));
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'default_secret') as {
        userId: string;
        type: string;
        email: string;
      };

      // Validate token type
      if (decoded.type !== 'email_verification') {
        return next(errorBuilders.badRequest(req, 'Invalid verification token'));
      }

      // TODO: Replace with actual database query
      const user = {
        id: decoded.userId,
        email: decoded.email,
        emailVerified: false
      };

      if (!user) {
        return next(errorBuilders.badRequest(req, 'Invalid verification token'));
      }

      if (user.emailVerified) {
        return next(errorBuilders.badRequest(req, 'Email already verified'));
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
        return next(errorBuilders.serverError(req, 'Failed to verify email'));
      }
    } catch (jwtError) {
      return next(errorBuilders.unauthorized(req, 'Invalid or expired verification token'));
    }
  } catch (error) {
    console.error('Email verification error:', error);
    return next(errorBuilders.serverError(req, 'Internal server error'));
  }
};