import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { getJwtSecret } from '../../config/jwt.js';
import { generateAccessToken, generateRefreshToken } from '../../utils/jwt.js';
import { queries } from '../models/index.js';
import { AuthRequest, RefreshTokenBody } from '../models/types.js';
import { formatErrorResponse, errorBuilders } from '../errors/factory.js';

export const logout = async (req: AuthRequest<any, any, RefreshTokenBody>, res: Response, next: NextFunction) => {
  try {
    console.log('Processing logout request');
    
    // Get refresh token from request body
    const { refreshToken } = req.body;
    
    if (!refreshToken) {
      console.log('Missing refresh token');
      return next(errorBuilders.badRequest(req, 'Refresh token is required'));
    }
    
    try {
      const secret = await getJwtSecret();
      
      // Verify the refresh token
      try {
        const decoded = jwt.verify(refreshToken, secret) as { sub: string, type: string };
        
        // Verify token type
        if (decoded.type !== 'refresh') {
          console.log('Invalid token type for logout');
          return next(errorBuilders.badRequest(req, 'Invalid token type'));
        }
        
        // Check if the refresh token exists in the database
        const storedToken = await queries.getRefreshToken(refreshToken);
        
        if (!storedToken) {
          console.log('Refresh token not found or already revoked');
          // If token is already revoked, still return success for idempotence
          return res.status(200).json({ 
            message: 'Logged out successfully',
            timestamp: new Date().toISOString()
          });
        }
        
        // Revoke the specific refresh token
        await queries.revokeRefreshToken(refreshToken);
        
        console.log(`User ${decoded.sub} logged out successfully`);
        
        res.status(200).json({ 
          message: 'Logged out successfully',
          timestamp: new Date().toISOString()
        });
      } catch (jwtError) {
        console.log('JWT verification failed:', jwtError);
        // Even if token is invalid, return success for security reasons
        return res.status(200).json({ 
          message: 'Logged out successfully',
          timestamp: new Date().toISOString()
        });
      }
    } catch (error) {
      console.error('Logout error:', error);
      return next(errorBuilders.serverError(req, error instanceof Error ? error : new Error('Internal server error')));
    }
  } catch (error) {
    console.error('Logout error:', error);
    return next(errorBuilders.serverError(req, error instanceof Error ? error : new Error('Internal server error')));
  }
};

export const refreshToken = async (req: AuthRequest<any, any, RefreshTokenBody>, res: Response, next: NextFunction) => {
  try {
    console.group('📝 Auth Service - Processing refresh token request');
    console.log('Request IP:', req.ip);
    
    // Get refresh token from request body
    const { refreshToken } = req.body;
    
    if (!refreshToken) {
      console.log('Missing refresh token');
      console.groupEnd();
      return next(errorBuilders.badRequest(req, 'Refresh token is required'));
    }
    
    try {
      const secret = await getJwtSecret();
      
      // Verify the refresh token
      const decoded = jwt.verify(refreshToken, secret) as { sub: string, type: string };
      
      // Verify token type
      if (decoded.type !== 'refresh') {
        console.log('Invalid token type for refresh');
        console.groupEnd();
        return next(errorBuilders.badRequest(req, 'Invalid token type'));
      }
      
      // Check if the refresh token exists in the database
      const storedToken = await queries.getRefreshToken(refreshToken);
      
      if (!storedToken) {
        console.log('Refresh token not found or revoked');
        console.groupEnd();
        return next(errorBuilders.unauthorized(req, 'Invalid or expired refresh token'));
      }
      
      // Get user data
      const userId = decoded.sub;
      const user = await queries.getUserById(userId);
      
      if (!user) {
        console.log('User not found for token:', userId);
        console.groupEnd();
        return next(errorBuilders.notFound(req, 'User'));
      }
      
      // Generate new access token
      console.log('Generating new access token for user:', userId);
      const accessToken = await generateAccessToken(user.id, user.email, user.email_verified);
      
      console.log('Token refresh successful for user:', userId);
      console.groupEnd();
      
      res.json({
        accessToken,
        refreshToken, // Return the same refresh token
        user: {
          id: user.id,
          email: user.email,
          email_verified: user.email_verified
        }
      });
    } catch (jwtError) {
      console.log('JWT verification failed:', jwtError);
      console.groupEnd();
      return next(errorBuilders.unauthorized(req, 'Invalid or expired refresh token'));
    }
  } catch (error) {
    console.error('Unhandled error in refreshToken endpoint:', error);
    console.groupEnd();
    // Ensure the error passed to the builder is an Error instance
    const errorInstance = error instanceof Error ? error : new Error('Internal server error processing refresh token');
    return next(errorBuilders.serverError(req, errorInstance));
  }
};

export const revokeAllSessions = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    console.log('Processing revoke all sessions request');
    const authHeader = req.headers.authorization;
    
    if (!authHeader?.startsWith('Bearer ')) {
      console.log('Missing or invalid authorization header');
      return next(errorBuilders.unauthorized(req, 'Missing or invalid token'));
    }
    
    const token = authHeader.split(' ')[1];
    
    try {
      const secret = await getJwtSecret();
      // Verify and decode the access token
      const decoded = jwt.verify(token, secret) as { sub: string, type: string };
      
      // Verify token type
      if (decoded.type !== 'access') {
        console.log('Invalid token type for session revocation');
        return next(errorBuilders.unauthorized(req, 'Invalid token type'));
      }
      
      // Verify user exists
      const user = await queries.getUserById(decoded.sub);
      if (!user) {
        console.log('User not found:', decoded.sub);
        return next(errorBuilders.notFound(req, 'User'));
      }
      
      // Revoke all refresh tokens for the user
      await queries.revokeAllUserRefreshTokens(decoded.sub);
      
      console.log(`All sessions revoked for user: ${decoded.sub}`);
      
      res.json({ 
        message: 'All sessions have been revoked successfully',
        timestamp: new Date().toISOString()
      });
    } catch (jwtError) {
      console.log('JWT verification failed:', jwtError);
      return next(errorBuilders.unauthorized(req, 'Invalid or expired token'));
    }
  } catch (error) {
    console.error('Revoke all sessions error:', error);
    return next(errorBuilders.serverError(req, error instanceof Error ? error : new Error('Internal server error')));
  }
};

/**
 * Get current session information
 * This endpoint is used by the frontend to validate the user's session
 */
export const getSession = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    console.log('Processing get session request');
    const authHeader = req.headers.authorization;
    
    // If no token provided, return empty session (not authenticated)
    if (!authHeader?.startsWith('Bearer ')) {
      console.log('No authorization header, returning empty session');
      return res.json({ 
        authenticated: false,
        user: null,
        session: null 
      });
    }
    
    const token = authHeader.split(' ')[1];
    
    try {
      const secret = await getJwtSecret();
      // Verify and decode the access token
      const decoded = jwt.verify(token, secret) as { 
        sub: string, 
        type: string, 
        email: string, 
        email_verified?: boolean,
        iat: number,
        exp: number
      };
      
      // Verify token type
      if (decoded.type !== 'access') {
        console.log('Invalid token type for session check');
        return res.json({ 
          authenticated: false,
          user: null,
          session: null,
          error: 'Invalid token type'
        });
      }
      
      // Get user data
      const user = await queries.getUserById(decoded.sub);
      
      if (!user) {
        console.log('User not found for token:', decoded.sub);
        return res.json({ 
          authenticated: false,
          user: null,
          session: null,
          error: 'User not found'
        });
      }
      
      console.log(`Session validated for user: ${decoded.sub}`);
      
      // Return session information
      res.json({
        authenticated: true,
        user: {
          id: user.id,
          email: user.email,
          email_verified: user.email_verified
        },
        session: {
          issuedAt: new Date(decoded.iat * 1000).toISOString(),
          expiresAt: new Date(decoded.exp * 1000).toISOString(),
          remainingTime: Math.max(0, decoded.exp - Math.floor(Date.now() / 1000))
        }
      });
    } catch (jwtError) {
      console.log('JWT verification failed:', jwtError);
      return res.json({ 
        authenticated: false,
        user: null,
        session: null,
        error: 'Invalid or expired token'
      });
    }
  } catch (error) {
    console.error('Get session error:', error);
    return res.json({ 
      authenticated: false,
      user: null,
      session: null,
      error: 'Server error'
    });
  }
}; 