import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';

/**
 * Middleware for logging requests and adding request ID
 */
export const requestLogger = (req: Request, res: Response, next: NextFunction) => {
  // Generate a request ID if not already present
  req.id = req.headers['x-request-id'] as string || uuidv4();
  
  // Set request ID header on response
  res.setHeader('X-Request-ID', req.id);
  
  // Log the request
  console.log(`[${req.id}] ${req.method} ${req.originalUrl}`);
  
  // Capture request start time
  const start = Date.now();
  
  // Listen for response finish event to log the response
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`[${req.id}] ${req.method} ${req.originalUrl} ${res.statusCode} ${duration}ms`);
  });
  
  next();
};

// Augment the Express Request interface with id property
declare global {
  namespace Express {
    interface Request {
      id?: string;
    }
  }
}