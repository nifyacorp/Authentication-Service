import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../utils/jwt.js';
import { AUTH_ERRORS } from '../auth/errors/factory.js';
import { formatErrorResponse } from '../auth/errors/factory.js';
import { AuthRequest } from '../auth/models/types.js';

/**
 * Authentication middleware
 * Verifies the JWT token in the Authorization header and adds the user to the request object
 */
export const authenticate = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader?.startsWith('Bearer ')) {
      const errorResponse = formatErrorResponse(req, AUTH_ERRORS.UNAUTHORIZED);
      return res.status(errorResponse.status).json({ error: errorResponse });
    }

    const token = authHeader.split(' ')[1];
    const decoded = await verifyToken(token);

    if (!decoded) {
      const errorResponse = formatErrorResponse(req, AUTH_ERRORS.INVALID_TOKEN);
      return res.status(errorResponse.status).json({ error: errorResponse });
    }

    // Verify token type
    if (decoded.type !== 'access') {
      const errorResponse = formatErrorResponse(req, AUTH_ERRORS.INVALID_TOKEN);
      return res.status(errorResponse.status).json({ error: errorResponse });
    }

    // Add user to request
    const authReq = req as unknown as AuthRequest;
    authReq.user = {
      id: decoded.sub as string,
      email: decoded.email as string,
      email_verified: decoded.email_verified as boolean
    };

    next();
  } catch (error) {
    const errorResponse = formatErrorResponse(req, error);
    return res.status(errorResponse.status).json({ error: errorResponse });
  }
};

/**
 * Rate limiting middleware
 * Limits the number of requests from a single IP address
 */
export const rateLimit = (maxRequests: number, windowMinutes: number) => {
  // Simple in-memory rate limiting
  const requests: Record<string, { count: number; resetTime: number }> = {};
  
  return (req: Request, res: Response, next: NextFunction) => {
    // Get IP address
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const now = Date.now();
    
    // Initialize request tracking for this IP if not exists
    if (!requests[ip]) {
      requests[ip] = {
        count: 0,
        resetTime: now + windowMinutes * 60 * 1000
      };
    }
    
    // Reset if window expired
    if (now > requests[ip].resetTime) {
      requests[ip] = {
        count: 0,
        resetTime: now + windowMinutes * 60 * 1000
      };
    }
    
    // Increment request count
    requests[ip].count++;
    
    // Check if limit exceeded
    if (requests[ip].count > maxRequests) {
      const retryAfter = Math.ceil((requests[ip].resetTime - now) / 1000);
      
      // Set retry-after header
      res.set('Retry-After', String(retryAfter));
      
      const errorResponse = formatErrorResponse(
        req, 
        AUTH_ERRORS.TOO_MANY_REQUESTS(retryAfter)
      );
      
      return res.status(errorResponse.status).json({ error: errorResponse });
    }
    
    next();
  };
}; 