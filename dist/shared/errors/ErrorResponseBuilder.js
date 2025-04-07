import { getEndpointMetadata, findRelatedEndpoints } from '../utils/apiMetadata.js';
/**
 * Build a standardized error response that includes self-documenting information
 */
export function buildErrorResponse(req, options) {
    const { code = 'UNKNOWN_ERROR', message = 'An error occurred while processing your request.', statusCode = 500, details = null, error = null } = options;
    // Basic error structure
    const errorResponse = {
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
                .filter((param) => param.required)
                .map((param) => ({
                name: param.name,
                type: param.type,
                description: param.description
            }));
        }
    }
    else {
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
    badRequest: (req, message, details = null) => buildErrorResponse(req, {
        code: 'BAD_REQUEST',
        message,
        statusCode: 400,
        details
    }),
    notFound: (req, resource = 'Resource') => buildErrorResponse(req, {
        code: 'NOT_FOUND',
        message: `${resource} not found.`,
        statusCode: 404
    }),
    unauthorized: (req, message = 'Authentication required to access this resource.') => buildErrorResponse(req, {
        code: 'UNAUTHORIZED',
        message,
        statusCode: 401
    }),
    forbidden: (req, message = 'You do not have permission to access this resource.') => buildErrorResponse(req, {
        code: 'FORBIDDEN',
        message,
        statusCode: 403
    }),
    validationError: (req, details) => buildErrorResponse(req, {
        code: 'VALIDATION_ERROR',
        message: 'The request contains invalid parameters.',
        statusCode: 400,
        details
    }),
    serverError: (req, error) => buildErrorResponse(req, {
        code: 'SERVER_ERROR',
        message: 'An internal server error occurred.',
        statusCode: 500,
        error
    }),
    accountLocked: (req, lockExpires) => buildErrorResponse(req, {
        code: 'ACCOUNT_LOCKED',
        message: 'Account is locked due to too many failed attempts.',
        statusCode: 401,
        details: { lockExpires }
    }),
    invalidLoginMethod: (req) => buildErrorResponse(req, {
        code: 'INVALID_LOGIN_METHOD',
        message: 'Invalid login method for this account.',
        statusCode: 401
    }),
    invalidToken: (req, tokenType = 'token') => buildErrorResponse(req, {
        code: 'INVALID_TOKEN',
        message: `Invalid or expired ${tokenType}.`,
        statusCode: 400
    }),
    tooManyRequests: (req, message = 'Too many requests.', details = null) => buildErrorResponse(req, {
        code: 'TOO_MANY_REQUESTS',
        message,
        statusCode: 429,
        details
    })
};
