import { Router } from 'express';
import * as userController from '../auth/controllers/user.controller.js';
import { logout, refreshToken, revokeAllSessions, getSession } from '../auth/controllers/session.controller.js';
import { forgotPassword, resetPassword, changePassword } from '../auth/controllers/password.controller.js';
import { getGoogleAuthUrl, handleGoogleCallback } from '../auth/controllers/oauth.controller.js';
import { testLogin } from '../auth/controllers/testLogin.controller.js';
import { authenticate, rateLimit } from '../middleware/auth.middleware.js';
import {
  validateSignup,
  validateLogin,
  validateLogout,
  validateChangePassword,
  validateForgotPassword,
  validateResetPassword,
  validateRefreshToken,
  validateVerifyEmail
} from '../auth/validation/middleware.js';

const router = Router();

// Rate limits
const AUTH_RATE_LIMIT = rateLimit(10, 15); // 10 requests per 15 minutes for sensitive endpoints
const GENERAL_RATE_LIMIT = rateLimit(100, 5); // 100 requests per 5 minutes for general endpoints

// User management
router.post('/auth/signup', AUTH_RATE_LIMIT, validateSignup, userController.signup);
router.post('/auth/login', AUTH_RATE_LIMIT, testLogin, validateLogin, userController.login);
router.get('/auth/me', authenticate, GENERAL_RATE_LIMIT, userController.getCurrentUser);
router.post('/auth/verify-email', GENERAL_RATE_LIMIT, validateVerifyEmail, userController.verifyEmail);

// Session management
router.post('/auth/logout', GENERAL_RATE_LIMIT, validateLogout, logout);
router.post('/auth/refresh', AUTH_RATE_LIMIT, validateRefreshToken, refreshToken);
router.post('/auth/revoke-all-sessions', authenticate, AUTH_RATE_LIMIT, revokeAllSessions);
router.get('/auth/session', GENERAL_RATE_LIMIT, getSession);

// Password management
router.post('/auth/forgot-password', AUTH_RATE_LIMIT, validateForgotPassword, forgotPassword);
router.post('/auth/reset-password', AUTH_RATE_LIMIT, validateResetPassword, resetPassword);
router.post('/auth/change-password', authenticate, AUTH_RATE_LIMIT, validateChangePassword, changePassword);

// OAuth routes
router.post('/auth/google/login', GENERAL_RATE_LIMIT, getGoogleAuthUrl);
router.get('/auth/google/callback', GENERAL_RATE_LIMIT, handleGoogleCallback);

// Mock OAuth for development
if (process.env.NODE_ENV === 'development') {
  router.post('/auth/google/mock', async (req, res) => {
    try {
      // Mock user data
      const mockUser = {
        id: 'mock-google-user-123',
        email: req.body.email || 'mock-user@example.com',
        name: req.body.name || 'Mock User',
        email_verified: true
      };
      
      res.json({
        user: mockUser,
        accessToken: 'mock-access-token',
        refreshToken: 'mock-refresh-token'
      });
    } catch (error) {
      console.error('Mock OAuth error:', error);
      res.status(500).json({ error: 'Mock OAuth error' });
    }
  });
}

// v1 API namespace for backward compatibility
const v1Router = Router();
router.use('/v1', v1Router);
v1Router.post('/auth/refresh', refreshToken);

// Health check
router.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// Debug endpoints for development only
if (process.env.NODE_ENV === 'development') {
  router.get('/auth/debug/validate-token', async (req, res) => {
    try {
      const token = req.query.token as string;
      
      if (!token) {
        return res.status(400).json({ 
          error: 'Token is required',
          status: 'error'
        });
      }

      res.json({
        status: 'success',
        message: 'This is a debug endpoint',
        token: token.substring(0, 10) + '...'
      });
    } catch (error) {
      console.error('Debug validate-token error:', error);
      return res.status(500).json({ 
        error: 'Error validating token',
        status: 'error'
      });
    }
  });
}

export default router; 