import { Request, Response, NextFunction } from 'express';
import { errorBuilders } from '../../../auth/errors/factory.js';
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
    
    const errorResponse = errorBuilders.validationError(req, details);
    return res.status(errorResponse.status).json(errorResponse);
  }
  
  if (err.name === 'UnauthorizedError' || err.message === 'jwt expired') {
    // Handle JWT authentication errors
    const errorResponse = errorBuilders.unauthorized(req, 'Authentication token is invalid or expired');
    return res.status(errorResponse.status).json(errorResponse);
  }
  
  if (err.statusCode === 404 || err.name === 'NotFoundError') {
    // Handle not found errors
    const errorResponse = errorBuilders.notFound(req, err.resource || 'Resource');
    return res.status(errorResponse.status).json(errorResponse);
  }
  
  if (err.statusCode === 403 || err.name === 'ForbiddenError') {
    // Handle forbidden errors
    const errorResponse = errorBuilders.forbidden(req);
    return res.status(errorResponse.status).json(errorResponse);
  }
  
  if (err.code === 'ACCOUNT_LOCKED') {
    // Handle account locked errors
    const errorResponse = errorBuilders.accountLocked(req, err.lockExpires);
    return res.status(errorResponse.status).json(errorResponse);
  }
  
  if (err.code === 'INVALID_LOGIN_METHOD') {
    // Handle invalid login method errors
    const errorResponse = errorBuilders.invalidLoginMethod(req);
    return res.status(errorResponse.status).json(errorResponse);
  }
  
  if (err.code === 'INVALID_TOKEN') {
    // Handle invalid token errors
    const errorResponse = errorBuilders.invalidToken(req, err.tokenType || 'token');
    return res.status(errorResponse.status).json(errorResponse);
  }
  
  // If the error already has a status and can be sent directly
  if (err.status && typeof err.toJSON === 'function') {
    return res.status(err.status).json(err.toJSON());
  }
  
  // Default to server error for unhandled errors
  const errorResponse = errorBuilders.serverError(req, err);
  return res.status(errorResponse.status).json(errorResponse);
} 