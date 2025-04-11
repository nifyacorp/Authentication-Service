import { Request } from 'express';
import { AuthError, AuthErrorCode, ErrorResponse } from './types.js';
import { ZodError } from 'zod';

/**
 * Build API documentation links based on the endpoint
 */
const getApiDocsLink = (endpoint: string): string => {
  // Strip any path parameters
  const basePath = endpoint.split('?')[0].replace(/\/:[^/]+/g, '/{id}');
  return `https://docs.nifya.app/api${basePath}`;
};

/**
 * Build help information based on the endpoint and error
 */
const buildHelpInfo = (req: Request, code: string): ErrorResponse['help'] => {
  const endpoint = req.path;
  const method = req.method;
  
  // Base help info
  const help: ErrorResponse['help'] = {
    endpoint_info: {
      method,
      auth_required: endpoint.includes('/auth/') && !endpoint.includes('/login') && !endpoint.includes('/signup'),
      description: getEndpointDescription(endpoint)
    },
    documentation_url: getApiDocsLink(endpoint)
  };

  // Add related endpoints based on the error
  switch (code) {
    case AuthErrorCode.UNAUTHORIZED:
      help.related_endpoints = [
        {
          path: '/api/auth/login',
          methods: ['POST'],
          description: 'Authenticate and get JWT tokens'
        },
        {
          path: '/api/auth/refresh',
          methods: ['POST'],
          description: 'Refresh expired JWT token'
        }
      ];
      break;
    case AuthErrorCode.EMAIL_EXISTS:
      help.related_endpoints = [
        {
          path: '/api/auth/login',
          methods: ['POST'],
          description: 'Login with existing account'
        },
        {
          path: '/api/auth/forgot-password',
          methods: ['POST'],
          description: 'Reset password for existing account'
        }
      ];
      break;
    case AuthErrorCode.USER_NOT_FOUND:
      help.related_endpoints = [
        {
          path: '/api/auth/signup',
          methods: ['POST'],
          description: 'Create a new account'
        }
      ];
      break;
    // Add more cases as needed
  }

  return help;
};

/**
 * Get a user-friendly description of an endpoint
 */
const getEndpointDescription = (endpoint: string): string => {
  const endpointMap: Record<string, string> = {
    '/api/auth/signup': 'Register a new user account',
    '/api/auth/login': 'Authenticate and get JWT tokens',
    '/api/auth/refresh': 'Refresh expired JWT token',
    '/api/auth/logout': 'Invalidate current session',
    '/api/auth/me': 'Get current user profile'
    // Add more as needed
  };

  return endpointMap[endpoint] || 'API endpoint';
};

/**
 * Error factory for creating standardized errors
 */
export const createError = (
  code: string, 
  message: string, 
  status = 400, 
  details?: unknown
): AuthError => {
  return new AuthError(code, message, status, details);
};

/**
 * Format error response from any error type
 */
export const formatErrorResponse = (req: Request, error: unknown): ErrorResponse => {
  if (error instanceof AuthError) {
    return {
      ...error.toResponse(req),
      help: buildHelpInfo(req, error.code)
    };
  }
  
  if (error instanceof ZodError) {
    const authError = new AuthError(
      AuthErrorCode.VALIDATION_ERROR,
      'Validation failed',
      400,
      error.errors
    );
    
    return {
      ...authError.toResponse(req),
      help: buildHelpInfo(req, authError.code)
    };
  }
  
  // Generic error handling
  const errorMessage = error instanceof Error ? error.message : 'Internal server error';
  const authError = new AuthError(
    AuthErrorCode.SERVER_ERROR,
    errorMessage,
    500
  );
  
  return {
    ...authError.toResponse(req),
    help: buildHelpInfo(req, authError.code)
  };
};

/**
 * Predefined auth errors
 */
export const AUTH_ERRORS = {
  EMAIL_EXISTS: createError(
    AuthErrorCode.EMAIL_EXISTS, 
    'This email is already registered', 
    400
  ),
  
  INVALID_CREDENTIALS: createError(
    AuthErrorCode.INVALID_CREDENTIALS, 
    'Invalid email or password', 
    401
  ),
  
  ACCOUNT_LOCKED: (lockedUntil: string) => createError(
    AuthErrorCode.ACCOUNT_LOCKED, 
    'Account temporarily locked due to too many failed attempts', 
    401,
    { lockedUntil }
  ),
  
  INVALID_TOKEN: createError(
    AuthErrorCode.INVALID_TOKEN, 
    'Invalid or expired token', 
    401
  ),
  
  SESSION_EXPIRED: createError(
    AuthErrorCode.SESSION_EXPIRED, 
    'Your session has expired, please log in again', 
    401
  ),
  
  UNAUTHORIZED: createError(
    AuthErrorCode.UNAUTHORIZED, 
    'Authentication required to access this resource', 
    401
  ),
  
  FORBIDDEN: createError(
    AuthErrorCode.FORBIDDEN, 
    'You do not have permission to access this resource', 
    403
  ),
  
  NOT_FOUND: (resource: string) => createError(
    AuthErrorCode.NOT_FOUND, 
    `${resource} not found`, 
    404
  ),
  
  SERVER_ERROR: (error: unknown) => createError(
    AuthErrorCode.SERVER_ERROR, 
    'An unexpected error occurred', 
    500,
    { originalError: error instanceof Error ? error.message : 'Unknown error' }
  ),
  
  TOO_MANY_REQUESTS: (retryAfter: number) => createError(
    AuthErrorCode.TOO_MANY_REQUESTS, 
    'Too many requests, please try again later', 
    429,
    { retryAfter }
  ),
  
  INVALID_LOGIN_METHOD: createError(
    AuthErrorCode.INVALID_LOGIN_METHOD, 
    'This account uses a different login method', 
    400
  ),
  
  USER_NOT_FOUND: createError(
    AuthErrorCode.USER_NOT_FOUND,
    'No user account exists with this email', 
    404
  )
}; 