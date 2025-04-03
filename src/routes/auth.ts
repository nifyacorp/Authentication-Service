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