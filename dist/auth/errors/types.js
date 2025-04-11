/**
 * Auth error codes enum
 */
export var AuthErrorCode;
(function (AuthErrorCode) {
    AuthErrorCode["EMAIL_EXISTS"] = "EMAIL_EXISTS";
    AuthErrorCode["INVALID_CREDENTIALS"] = "INVALID_CREDENTIALS";
    AuthErrorCode["ACCOUNT_LOCKED"] = "ACCOUNT_LOCKED";
    AuthErrorCode["INVALID_TOKEN"] = "INVALID_TOKEN";
    AuthErrorCode["INVALID_LOGIN_METHOD"] = "INVALID_LOGIN_METHOD";
    AuthErrorCode["TOKEN_EXPIRED"] = "TOKEN_EXPIRED";
    AuthErrorCode["SESSION_EXPIRED"] = "SESSION_EXPIRED";
    AuthErrorCode["UNAUTHORIZED"] = "UNAUTHORIZED";
    AuthErrorCode["FORBIDDEN"] = "FORBIDDEN";
    AuthErrorCode["TOO_MANY_REQUESTS"] = "TOO_MANY_REQUESTS";
    AuthErrorCode["SERVER_ERROR"] = "SERVER_ERROR";
    AuthErrorCode["BAD_REQUEST"] = "BAD_REQUEST";
    AuthErrorCode["NOT_FOUND"] = "NOT_FOUND";
    AuthErrorCode["VALIDATION_ERROR"] = "VALIDATION_ERROR";
    AuthErrorCode["USER_NOT_FOUND"] = "USER_NOT_FOUND";
})(AuthErrorCode || (AuthErrorCode = {}));
/**
 * Custom error class for authentication errors
 */
export class AuthError extends Error {
    constructor(code, message, status = 400, details) {
        super(message);
        this.code = code;
        this.status = status;
        this.details = details;
        this.name = 'AuthError';
    }
    /**
     * Convert to standard error response format
     */
    toResponse(req) {
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
