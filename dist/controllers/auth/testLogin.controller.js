"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.testLogin = void 0;
const jwt_js_1 = require("../../utils/jwt.js");
const testLogin = async (req, res, next) => {
    try {
        console.log('Checking for test account login');
        const { email, password } = req.body;
        // Special case for test account
        if (email === 'nifyacorp@gmail.com' && password === 'nifyaCorp12!') {
            console.log('Test account login detected - providing direct access');
            // Generate tokens for test account
            const testUserId = '1';
            const [accessToken, refreshToken] = await Promise.all([
                (0, jwt_js_1.generateAccessToken)(testUserId, email, 'NIFYA Test User', true),
                (0, jwt_js_1.generateRefreshToken)(testUserId, email)
            ]);
            // Return success response for test account
            return res.json({
                accessToken,
                refreshToken,
                user: {
                    id: testUserId,
                    email: email,
                    name: 'NIFYA Test User',
                    email_verified: true
                }
            });
        }
        // If not test account, call next middleware
        return next();
    }
    catch (error) {
        console.error('Test login error:', error);
        next(error);
    }
};
exports.testLogin = testLogin;
//# sourceMappingURL=testLogin.controller.js.map