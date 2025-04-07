"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.changePassword = exports.resetPassword = exports.forgotPassword = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const validation_js_1 = require("../../utils/validation.js");
const jwt_js_1 = require("../../config/jwt.js");
const ErrorResponseBuilder_js_1 = require("../../shared/errors/ErrorResponseBuilder.js");
const forgotPassword = async (req, res, next) => {
    try {
        const { email } = req.body;
        if (!email || !email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
            return next(ErrorResponseBuilder_js_1.errorBuilders.badRequest(req, 'Invalid email address'));
        }
        // TODO: Replace with actual database query
        const user = {
            id: 'user-id',
            email: 'user@example.com',
            passwordResetAttempts: []
        };
        if (!user) {
            // Even if the user doesn't exist, we return a success message for security
            return res.status(200).json({
                message: 'If your email is registered, you will receive password reset instructions'
            });
        }
        const now = Date.now();
        const recentAttempts = user.passwordResetAttempts.filter(timestamp => now - timestamp < jwt_js_1.PASSWORD_RESET_WINDOW);
        if (recentAttempts.length >= jwt_js_1.MAX_PASSWORD_RESET_REQUESTS) {
            return next(ErrorResponseBuilder_js_1.errorBuilders.tooManyRequests(req, 'Too many reset attempts. Please try again later.', {
                retryAfter: new Date(recentAttempts[0] + jwt_js_1.PASSWORD_RESET_WINDOW).toISOString()
            }));
        }
        const secret = await (0, jwt_js_1.getJwtSecret)();
        const resetToken = jsonwebtoken_1.default.sign({
            userId: user.id,
            type: 'password_reset'
        }, secret, { expiresIn: jwt_js_1.RESET_TOKEN_EXPIRES_IN });
        try {
            // TODO: Implement email sending
            console.log(`Password reset email sent to: ${email}`);
        }
        catch (emailError) {
            console.error('Failed to send password reset email:', emailError);
            return next(ErrorResponseBuilder_js_1.errorBuilders.serverError(req, emailError instanceof Error ? emailError : new Error('Failed to send reset email')));
        }
        res.status(200).json({
            message: 'If your email is registered, you will receive password reset instructions'
        });
    }
    catch (error) {
        console.error('Forgot password error:', error);
        return next(ErrorResponseBuilder_js_1.errorBuilders.serverError(req, error instanceof Error ? error : new Error('Internal server error')));
    }
};
exports.forgotPassword = forgotPassword;
const resetPassword = async (req, res, next) => {
    try {
        const { token, newPassword } = req.body;
        // TODO: Implementation will be added later
        res.status(200).json({ message: 'Password reset successfully' });
    }
    catch (error) {
        return next(ErrorResponseBuilder_js_1.errorBuilders.serverError(req, error instanceof Error ? error : new Error('Internal server error')));
    }
};
exports.resetPassword = resetPassword;
const changePassword = async (req, res, next) => {
    try {
        const { currentPassword, newPassword } = req.body;
        const authHeader = req.headers.authorization;
        const secret = await (0, jwt_js_1.getJwtSecret)();
        if (!authHeader?.startsWith('Bearer ')) {
            return next(ErrorResponseBuilder_js_1.errorBuilders.unauthorized(req, 'Missing or invalid token'));
        }
        const token = authHeader.split(' ')[1];
        let userId;
        try {
            const decoded = jsonwebtoken_1.default.verify(token, secret);
            userId = decoded.userId;
        }
        catch (jwtError) {
            return next(ErrorResponseBuilder_js_1.errorBuilders.unauthorized(req, 'Invalid or expired token'));
        }
        // Validate new password format
        try {
            validation_js_1.signupSchema.shape.password.parse(newPassword);
        }
        catch (error) {
            return next(ErrorResponseBuilder_js_1.errorBuilders.badRequest(req, 'Invalid password format', {
                details: 'Password must be at least 8 characters, contain uppercase, number, and special character'
            }));
        }
        // TODO: Replace with actual database query
        const user = {
            id: userId,
            email: 'user@example.com',
            password: await bcryptjs_1.default.hash('CurrentPass123!', 10)
        };
        // Verify current password
        const isValidPassword = await bcryptjs_1.default.compare(currentPassword, user.password);
        if (!isValidPassword) {
            return next(ErrorResponseBuilder_js_1.errorBuilders.unauthorized(req, 'Current password is incorrect'));
        }
        // Hash new password
        const salt = await bcryptjs_1.default.genSalt(10);
        const hashedPassword = await bcryptjs_1.default.hash(newPassword, salt);
        try {
            // TODO: Database operations:
            // 1. Update user's password
            // await db.user.update({ 
            //   where: { id: userId },
            //   data: { password: hashedPassword }
            // });
            // 2. Invalidate all refresh tokens
            // await db.refreshToken.deleteMany({
            //   where: { userId }
            // });
            // 3. Log security event
            console.log(`Password changed successfully for user: ${userId}`);
            // 4. Send confirmation email
            try {
                // await sendEmail({
                //   to: user.email,
                //   subject: 'Password Changed Successfully',
                //   template: 'password-changed',
                //   context: {
                //     name: user.name,
                //     timestamp: new Date().toISOString()
                //   }
                // });
            }
            catch (emailError) {
                // Log but don't fail the request
                console.error('Failed to send password change confirmation email:', emailError);
            }
            res.json({
                message: 'Password changed successfully',
                requireRelogin: true
            });
        }
        catch (dbError) {
            console.error('Database error during password change:', dbError);
            return next(ErrorResponseBuilder_js_1.errorBuilders.serverError(req, dbError instanceof Error ? dbError : new Error('Failed to update password')));
        }
    }
    catch (error) {
        console.error('Change password error:', error);
        return next(ErrorResponseBuilder_js_1.errorBuilders.serverError(req, error instanceof Error ? error : new Error('Internal server error')));
    }
};
exports.changePassword = changePassword;
//# sourceMappingURL=password.controller.js.map