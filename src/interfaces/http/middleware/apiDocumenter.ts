import { Request, Response, NextFunction } from 'express';
import { getEndpointMetadata } from '../../../shared/utils/apiMetadata.js';
import { errorBuilders } from '../../../shared/errors/ErrorResponseBuilder.js';

/**
 * Middleware to validate requests against API metadata and provide self-documenting errors
 */
export function apiDocumenter(req: Request, res: Response, next: NextFunction) {
  // Get metadata for this endpoint
  const path = req.path;
  const method = req.method;
  const metadata = getEndpointMetadata(path, method);
  
  // If no metadata found, continue without validation
  if (!metadata) {
    return next();
  }
  
  // Validate required path parameters
  if (metadata.path_parameters) {
    const errors: Record<string, string> = {};
    
    metadata.path_parameters.forEach((param: any) => {
      const paramValue = req.params[param.name];
      
      if (param.required && (paramValue === undefined || paramValue === null)) {
        errors[param.name] = `Missing required path parameter: ${param.name}`;
      } else if (paramValue !== undefined && param.type === 'uuid') {
        // Validate UUID format
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(paramValue)) {
          errors[param.name] = `Invalid UUID format for parameter: ${param.name}`;
        }
      }
    });
    
    if (Object.keys(errors).length > 0) {
      const { statusCode, body } = errorBuilders.validationError(req, errors);
      return res.status(statusCode).json(body);
    }
  }
  
  // Validate required query parameters
  if (metadata.query_parameters) {
    const errors: Record<string, string> = {};
    
    metadata.query_parameters.forEach((param: any) => {
      if (param.required && req.query[param.name] === undefined) {
        errors[param.name] = `Missing required query parameter: ${param.name}`;
      }
    });
    
    if (Object.keys(errors).length > 0) {
      const { statusCode, body } = errorBuilders.validationError(req, errors);
      return res.status(statusCode).json(body);
    }
  }
  
  // Validate required body parameters for POST/PUT/PATCH
  if (['POST', 'PUT', 'PATCH'].includes(method) && metadata.body_parameters) {
    const errors: Record<string, string> = {};
    
    metadata.body_parameters.forEach((param: any) => {
      if (param.required && (req.body === undefined || req.body[param.name] === undefined)) {
        errors[param.name] = `Missing required body parameter: ${param.name}`;
      }
    });
    
    if (Object.keys(errors).length > 0) {
      const { statusCode, body } = errorBuilders.validationError(req, errors);
      return res.status(statusCode).json(body);
    }
  }
  
  // If all validations pass, continue
  next();
} 