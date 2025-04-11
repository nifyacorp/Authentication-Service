import { Request } from 'express';

/**
 * Standard error response format
 */
export interface ErrorResponse {
  code: string;        // Machine-readable error code
  message: string;     // User-friendly message
  details?: unknown;   // Optional additional information
  status: number;      // HTTP status code
  request_id?: string; // Unique identifier for request tracking
  timestamp: string;   // ISO timestamp when error occurred
  help?: {
    endpoint_info?: {
      description?: string;
      auth_required: boolean;
      method: string;
    };
    related_endpoints?: Array<{
      path: string;
      methods: string[];
      description: string;
    }>;
    documentation_url?: string;
    required_parameters?: Array<{
      name: string;
      type: string;
      description: string;
    }>;
  };
}

/**
 * Auth error codes enum
 */
export enum AuthErrorCode {
  EMAIL_EXISTS = 'EMAIL_EXISTS',
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
  ACCOUNT_LOCKED = 'ACCOUNT_LOCKED',
  INVALID_TOKEN = 'INVALID_TOKEN',
  INVALID_LOGIN_METHOD = 'INVALID_LOGIN_METHOD',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  SESSION_EXPIRED = 'SESSION_EXPIRED',
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  TOO_MANY_REQUESTS = 'TOO_MANY_REQUESTS',
  SERVER_ERROR = 'SERVER_ERROR',
  BAD_REQUEST = 'BAD_REQUEST',
  NOT_FOUND = 'NOT_FOUND',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  USER_NOT_FOUND = 'USER_NOT_FOUND'
}

/**
 * Custom error class for authentication errors
 */
export class AuthError extends Error {
  code: string;
  status: number;
  details?: unknown;
  
  constructor(code: string, message: string, status = 400, details?: unknown) {
    super(message);
    this.code = code;
    this.status = status;
    this.details = details;
    this.name = 'AuthError';
  }

  /**
   * Convert to standard error response format
   */
  toResponse(req: Request): ErrorResponse {
    return {
      code: this.code,
      message: this.message,
      status: this.status,
      details: this.details,
      request_id: req.headers['x-request-id']?.toString() || crypto.randomUUID(),
      timestamp: new Date().toISOString()
    };
  }
} 