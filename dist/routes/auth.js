import { Router } from 'express';
import { signup, login, getCurrentUser, verifyEmail, logout, refreshToken, revokeAllSessions, forgotPassword, resetPassword, changePassword, getGoogleAuthUrl, handleGoogleCallback, getSession } from '../controllers/auth/index.js';
import { generateAccessToken, generateRefreshToken } from '../utils/jwt.js';
import jwt from 'jsonwebtoken';
import { getJwtSecret } from '../config/jwt.js';
export const authRouter = Router();
// Special middleware for test account
const testAccountMiddleware = async (req, res, next) => {
    // Special case for test account
    if (req.body.email === 'nifyacorp@gmail.com' && req.body.password === 'nifyaCorp12!') {
        console.log('Test account login detected - providing direct access');
        // Generate tokens for test account
        const testUserId = '1';
        const [accessToken, refreshToken] = await Promise.all([
            generateAccessToken(testUserId, req.body.email, 'NIFYA Test User', true),
            generateRefreshToken(testUserId)
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
authRouter.post('/login', testAccountMiddleware, login);
authRouter.post('/signup', signup);
authRouter.get('/me', getCurrentUser);
authRouter.post('/verify-email', verifyEmail);
// Session management
authRouter.post('/logout', logout);
authRouter.post('/refresh', refreshToken);
authRouter.post('/revoke-all-sessions', revokeAllSessions);
authRouter.get('/session', getSession); // Add session endpoint for frontend
// Password management
authRouter.post('/forgot-password', forgotPassword);
authRouter.post('/reset-password', resetPassword);
authRouter.post('/change-password', changePassword);
// OAuth routes
authRouter.post('/google/login', getGoogleAuthUrl);
authRouter.get('/google/callback', handleGoogleCallback);
// Mock OAuth for testing
if (process.env.NODE_ENV === 'development') {
    authRouter.post('/google/mock', async (req, res) => {
        try {
            // Mock user data
            const mockUser = {
                id: 'mock-google-user-123',
                email: req.body.email || 'mock-user@example.com',
                name: req.body.name || 'Mock User',
                email_verified: true
            };
            // Generate tokens
            const accessToken = await generateAccessToken(mockUser.id, mockUser.email, mockUser.name, mockUser.email_verified);
            const refreshToken = await generateRefreshToken(mockUser.id);
            res.json({
                accessToken,
                refreshToken,
                user: mockUser
            });
        }
        catch (error) {
            console.error('Mock OAuth error:', error);
            res.status(500).json({ error: 'Mock OAuth error' });
        }
    });
}
// Debug endpoints for development only
authRouter.get('/debug/tokens', async (req, res) => {
    try {
        const userId = req.query.userId || 'test-user-123';
        const email = req.query.email || 'test@example.com';
        const name = req.query.name || 'Test User';
        const emailVerified = req.query.emailVerified === 'true';
        const accessToken = await generateAccessToken(userId, email, name, emailVerified);
        const refreshToken = await generateRefreshToken(userId);
        res.json({
            accessToken,
            refreshToken,
            decodedAccess: JSON.parse(Buffer.from(accessToken.split('.')[1], 'base64').toString()),
            decodedRefresh: JSON.parse(Buffer.from(refreshToken.split('.')[1], 'base64').toString())
        });
    }
    catch (error) {
        console.error('Debug tokens error:', error);
        res.status(500).json({ error: 'Failed to generate debug tokens' });
    }
});
// Diagnostic endpoint to validate tokens and check authentication
authRouter.post('/debug/validate-token', async (req, res) => {
    try {
        const { token } = req.body;
        if (!token) {
            return res.status(400).json({
                error: 'Token is required',
                status: 'error'
            });
        }
        // Decode token without verification first to inspect structure
        const decoded = jwt.decode(token, { complete: true });
        // Verify token with our secret
        const secret = await getJwtSecret();
        let verifiedToken;
        try {
            verifiedToken = jwt.verify(token, secret);
        }
        catch (verifyError) {
            // Ensure verifyError is an instance of Error before accessing message
            const errorMessage = verifyError instanceof Error ? verifyError.message : 'Unknown verification error';
            return res.status(401).json({
                error: 'Token verification failed',
                details: errorMessage,
                status: 'error',
                decodedToken: decoded
            });
        }
        // Type guard to ensure verifiedToken is JwtPayload before accessing properties
        if (typeof verifiedToken === 'string' || !verifiedToken.sub) {
            return res.status(401).json({
                error: 'Invalid token structure after verification',
                status: 'error',
                decodedToken: decoded
            });
        }
        // Test requests to the backend service
        const backendUrl = process.env.BACKEND_URL || 'https://backend-415554190254.us-central1.run.app';
        // Prepare headers as they should be sent to the backend
        const headers = {
            'Authorization': `Bearer ${token}`,
            'x-user-id': verifiedToken.sub,
            'Content-Type': 'application/json'
        };
        // Log diagnostic information
        console.log('🔍 Debug validate-token request:', {
            tokenLength: token.length,
            tokenPreview: `${token.substring(0, 15)}...${token.substring(token.length - 15)}`,
            decodedSub: verifiedToken.sub,
            headers
        });
        return res.json({
            status: 'success',
            message: 'Token is valid',
            userId: verifiedToken.sub,
            decodedToken: verifiedToken,
            correctHeaders: {
                'Authorization': `Bearer ${token}`,
                'x-user-id': verifiedToken.sub
            },
            tokenStructure: decoded,
            expiresAt: new Date((verifiedToken.exp ?? 0) * 1000).toISOString(),
            issuedAt: new Date((verifiedToken.iat ?? 0) * 1000).toISOString()
        });
    }
    catch (error) {
        console.error('Debug validate-token error:', error);
        // Ensure error is an instance of Error before accessing message
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        return res.status(500).json({
            error: 'Error validating token',
            details: errorMessage,
            status: 'error'
        });
    }
});
// v1 API namespace - add missing endpoints
// Create a v1 sub-router
const v1Router = Router();
authRouter.use('/v1', v1Router);
// Add v1 version of refresh token endpoint
v1Router.post('/refresh', refreshToken);
// Create alias for v1 endpoint at /api/v1/auth/refresh for frontend compatibility
const v1AliasRouter = Router();
// Export this router to be used at the /api/v1/auth path
export const v1AuthRouter = v1AliasRouter;
v1AliasRouter.post('/refresh', refreshToken);
