import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { schemas } from './schemas.js';
import { formatErrorResponse } from '../errors/factory.js';
import { AuthErrorCode, AuthError } from '../errors/types.js';

/**
 * Generic validation middleware factory
 * 
 * @param schema Zod schema to validate against
 * @returns Express middleware function
 */
export const validate = (schema: z.ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      // Validate request body against schema
      schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        const authError = new AuthError(
          AuthErrorCode.VALIDATION_ERROR,
          'Validation failed',
          400,
          error.errors
        );
        
        // Format and send the error response
        const errorResponse = formatErrorResponse(req, authError);
        return res.status(errorResponse.status).json({ error: errorResponse });
      }
      
      // For other types of errors, pass to the next error handler
      next(error);
    }
  };
};

/**
 * Pre-configured validation middlewares for common endpoints
 */
export const validateSignup = validate(schemas.signup);
export const validateLogin = validate(schemas.login);
export const validateForgotPassword = validate(schemas.forgotPassword);
export const validateResetPassword = validate(schemas.resetPassword);
export const validateChangePassword = validate(schemas.changePassword);
export const validateVerifyEmail = validate(schemas.verifyEmail);
export const validateRefreshToken = validate(schemas.refreshToken);
export const validateLogout = validate(schemas.logout); 