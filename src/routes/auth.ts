import { Router } from 'express';
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
  handleGoogleCallback
} from '../controllers/auth/index.js';

export const authRouter = Router();

// User management
authRouter.post('/login', login);
authRouter.post('/signup', signup);
authRouter.get('/me', getCurrentUser);
authRouter.post('/verify-email', verifyEmail);

// Session management
authRouter.post('/logout', logout);
authRouter.post('/refresh', refreshToken);
authRouter.post('/revoke-all-sessions', revokeAllSessions);

// Password management
authRouter.post('/forgot-password', forgotPassword);
authRouter.post('/reset-password', resetPassword);
authRouter.post('/change-password', changePassword);

// OAuth routes
authRouter.post('/google/login', getGoogleAuthUrl);
authRouter.get('/google/callback', handleGoogleCallback);