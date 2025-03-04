import { Request } from 'express';
import { getEndpointMetadata, findRelatedEndpoints } from '../utils/apiMetadata.js';

interface ErrorResponseOptions {
  code?: string;
  message?: string;
  statusCode?: number;
  details?: any;
  error?: Error | null;
}

/**
 * Build a standardized error response that includes self-documenting information
 */
export function buildErrorResponse(req: Request, options: ErrorResponseOptions) {
  const {
    code = 'UNKNOWN_ERROR',
    message = 'An error occurred while processing your request.',
    statusCode = 500,
    details = null,
    error = null
  } = options;
  
  // Basic error structure
  const errorResponse: any = {
    error: {
      code,
      message,
      request_id: req.headers['x-request-id'] || 'unknown',
      timestamp: new Date().toISOString()
    }
  };
  
  // Add validation details if provided
  if (details) {
    errorResponse.error.details = details;
  }
  
  // Add the original error stack in development
  if (process.env.NODE_ENV === 'development' && error) {
    errorResponse.error.stack = error.stack;
  }
  
  // Add self-documenting help information
  const path = req.path;
  const method = req.method;
  
  // Get endpoint metadata
  const endpointMetadata = getEndpointMetadata(path, method);
  
  if (endpointMetadata) {
    // If we have metadata for this endpoint, include it
    errorResponse.error.help = {
      endpoint_info: {
        description: endpointMetadata.description,
        auth_required: endpointMetadata.auth_required,
        method: endpointMetadata.method
      },
      related_endpoints: findRelatedEndpoints(path),
      documentation_url: `https://docs.nifya.app/api/auth/${path.split('/').slice(3).join('/')}`
    };
    
    // Add required parameters if available
    if (endpointMetadata.body_parameters) {
      errorResponse.error.help.required_parameters = endpointMetadata.body_parameters
        .filter(param => param.required)
        .map(param => ({
          name: param.name,
          type: param.type,
          description: param.description
        }));
    }
  } else {
    // If we don't have specific metadata, provide general API info
    errorResponse.error.help = {
      message: "We couldn't find specific documentation for this endpoint. Here are some available endpoints:",
      available_endpoints: findRelatedEndpoints(path).slice(0, 5),
      documentation_url: "https://docs.nifya.app/api/auth"
    };
  }
  
  return {
    statusCode,
    body: errorResponse
  };
}

// Common error builders
export const errorBuilders = {
  badRequest: (req: Request, message: string, details: any = null) => buildErrorResponse(req, {
    code: 'BAD_REQUEST',
    message,
    statusCode: 400,
    details
  }),
  
  notFound: (req: Request, resource: string = 'Resource') => buildErrorResponse(req, {
    code: 'NOT_FOUND',
    message: `${resource} not found.`,
    statusCode: 404
  }),
  
  unauthorized: (req: Request, message: string = 'Authentication required to access this resource.') => buildErrorResponse(req, {
    code: 'UNAUTHORIZED',
    message,
    statusCode: 401
  }),
  
  forbidden: (req: Request, message: string = 'You do not have permission to access this resource.') => buildErrorResponse(req, {
    code: 'FORBIDDEN',
    message,
    statusCode: 403
  }),
  
  validationError: (req: Request, details: any) => buildErrorResponse(req, {
    code: 'VALIDATION_ERROR',
    message: 'The request contains invalid parameters.',
    statusCode: 400,
    details
  }),
  
  serverError: (req: Request, error: Error) => buildErrorResponse(req, {
    code: 'SERVER_ERROR',
    message: 'An internal server error occurred.',
    statusCode: 500,
    error
  }),

  accountLocked: (req: Request, lockExpires: string) => buildErrorResponse(req, {
    code: 'ACCOUNT_LOCKED',
    message: 'Account is locked due to too many failed attempts.',
    statusCode: 401,
    details: { lockExpires }
  }),

  invalidLoginMethod: (req: Request) => buildErrorResponse(req, {
    code: 'INVALID_LOGIN_METHOD',
    message: 'Invalid login method for this account.',
    statusCode: 401
  }),

  invalidToken: (req: Request, tokenType: string = 'token') => buildErrorResponse(req, {
    code: 'INVALID_TOKEN',
    message: `Invalid or expired ${tokenType}.`,
    statusCode: 400
  })
}; 