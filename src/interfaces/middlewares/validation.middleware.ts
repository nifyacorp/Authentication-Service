import { Request, Response, NextFunction } from 'express';
import { AnyZodObject, ZodError } from 'zod';
import { createValidationError } from '../../core/errors/AppError';

/**
 * Middleware for validating request data against Zod schemas
 * @param schema The Zod schema to validate against
 * @param source Where to look for data to validate (body, query, params)
 */
export const validate = (schema: AnyZodObject, source: 'body' | 'query' | 'params' = 'body') => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = source === 'body' ? req.body : source === 'query' ? req.query : req.params;
      schema.parse(data);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        // Format Zod errors for better readability
        const validationErrors = error.errors.map(err => ({
          path: err.path.join('.'),
          message: err.message
        }));
        
        next(createValidationError('Validation error', validationErrors));
      } else {
        next(error);
      }
    }
  };
};