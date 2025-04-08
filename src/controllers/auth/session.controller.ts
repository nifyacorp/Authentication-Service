import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { getJwtSecret } from '../../config/jwt.js';
import { generateAccessToken, generateRefreshToken } from '../../utils/jwt.js';
import { queries } from '../../models/index.js';
import { AuthRequest, RefreshTokenBody } from './types.js';
import { errorBuilders } from '../../shared/errors/ErrorResponseBuilder.js';

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
    
    const { refreshToken } = req.body;
    
    console.log('Refresh token provided:', !!refreshToken);
    
    if (!refreshToken) {
      console.log('Missing refresh token');
      console.groupEnd();
      return next(errorBuilders.badRequest(req, 'Refresh token is required'));
    }
    
    // Basic token format validation
    const isValidFormat = typeof refreshToken === 'string' && !!refreshToken.match(/^[A-Za-z0-9-_=]+\.[A-Za-z0-9-_=]+\.[A-Za-z0-9-_.+/=]*$/);
    console.log('Token format validation:', isValidFormat ? 'Valid JWT format' : 'Invalid format');
    
    if (!isValidFormat) {
      console.log('Invalid refresh token format:', refreshToken.substring(0, 10) + '...');
      console.groupEnd();
      return next(errorBuilders.badRequest(req, 'Invalid refresh token format'));
    }
    
    try {
      const secret = await getJwtSecret();
      console.log('JWT secret retrieved successfully');
      
      // Verify the refresh token's JWT format and type
      console.log('Attempting to verify token...');
      const decoded = jwt.verify(refreshToken, secret) as { sub: string, type: string, email: string };
      console.log('Token verified successfully');
      console.log('Token claims:', {
        userId: decoded.sub,
        tokenType: decoded.type,
        email: decoded.email
      });
      
      if (decoded.type !== 'refresh') {
        console.log('Invalid token type for refresh:', decoded.type);
        console.groupEnd();
        return next(errorBuilders.badRequest(req, 'Invalid token type, expected refresh token'));
      }
      
      // Check if the refresh token exists and is valid in the database
      console.log('Checking token in database...');
      const storedToken = await queries.getRefreshToken(refreshToken);
      console.log('Token found in database:', !!storedToken);
      
      if (!storedToken) {
        console.log('Refresh token not found or revoked');
        console.groupEnd();
        return next(errorBuilders.unauthorized(req, 'Invalid or expired refresh token'));
      }
      
      // Check if the token has expired
      const now = new Date();
      const expiry = new Date(storedToken.expires_at);
      const isExpired = now > expiry;
      console.log('Token expiration check:', {
        now: now.toISOString(),
        expiry: expiry.toISOString(),
        isExpired,
        timeLeft: isExpired ? 'Expired' : `${Math.floor((expiry.getTime() - now.getTime()) / 1000)} seconds`
      });
      
      if (isExpired) {
        console.log('Refresh token has expired');
        await queries.revokeRefreshToken(refreshToken);
        console.log('Expired token revoked in database');
        console.groupEnd();
        return next(errorBuilders.unauthorized(req, 'Refresh token has expired'));
      }
      
      // Get the user
      console.log('Looking up user:', decoded.sub);
      const user = await queries.getUserById(decoded.sub);
      console.log('User found:', !!user);
      
      if (!user) {
        console.log('User not found for refresh token:', decoded.sub);
        await queries.revokeRefreshToken(refreshToken);
        console.log('Token revoked due to missing user');
        console.groupEnd();
        return next(errorBuilders.unauthorized(req, 'User not found'));
      }
      
      // Generate new tokens with required claims
      console.log('Generating new tokens for user:', user.id);
      const [newAccessToken, newRefreshToken] = await Promise.all([
        generateAccessToken(user.id, user.email, user.name, user.email_verified),
        generateRefreshToken(user.id, user.email)
      ]);
      console.log('New tokens generated successfully');
      
      // Revoke the old refresh token
      console.log('Revoking old refresh token');
      await queries.revokeRefreshToken(refreshToken);
      
      // Store the new refresh token
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7); // 7 days from now
      console.log('Storing new refresh token with expiry:', expiresAt.toISOString());
      await queries.createRefreshToken(user.id, newRefreshToken, expiresAt);
      
      console.log(`Tokens refreshed successfully for user: ${user.id}`);
      console.groupEnd();
      
      res.json({
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
        expiresIn: 900, // 15 minutes in seconds, to help clients know when to refresh
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          email_verified: user.email_verified
        }
      });
    } catch (jwtError) {
      console.log('JWT verification failed:', jwtError);
      console.log('Error type:', jwtError instanceof Error ? jwtError.constructor.name : typeof jwtError);
      console.log('Error message:', jwtError instanceof Error ? jwtError.message : String(jwtError));
      console.groupEnd();
      return next(errorBuilders.unauthorized(req, 'Invalid refresh token'));
    }
    
  } catch (error) {
    console.error('Refresh token error:', error);
    console.log('Error type:', error instanceof Error ? error.constructor.name : typeof error);
    console.log('Error message:', error instanceof Error ? error.message : String(error));
    console.groupEnd();
    return next(errorBuilders.serverError(req, error instanceof Error ? error : new Error('Internal server error')));
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
        name?: string,
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
          name: user.name,
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