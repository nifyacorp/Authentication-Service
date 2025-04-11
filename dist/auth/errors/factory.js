import { AuthError, AuthErrorCode } from './types.js';
import { ZodError } from 'zod';
/**
 * Get all available API endpoints with metadata
 */
export const getAllEndpoints = () => {
    return [
        { path: '/api/health', method: 'GET', description: 'Health check endpoint' },
        { path: '/api/auth/signup', method: 'POST', description: 'Register a new user account' },
        { path: '/api/auth/login', method: 'POST', description: 'Authenticate and get JWT tokens' },
        { path: '/api/auth/refresh', method: 'POST', description: 'Refresh expired JWT token' },
        { path: '/api/auth/logout', method: 'POST', description: 'Invalidate current session' },
        { path: '/api/auth/me', method: 'GET', description: 'Get current user profile' },
        { path: '/api/auth/change-password', method: 'POST', description: 'Change user password' },
        { path: '/api/auth/forgot-password', method: 'POST', description: 'Request password reset' },
        { path: '/api/auth/reset-password', method: 'POST', description: 'Reset password with token' },
        { path: '/api/auth/verify-email', method: 'POST', description: 'Verify email address' },
        { path: '/api/auth/google/login', method: 'POST', description: 'Login with Google OAuth' },
        { path: '/api/auth/google/callback', method: 'GET', description: 'Google OAuth callback' },
        { path: '/api/auth/revoke-all-sessions', method: 'POST', description: 'Revoke all user sessions' },
        { path: '/api/auth/session', method: 'GET', description: 'Get current session info' }
    ];
};
/**
 * Get metadata for a specific endpoint
 */
export const getEndpointMetadata = (path, method) => {
    const endpoints = getAllEndpoints();
    return endpoints.find(endpoint => endpoint.path === path && endpoint.method === method);
};
/**
 * Build API documentation links based on the endpoint
 */
const getApiDocsLink = (endpoint) => {
    // Strip any path parameters
    const basePath = endpoint.split('?')[0].replace(/\/:[^/]+/g, '/{id}');
    return `https://docs.nifya.app/api${basePath}`;
};
/**
 * Find related endpoints for a given path
 */
export const findRelatedEndpoints = (path) => {
    // Simple implementation - can be enhanced for better recommendations
    const authEndpoints = [
        {
            path: '/api/auth/login',
            methods: ['POST'],
            description: 'Authenticate and get JWT tokens'
        },
        {
            path: '/api/auth/signup',
            methods: ['POST'],
            description: 'Register a new user account'
        },
        {
            path: '/api/auth/logout',
            methods: ['POST'],
            description: 'Invalidate current session'
        },
        {
            path: '/api/auth/refresh',
            methods: ['POST'],
            description: 'Refresh expired JWT token'
        },
        {
            path: '/api/auth/me',
            methods: ['GET'],
            description: 'Get current user profile'
        }
    ];
    // Return endpoints excluding the current one
    return authEndpoints.filter(endpoint => endpoint.path !== path);
};
/**
 * Build help information based on the endpoint and error
 */
const buildHelpInfo = (req, code) => {
    const endpoint = req.path;
    const method = req.method;
    // Base help info
    const help = {
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
export const getEndpointDescription = (endpoint) => {
    const endpointMap = {
        '/api/auth/signup': 'Register a new user account',
        '/api/auth/login': 'Authenticate and get JWT tokens',
        '/api/auth/refresh': 'Refresh expired JWT token',
        '/api/auth/logout': 'Invalidate current session',
        '/api/auth/me': 'Get current user profile',
        '/api/auth/change-password': 'Change user password',
        '/api/auth/forgot-password': 'Request password reset',
        '/api/auth/reset-password': 'Reset password with token',
        '/api/auth/verify-email': 'Verify email address',
        '/api/auth/google/login': 'Login with Google OAuth',
        '/api/auth/google/callback': 'Google OAuth callback',
        '/api/auth/revoke-all-sessions': 'Revoke all user sessions',
        '/api/auth/session': 'Get current session info'
        // Add more as needed
    };
    return endpointMap[endpoint] || 'API endpoint';
};
/**
 * Error factory for creating standardized errors
 */
export const createError = (code, message, status = 400, details) => {
    return new AuthError(code, message, status, details);
};
/**
 * Format error response from any error type
 */
export const formatErrorResponse = (req, error) => {
    if (error instanceof AuthError) {
        return {
            ...error.toResponse(req),
            help: buildHelpInfo(req, error.code)
        };
    }
    if (error instanceof ZodError) {
        const authError = new AuthError(AuthErrorCode.VALIDATION_ERROR, 'Validation failed', 400, error.errors);
        return {
            ...authError.toResponse(req),
            help: buildHelpInfo(req, authError.code)
        };
    }
    // Generic error handling
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    const authError = new AuthError(AuthErrorCode.SERVER_ERROR, errorMessage, 500);
    return {
        ...authError.toResponse(req),
        help: buildHelpInfo(req, authError.code)
    };
};
/**
 * Predefined auth errors
 */
export const AUTH_ERRORS = {
    EMAIL_EXISTS: createError(AuthErrorCode.EMAIL_EXISTS, 'This email is already registered', 400),
    INVALID_CREDENTIALS: createError(AuthErrorCode.INVALID_CREDENTIALS, 'Invalid email or password', 401),
    ACCOUNT_LOCKED: (lockedUntil) => createError(AuthErrorCode.ACCOUNT_LOCKED, 'Account temporarily locked due to too many failed attempts', 401, { lockedUntil }),
    INVALID_TOKEN: createError(AuthErrorCode.INVALID_TOKEN, 'Invalid or expired token', 401),
    SESSION_EXPIRED: createError(AuthErrorCode.SESSION_EXPIRED, 'Your session has expired, please log in again', 401),
    UNAUTHORIZED: createError(AuthErrorCode.UNAUTHORIZED, 'Authentication required to access this resource', 401),
    FORBIDDEN: createError(AuthErrorCode.FORBIDDEN, 'You do not have permission to access this resource', 403),
    NOT_FOUND: (resource) => createError(AuthErrorCode.NOT_FOUND, `${resource} not found`, 404),
    SERVER_ERROR: (error) => createError(AuthErrorCode.SERVER_ERROR, 'An unexpected error occurred', 500, { originalError: error instanceof Error ? error.message : 'Unknown error' }),
    TOO_MANY_REQUESTS: (retryAfter) => createError(AuthErrorCode.TOO_MANY_REQUESTS, 'Too many requests, please try again later', 429, { retryAfter }),
    INVALID_LOGIN_METHOD: createError(AuthErrorCode.INVALID_LOGIN_METHOD, 'This account uses a different login method', 400),
    USER_NOT_FOUND: createError(AuthErrorCode.USER_NOT_FOUND, 'No user account exists with this email', 404)
};
/**
 * Error builders for external use
 */
export const errorBuilders = {
    badRequest: (req, message, details) => {
        const error = createError(AuthErrorCode.BAD_REQUEST, message, 400, details);
        return formatErrorResponse(req, error);
    },
    unauthorized: (req, message = 'Authentication required') => {
        const error = createError(AuthErrorCode.UNAUTHORIZED, message, 401);
        return formatErrorResponse(req, error);
    },
    forbidden: (req, message = 'Permission denied') => {
        const error = createError(AuthErrorCode.FORBIDDEN, message, 403);
        return formatErrorResponse(req, error);
    },
    notFound: (req, resource = 'Resource') => {
        const error = createError(AuthErrorCode.NOT_FOUND, `${resource} not found`, 404);
        return formatErrorResponse(req, error);
    },
    validationError: (req, details) => {
        const error = createError(AuthErrorCode.VALIDATION_ERROR, 'Validation failed', 400, details);
        return formatErrorResponse(req, error);
    },
    serverError: (req, originalError) => {
        const message = originalError instanceof Error ? originalError.message : 'Internal server error';
        const error = createError(AuthErrorCode.SERVER_ERROR, message, 500, { originalError });
        return formatErrorResponse(req, error);
    },
    tooManyRequests: (req, message, details) => {
        const error = createError(AuthErrorCode.TOO_MANY_REQUESTS, message, 429, details);
        return formatErrorResponse(req, error);
    },
    accountLocked: (req, lockedUntil) => {
        const error = createError(AuthErrorCode.ACCOUNT_LOCKED, 'Account temporarily locked due to too many failed attempts', 401, { lockedUntil });
        return formatErrorResponse(req, error);
    },
    invalidLoginMethod: (req) => {
        const error = createError(AuthErrorCode.INVALID_LOGIN_METHOD, 'This account uses a different login method', 400);
        return formatErrorResponse(req, error);
    },
    invalidToken: (req, tokenType = 'token') => {
        const error = createError(AuthErrorCode.INVALID_TOKEN, `Invalid or expired ${tokenType}`, 401);
        return formatErrorResponse(req, error);
    }
};
