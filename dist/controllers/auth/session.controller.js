"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSession = exports.revokeAllSessions = exports.refreshToken = exports.logout = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const jwt_js_1 = require("../../config/jwt.js");
const jwt_js_2 = require("../../utils/jwt.js");
const index_js_1 = require("../../models/index.js");
const ErrorResponseBuilder_js_1 = require("../../shared/errors/ErrorResponseBuilder.js");
const logout = async (req, res, next) => {
    try {
        console.log('Processing logout request');
        // Get refresh token from request body
        const { refreshToken } = req.body;
        if (!refreshToken) {
            console.log('Missing refresh token');
            return next(ErrorResponseBuilder_js_1.errorBuilders.badRequest(req, 'Refresh token is required'));
        }
        try {
            const secret = await (0, jwt_js_1.getJwtSecret)();
            // Verify the refresh token
            try {
                const decoded = jsonwebtoken_1.default.verify(refreshToken, secret);
                // Verify token type
                if (decoded.type !== 'refresh') {
                    console.log('Invalid token type for logout');
                    return next(ErrorResponseBuilder_js_1.errorBuilders.badRequest(req, 'Invalid token type'));
                }
                // Check if the refresh token exists in the database
                const storedToken = await index_js_1.queries.getRefreshToken(refreshToken);
                if (!storedToken) {
                    console.log('Refresh token not found or already revoked');
                    // If token is already revoked, still return success for idempotence
                    return res.status(200).json({
                        message: 'Logged out successfully',
                        timestamp: new Date().toISOString()
                    });
                }
                // Revoke the specific refresh token
                await index_js_1.queries.revokeRefreshToken(refreshToken);
                console.log(`User ${decoded.sub} logged out successfully`);
                res.status(200).json({
                    message: 'Logged out successfully',
                    timestamp: new Date().toISOString()
                });
            }
            catch (jwtError) {
                console.log('JWT verification failed:', jwtError);
                // Even if token is invalid, return success for security reasons
                return res.status(200).json({
                    message: 'Logged out successfully',
                    timestamp: new Date().toISOString()
                });
            }
        }
        catch (error) {
            console.error('Logout error:', error);
            return next(ErrorResponseBuilder_js_1.errorBuilders.serverError(req, error instanceof Error ? error : new Error('Internal server error')));
        }
    }
    catch (error) {
        console.error('Logout error:', error);
        return next(ErrorResponseBuilder_js_1.errorBuilders.serverError(req, error instanceof Error ? error : new Error('Internal server error')));
    }
};
exports.logout = logout;
const refreshToken = async (req, res, next) => {
    try {
        console.log('Processing refresh token request');
        const { refreshToken } = req.body;
        if (!refreshToken) {
            console.log('Missing refresh token');
            return next(ErrorResponseBuilder_js_1.errorBuilders.badRequest(req, 'Refresh token is required'));
        }
        // Basic token format validation
        if (typeof refreshToken !== 'string' || !refreshToken.match(/^[A-Za-z0-9-_=]+\.[A-Za-z0-9-_=]+\.[A-Za-z0-9-_.+/=]*$/)) {
            console.log('Invalid refresh token format');
            return next(ErrorResponseBuilder_js_1.errorBuilders.badRequest(req, 'Invalid refresh token format'));
        }
        try {
            const secret = await (0, jwt_js_1.getJwtSecret)();
            // Verify the refresh token's JWT format and type
            const decoded = jsonwebtoken_1.default.verify(refreshToken, secret);
            if (decoded.type !== 'refresh') {
                console.log('Invalid token type for refresh');
                return next(ErrorResponseBuilder_js_1.errorBuilders.badRequest(req, 'Invalid token type, expected refresh token'));
            }
            // Check if the refresh token exists and is valid in the database
            const storedToken = await index_js_1.queries.getRefreshToken(refreshToken);
            if (!storedToken) {
                console.log('Refresh token not found or revoked');
                return next(ErrorResponseBuilder_js_1.errorBuilders.unauthorized(req, 'Invalid or expired refresh token'));
            }
            // Check if the token has expired
            if (new Date() > new Date(storedToken.expires_at)) {
                console.log('Refresh token has expired');
                await index_js_1.queries.revokeRefreshToken(refreshToken);
                return next(ErrorResponseBuilder_js_1.errorBuilders.unauthorized(req, 'Refresh token has expired'));
            }
            // Get the user
            const user = await index_js_1.queries.getUserById(decoded.sub);
            if (!user) {
                console.log('User not found for refresh token:', decoded.sub);
                await index_js_1.queries.revokeRefreshToken(refreshToken);
                return next(ErrorResponseBuilder_js_1.errorBuilders.unauthorized(req, 'User not found'));
            }
            // Generate new tokens with required claims
            const [newAccessToken, newRefreshToken] = await Promise.all([
                (0, jwt_js_2.generateAccessToken)(user.id, user.email, user.name, user.email_verified),
                (0, jwt_js_2.generateRefreshToken)(user.id, user.email)
            ]);
            // Revoke the old refresh token
            await index_js_1.queries.revokeRefreshToken(refreshToken);
            // Store the new refresh token
            const expiresAt = new Date();
            expiresAt.setDate(expiresAt.getDate() + 7); // 7 days from now
            await index_js_1.queries.createRefreshToken(user.id, newRefreshToken, expiresAt);
            console.log(`Tokens refreshed successfully for user: ${user.id}`);
            res.json({
                accessToken: newAccessToken,
                refreshToken: newRefreshToken,
                expiresIn: 900, // 15 minutes in seconds, to help clients know when to refresh
                user: {
                    id: user.id,
                    email: user.email,
                    name: user.name,
                    email_verified: user.email_verified
                }
            });
        }
        catch (jwtError) {
            console.log('JWT verification failed:', jwtError);
            return next(ErrorResponseBuilder_js_1.errorBuilders.unauthorized(req, 'Invalid refresh token'));
        }
    }
    catch (error) {
        console.error('Refresh token error:', error);
        return next(ErrorResponseBuilder_js_1.errorBuilders.serverError(req, error instanceof Error ? error : new Error('Internal server error')));
    }
};
exports.refreshToken = refreshToken;
const revokeAllSessions = async (req, res, next) => {
    try {
        console.log('Processing revoke all sessions request');
        const authHeader = req.headers.authorization;
        if (!authHeader?.startsWith('Bearer ')) {
            console.log('Missing or invalid authorization header');
            return next(ErrorResponseBuilder_js_1.errorBuilders.unauthorized(req, 'Missing or invalid token'));
        }
        const token = authHeader.split(' ')[1];
        try {
            const secret = await (0, jwt_js_1.getJwtSecret)();
            // Verify and decode the access token
            const decoded = jsonwebtoken_1.default.verify(token, secret);
            // Verify token type
            if (decoded.type !== 'access') {
                console.log('Invalid token type for session revocation');
                return next(ErrorResponseBuilder_js_1.errorBuilders.unauthorized(req, 'Invalid token type'));
            }
            // Verify user exists
            const user = await index_js_1.queries.getUserById(decoded.sub);
            if (!user) {
                console.log('User not found:', decoded.sub);
                return next(ErrorResponseBuilder_js_1.errorBuilders.notFound(req, 'User'));
            }
            // Revoke all refresh tokens for the user
            await index_js_1.queries.revokeAllUserRefreshTokens(decoded.sub);
            console.log(`All sessions revoked for user: ${decoded.sub}`);
            res.json({
                message: 'All sessions have been revoked successfully',
                timestamp: new Date().toISOString()
            });
        }
        catch (jwtError) {
            console.log('JWT verification failed:', jwtError);
            return next(ErrorResponseBuilder_js_1.errorBuilders.unauthorized(req, 'Invalid or expired token'));
        }
    }
    catch (error) {
        console.error('Revoke all sessions error:', error);
        return next(ErrorResponseBuilder_js_1.errorBuilders.serverError(req, error instanceof Error ? error : new Error('Internal server error')));
    }
};
exports.revokeAllSessions = revokeAllSessions;
/**
 * Get current session information
 * This endpoint is used by the frontend to validate the user's session
 */
const getSession = async (req, res, next) => {
    try {
        console.log('Processing get session request');
        const authHeader = req.headers.authorization;
        // If no token provided, return empty session (not authenticated)
        if (!authHeader?.startsWith('Bearer ')) {
            console.log('No authorization header, returning empty session');
            return res.json({
                authenticated: false,
                user: null,
                session: null
            });
        }
        const token = authHeader.split(' ')[1];
        try {
            const secret = await (0, jwt_js_1.getJwtSecret)();
            // Verify and decode the access token
            const decoded = jsonwebtoken_1.default.verify(token, secret);
            // Verify token type
            if (decoded.type !== 'access') {
                console.log('Invalid token type for session check');
                return res.json({
                    authenticated: false,
                    user: null,
                    session: null,
                    error: 'Invalid token type'
                });
            }
            // Get user data
            const user = await index_js_1.queries.getUserById(decoded.sub);
            if (!user) {
                console.log('User not found for token:', decoded.sub);
                return res.json({
                    authenticated: false,
                    user: null,
                    session: null,
                    error: 'User not found'
                });
            }
            console.log(`Session validated for user: ${decoded.sub}`);
            // Return session information
            res.json({
                authenticated: true,
                user: {
                    id: user.id,
                    email: user.email,
                    name: user.name,
                    email_verified: user.email_verified
                },
                session: {
                    issuedAt: new Date(decoded.iat * 1000).toISOString(),
                    expiresAt: new Date(decoded.exp * 1000).toISOString(),
                    remainingTime: Math.max(0, decoded.exp - Math.floor(Date.now() / 1000))
                }
            });
        }
        catch (jwtError) {
            console.log('JWT verification failed:', jwtError);
            return res.json({
                authenticated: false,
                user: null,
                session: null,
                error: 'Invalid or expired token'
            });
        }
    }
    catch (error) {
        console.error('Get session error:', error);
        return res.json({
            authenticated: false,
            user: null,
            session: null,
            error: 'Server error'
        });
    }
};
exports.getSession = getSession;
//# sourceMappingURL=session.controller.js.map