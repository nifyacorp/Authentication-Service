import { Request, Response, NextFunction } from 'express';
import { AuthenticationService } from '../../core/services/AuthenticationService';
import { createUnauthorizedError } from '../../core/errors/AppError';

/**
 * Middleware to verify JWT tokens and authenticate users
 */
export function authenticate(authService: AuthenticationService) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Get the token from the Authorization header
      const authHeader = req.headers.authorization;
      
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        throw createUnauthorizedError('Missing or invalid authorization header');
      }
      
      // Extract the token
      const token = authHeader.split(' ')[1];
      
      if (!token) {
        throw createUnauthorizedError('Missing token');
      }
      
      // Verify the token
      const payload = await authService.verifyAccessToken(token);
      
      // Add user info to request
      req.user = {
        id: payload.sub,
        email: payload.email
      };
      
      next();
    } catch (error) {
      next(error);
    }
  };
}

// Augment the Express Request interface with user property
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
      };
    }
  }
}