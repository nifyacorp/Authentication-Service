import { Request, Response, NextFunction } from 'express';
import { errorBuilders } from '../../../shared/errors/ErrorResponseBuilder.js';
import { ZodError } from 'zod';

/**
 * Global error handling middleware that transforms errors into self-documenting responses
 */
export function errorHandler(err: any, req: Request, res: Response, next: NextFunction) {
  // Log the error
  console.error('Request error:', err);
  
  // Handle different types of errors
  if (err instanceof ZodError) {
    // Handle Zod validation errors
    const details: Record<string, string> = {};
    err.errors.forEach(error => {
      const field = error.path.join('.');
      details[field] = error.message;
    });
    
    const { statusCode, body } = errorBuilders.validationError(req, details);
    return res.status(statusCode).json(body);
  }
  
  if (err.name === 'UnauthorizedError' || err.message === 'jwt expired') {
    // Handle JWT authentication errors
    const { statusCode, body } = errorBuilders.unauthorized(req, 'Authentication token is invalid or expired');
    return res.status(statusCode).json(body);
  }
  
  if (err.statusCode === 404 || err.name === 'NotFoundError') {
    // Handle not found errors
    const { statusCode, body } = errorBuilders.notFound(req, err.resource || 'Resource');
    return res.status(statusCode).json(body);
  }
  
  if (err.statusCode === 403 || err.name === 'ForbiddenError') {
    // Handle forbidden errors
    const { statusCode, body } = errorBuilders.forbidden(req);
    return res.status(statusCode).json(body);
  }
  
  if (err.code === 'ACCOUNT_LOCKED') {
    // Handle account locked errors
    const { statusCode, body } = errorBuilders.accountLocked(req, err.lockExpires);
    return res.status(statusCode).json(body);
  }
  
  if (err.code === 'INVALID_LOGIN_METHOD') {
    // Handle invalid login method errors
    const { statusCode, body } = errorBuilders.invalidLoginMethod(req);
    return res.status(statusCode).json(body);
  }
  
  if (err.code === 'INVALID_TOKEN') {
    // Handle invalid token errors
    const { statusCode, body } = errorBuilders.invalidToken(req, err.tokenType || 'token');
    return res.status(statusCode).json(body);
  }
  
  // If the error already has a statusCode and body from our error builders
  if (err.statusCode && err.body) {
    return res.status(err.statusCode).json(err.body);
  }
  
  // Default to server error for unhandled errors
  const { statusCode, body } = errorBuilders.serverError(req, err);
  return res.status(statusCode).json(body);
} 