"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = errorHandler;
const ErrorResponseBuilder_js_1 = require("../../../shared/errors/ErrorResponseBuilder.js");
const zod_1 = require("zod");
/**
 * Global error handling middleware that transforms errors into self-documenting responses
 */
function errorHandler(err, req, res, next) {
    // Log the error
    console.error('Request error:', err);
    // Handle different types of errors
    if (err instanceof zod_1.ZodError) {
        // Handle Zod validation errors
        const details = {};
        err.errors.forEach(error => {
            const field = error.path.join('.');
            details[field] = error.message;
        });
        const { statusCode, body } = ErrorResponseBuilder_js_1.errorBuilders.validationError(req, details);
        return res.status(statusCode).json(body);
    }
    if (err.name === 'UnauthorizedError' || err.message === 'jwt expired') {
        // Handle JWT authentication errors
        const { statusCode, body } = ErrorResponseBuilder_js_1.errorBuilders.unauthorized(req, 'Authentication token is invalid or expired');
        return res.status(statusCode).json(body);
    }
    if (err.statusCode === 404 || err.name === 'NotFoundError') {
        // Handle not found errors
        const { statusCode, body } = ErrorResponseBuilder_js_1.errorBuilders.notFound(req, err.resource || 'Resource');
        return res.status(statusCode).json(body);
    }
    if (err.statusCode === 403 || err.name === 'ForbiddenError') {
        // Handle forbidden errors
        const { statusCode, body } = ErrorResponseBuilder_js_1.errorBuilders.forbidden(req);
        return res.status(statusCode).json(body);
    }
    if (err.code === 'ACCOUNT_LOCKED') {
        // Handle account locked errors
        const { statusCode, body } = ErrorResponseBuilder_js_1.errorBuilders.accountLocked(req, err.lockExpires);
        return res.status(statusCode).json(body);
    }
    if (err.code === 'INVALID_LOGIN_METHOD') {
        // Handle invalid login method errors
        const { statusCode, body } = ErrorResponseBuilder_js_1.errorBuilders.invalidLoginMethod(req);
        return res.status(statusCode).json(body);
    }
    if (err.code === 'INVALID_TOKEN') {
        // Handle invalid token errors
        const { statusCode, body } = ErrorResponseBuilder_js_1.errorBuilders.invalidToken(req, err.tokenType || 'token');
        return res.status(statusCode).json(body);
    }
    // If the error already has a statusCode and body from our error builders
    if (err.statusCode && err.body) {
        return res.status(err.statusCode).json(err.body);
    }
    // Default to server error for unhandled errors
    const { statusCode, body } = ErrorResponseBuilder_js_1.errorBuilders.serverError(req, err);
    return res.status(statusCode).json(body);
}
//# sourceMappingURL=errorHandler.js.map