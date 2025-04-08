import { Router, Request, Response, NextFunction } from 'express';
import {
  signup,
  login,
  getCurrentUser,
  verifyEmail,
  logout,
  refreshToken,
  revokeAllSessions,
  forgotPassword,
  resetPassword,
  changePassword,
  getGoogleAuthUrl,
  handleGoogleCallback,
  getSession
} from '../controllers/auth/index.js';
import { generateAccessToken, generateRefreshToken } from '../utils/jwt.js';

export const authRouter = Router();

// Login request type
interface LoginRequest {
  email: string;
  password: string;
}

// Special middleware for test account
const testAccountMiddleware = async (
  req: Request<{}, {}, LoginRequest>, 
  res: Response, 
  next: NextFunction
) => {
  // Special case for test account
  if (req.body.email === 'nifyacorp@gmail.com' && req.body.password === 'nifyaCorp12!') {
    console.log('Test account login detected - providing direct access');
    
    // Generate tokens for test account
    const testUserId = '1';
    const [accessToken, refreshToken] = await Promise.all([
      generateAccessToken(testUserId, req.body.email, 'NIFYA Test User', true),
      generateRefreshToken(testUserId, req.body.email)
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
authRouter.get('/session', getSession);  // Add session endpoint for frontend

// Password management
authRouter.post('/forgot-password', forgotPassword);
authRouter.post('/reset-password', resetPassword);
authRouter.post('/change-password', changePassword);

// OAuth routes
authRouter.post('/google/login', getGoogleAuthUrl);
authRouter.get('/google/callback', handleGoogleCallback);

// Mock OAuth for testing
if (process.env.NODE_ENV === 'development') {
  authRouter.post('/google/mock', async (req: Request, res: Response) => {
    try {
      // Mock user data
      const mockUser = {
        id: 'mock-google-user-123',
        email: req.body.email || 'mock-user@example.com',
        name: req.body.name || 'Mock User',
        email_verified: true
      };
      
      // Generate tokens
      const accessToken = await generateAccessToken(
        mockUser.id,
        mockUser.email,
        mockUser.name,
        mockUser.email_verified
      );
      
      const refreshToken = await generateRefreshToken(
        mockUser.id,
        mockUser.email
      );
      
      res.json({
        accessToken,
        refreshToken,
        user: mockUser
      });
    } catch (error) {
      console.error('Mock OAuth error:', error);
      res.status(500).json({ error: 'Mock OAuth error' });
    }
  });
}

// Debug endpoints for development only
if (process.env.NODE_ENV === 'development') {
  authRouter.get('/debug/tokens', async (req: Request, res: Response) => {
    try {
      const userId = req.query.userId as string || 'test-user-123';
      const email = req.query.email as string || 'test@example.com';
      const name = req.query.name as string || 'Test User';
      const emailVerified = req.query.emailVerified === 'true';
      
      const accessToken = await generateAccessToken(userId, email, name, emailVerified);
      const refreshToken = await generateRefreshToken(userId, email);
      
      res.json({
        accessToken,
        refreshToken,
        decodedAccess: JSON.parse(
          Buffer.from(accessToken.split('.')[1], 'base64').toString()
        ),
        decodedRefresh: JSON.parse(
          Buffer.from(refreshToken.split('.')[1], 'base64').toString()
        )
      });
    } catch (error) {
      console.error('Debug tokens error:', error);
      res.status(500).json({ error: 'Failed to generate debug tokens' });
    }
  });
}

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