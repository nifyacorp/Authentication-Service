import { Router } from 'express';
import * as userController from '../auth/controllers/user.controller';
import { authenticate, rateLimit } from '../middleware/auth.middleware';
import {
  validateSignup,
  validateLogin,
  validateLogout,
  validateChangePassword
} from '../auth/validation/middleware';

const router = Router();

// Rate limits
const AUTH_RATE_LIMIT = rateLimit(10, 15); // 10 requests per 15 minutes for sensitive endpoints
const GENERAL_RATE_LIMIT = rateLimit(100, 5); // 100 requests per 5 minutes for general endpoints

// Public routes
router.post('/auth/signup', AUTH_RATE_LIMIT, validateSignup, userController.signup);
router.post('/auth/login', AUTH_RATE_LIMIT, validateLogin, userController.login);
router.post('/auth/logout', GENERAL_RATE_LIMIT, validateLogout, userController.logout);

// Protected routes
router.get('/auth/me', authenticate, GENERAL_RATE_LIMIT, userController.getCurrentUser);
router.post('/auth/change-password', authenticate, AUTH_RATE_LIMIT, validateChangePassword, userController.changePassword);

// Health check
router.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

export default router; 