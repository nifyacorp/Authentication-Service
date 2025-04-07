"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authRouter = void 0;
const express_1 = require("express");
const index_js_1 = require("../controllers/auth/index.js");
const jwt_js_1 = require("../utils/jwt.js");
exports.authRouter = (0, express_1.Router)();
// Special middleware for test account
const testAccountMiddleware = async (req, res, next) => {
    // Special case for test account
    if (req.body.email === 'nifyacorp@gmail.com' && req.body.password === 'nifyaCorp12!') {
        console.log('Test account login detected - providing direct access');
        // Generate tokens for test account
        const testUserId = '1';
        const [accessToken, refreshToken] = await Promise.all([
            (0, jwt_js_1.generateAccessToken)(testUserId, req.body.email, 'NIFYA Test User', true),
            (0, jwt_js_1.generateRefreshToken)(testUserId, req.body.email)
        ]);
        // Return success response for test account
        return res.json({
            accessToken,
            refreshToken,
            user: {
                id: testUserId,
                email: req.body.email,
                name: 'NIFYA Test User',
                email_verified: true
            }
        });
    }
    // Not test account, proceed to regular login
    next();
};
// User management
exports.authRouter.post('/login', testAccountMiddleware, index_js_1.login);
exports.authRouter.post('/signup', index_js_1.signup);
exports.authRouter.get('/me', index_js_1.getCurrentUser);
exports.authRouter.post('/verify-email', index_js_1.verifyEmail);
// Session management
exports.authRouter.post('/logout', index_js_1.logout);
exports.authRouter.post('/refresh', index_js_1.refreshToken);
exports.authRouter.post('/revoke-all-sessions', index_js_1.revokeAllSessions);
exports.authRouter.get('/session', index_js_1.getSession); // Add session endpoint for frontend
// Password management
exports.authRouter.post('/forgot-password', index_js_1.forgotPassword);
exports.authRouter.post('/reset-password', index_js_1.resetPassword);
exports.authRouter.post('/change-password', index_js_1.changePassword);
// OAuth routes
exports.authRouter.post('/google/login', index_js_1.getGoogleAuthUrl);
exports.authRouter.get('/google/callback', index_js_1.handleGoogleCallback);
//# sourceMappingURL=auth.js.map