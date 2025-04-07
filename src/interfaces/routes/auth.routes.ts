import { Router } from 'express';
import { AuthController } from '../controllers';
import { validate } from '../middlewares/validation.middleware';
import { authenticate } from '../middlewares/auth.middleware';
import { authRateLimiter } from '../middlewares/rate-limiter.middleware';
import {
  loginSchema,
  signupSchema,
  tokenRefreshSchema,
  logoutSchema,
  passwordResetRequestSchema,
  passwordResetSchema,
  passwordChangeSchema,
  emailVerificationSchema
} from '../validators/auth.validator';
import { AuthenticationService } from '../../core/services/AuthenticationService';

/**
 * Initialize auth routes
 */
export function initAuthRoutes(
  router: Router,
  authController: AuthController,
  authService: AuthenticationService
): Router {
  // Authentication
  router.post(
    '/auth/login',
    authRateLimiter,
    validate(loginSchema),
    authController.login
  );
  
  router.post(
    '/auth/signup',
    authRateLimiter,
    validate(signupSchema),
    authController.signup
  );
  
  router.post(
    '/auth/token',
    validate(tokenRefreshSchema),
    authController.refreshToken
  );
  
  router.post(
    '/auth/logout',
    validate(logoutSchema),
    authController.logout
  );
  
  router.post(
    '/auth/sessions/revoke',
    authenticate(authService),
    authController.revokeAllSessions
  );
  
  // Password management
  router.post(
    '/auth/password/reset-request',
    validate(passwordResetRequestSchema),
    authController.requestPasswordReset
  );
  
  router.post(
    '/auth/password/reset',
    validate(passwordResetSchema),
    authController.resetPassword
  );
  
  router.post(
    '/auth/password/change',
    authenticate(authService),
    validate(passwordChangeSchema),
    authController.changePassword
  );
  
  // Email verification
  router.post(
    '/auth/email/verify',
    validate(emailVerificationSchema),
    authController.verifyEmail
  );
  
  router.post(
    '/auth/email/verification-request',
    authenticate(authService),
    authController.sendEmailVerification
  );
  
  // User info
  router.get(
    '/auth/me',
    authenticate(authService),
    authController.getCurrentUser
  );
  
  // OAuth
  router.get(
    '/auth/google',
    authController.googleAuthRedirect
  );
  
  router.get(
    '/auth/google/callback',
    authController.googleAuthCallback
  );
  
  return router;
}