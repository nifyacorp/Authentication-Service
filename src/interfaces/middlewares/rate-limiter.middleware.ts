import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import { createRateLimitExceededError } from '../../core/errors/AppError';

/**
 * Create a rate limiter with specific configuration
 * @param windowMs Time window in milliseconds
 * @param max Maximum number of requests in the time window
 * @param message Error message to show when rate limit is exceeded
 */
export const createRateLimiter = (
  windowMs: number = 15 * 60 * 1000, // 15 minutes by default
  max: number = 100, // 100 requests per window by default
  message: string = 'Too many requests, please try again later.'
) => {
  return rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (_req: Request, _res: Response, next: NextFunction) => {
      next(createRateLimitExceededError(message));
    },
    keyGenerator: (req: Request) => {
      // Use IP address as key or fallback to a default
      return req.ip || req.headers['x-forwarded-for'] as string || 'unknown';
    }
  });
};

/**
 * Strict rate limiter for authentication endpoints
 */
export const authRateLimiter = createRateLimiter(
  15 * 60 * 1000, // 15 minutes
  10, // 10 requests per 15 minutes
  'Too many login attempts, please try again after 15 minutes.'
);

/**
 * Standard rate limiter for general API endpoints
 */
export const standardRateLimiter = createRateLimiter(
  60 * 1000, // 1 minute
  60, // 60 requests per minute
  'Rate limit exceeded, please try again after a minute.'
);