import { Request, Response, NextFunction } from 'express';
import { AppError } from '../../core/errors/AppError';
import { createErrorResponse } from '../../core/interfaces/ApiResponse';

/**
 * Global error handling middleware
 */
export const errorHandler = (
  error: Error | AppError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  console.error(`Error [${req.method} ${req.path}]:`, error);

  // Return structured error for AppError instances
  if (error instanceof AppError) {
    return res.status(error.statusCode).json(
      createErrorResponse(
        error.code,
        error.message,
        error.details
      )
    );
  }

  // Handle other types of errors
  return res.status(500).json(
    createErrorResponse(
      'server/internal-error',
      'Internal server error',
      process.env.NODE_ENV === 'development' ? { 
        stack: error.stack,
        message: error.message 
      } : undefined
    )
  );
};