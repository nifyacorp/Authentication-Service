/**
 * Standard error codes for the application
 */
export enum ErrorCode {
  // Authentication errors
  INVALID_CREDENTIALS = 'auth/invalid-credentials',
  ACCOUNT_LOCKED = 'auth/account-locked',
  TOKEN_EXPIRED = 'auth/token-expired',
  TOKEN_INVALID = 'auth/token-invalid',
  TOKEN_REVOKED = 'auth/token-revoked',
  UNAUTHORIZED = 'auth/unauthorized',
  EMAIL_NOT_VERIFIED = 'auth/email-not-verified',
  
  // User errors
  USER_NOT_FOUND = 'user/not-found',
  USER_ALREADY_EXISTS = 'user/already-exists',
  EMAIL_ALREADY_VERIFIED = 'user/email-already-verified',
  
  // Validation errors
  VALIDATION_ERROR = 'validation/invalid-data',
  
  // Resource errors
  RESOURCE_NOT_FOUND = 'resource/not-found',
  RESOURCE_ALREADY_EXISTS = 'resource/already-exists',
  
  // Server errors
  INTERNAL_ERROR = 'server/internal-error',
  DATABASE_ERROR = 'server/database-error',
  
  // Request errors
  BAD_REQUEST = 'request/bad-request',
  RATE_LIMIT_EXCEEDED = 'request/rate-limit-exceeded',
  
  // Email errors
  EMAIL_SENDING_FAILED = 'email/sending-failed',
  
  // OAuth errors
  OAUTH_ERROR = 'oauth/error',
  OAUTH_TOKEN_ERROR = 'oauth/token-error',
  OAUTH_USER_INFO_ERROR = 'oauth/user-info-error'
}

/**
 * Application error class
 */
export class AppError extends Error {
  public readonly code: ErrorCode;
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly details?: any;

  constructor(
    message: string,
    code: ErrorCode = ErrorCode.INTERNAL_ERROR,
    statusCode: number = 500,
    isOperational: boolean = true,
    details?: any
  ) {
    super(message);
    this.code = code;
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.details = details;
    
    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
    
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

// Factory methods for common errors
export const createUnauthorizedError = (message = 'Unauthorized', details?: any) => 
  new AppError(message, ErrorCode.UNAUTHORIZED, 401, true, details);

export const createValidationError = (message = 'Validation error', details?: any) => 
  new AppError(message, ErrorCode.VALIDATION_ERROR, 400, true, details);

export const createResourceNotFoundError = (message = 'Resource not found', details?: any) => 
  new AppError(message, ErrorCode.RESOURCE_NOT_FOUND, 404, true, details);

export const createInternalError = (message = 'Internal server error', details?: any) => 
  new AppError(message, ErrorCode.INTERNAL_ERROR, 500, true, details);

export const createUserNotFoundError = (message = 'User not found', details?: any) => 
  new AppError(message, ErrorCode.USER_NOT_FOUND, 404, true, details);

export const createUserAlreadyExistsError = (message = 'User already exists', details?: any) => 
  new AppError(message, ErrorCode.USER_ALREADY_EXISTS, 409, true, details);

export const createTokenExpiredError = (message = 'Token expired', details?: any) => 
  new AppError(message, ErrorCode.TOKEN_EXPIRED, 401, true, details);

export const createTokenInvalidError = (message = 'Token invalid', details?: any) => 
  new AppError(message, ErrorCode.TOKEN_INVALID, 401, true, details);

export const createInvalidCredentialsError = (message = 'Invalid credentials', details?: any) => 
  new AppError(message, ErrorCode.INVALID_CREDENTIALS, 401, true, details);

export const createAccountLockedError = (message = 'Account locked', details?: any) => 
  new AppError(message, ErrorCode.ACCOUNT_LOCKED, 403, true, details);

export const createEmailNotVerifiedError = (message = 'Email not verified', details?: any) => 
  new AppError(message, ErrorCode.EMAIL_NOT_VERIFIED, 403, true, details);

export const createRateLimitExceededError = (message = 'Rate limit exceeded', details?: any) => 
  new AppError(message, ErrorCode.RATE_LIMIT_EXCEEDED, 429, true, details);