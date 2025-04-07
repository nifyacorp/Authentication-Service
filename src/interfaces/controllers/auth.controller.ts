import { Request, Response, NextFunction } from 'express';
import { AuthenticationService } from '../../core/services/AuthenticationService';
import { UserService } from '../../core/services/UserService';
import { createSuccessResponse } from '../../core/interfaces/ApiResponse';
import {
  LoginRequest,
  SignupRequest,
  TokenRefreshRequest,
  LogoutRequest,
  PasswordResetRequestRequest,
  PasswordResetRequest,
  PasswordChangeRequest,
  EmailVerificationRequest,
  GoogleAuthCallbackRequest
} from '../validators/auth.validator';

/**
 * Controller for authentication-related endpoints
 */
export class AuthController {
  constructor(
    private readonly authService: AuthenticationService,
    private readonly userService: UserService
  ) {}

  /**
   * Login user with email and password
   */
  public login = async (
    req: Request<any, any, LoginRequest>,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const { email, password } = req.body;
      
      const { user, accessToken, refreshToken } = await this.authService.login(
        email,
        password
      );
      
      // Remove password hash from response
      const { password_hash, ...safeUser } = user;
      
      return res.json(
        createSuccessResponse({
          user: safeUser,
          tokens: {
            accessToken,
            refreshToken
          }
        })
      );
    } catch (error) {
      next(error);
    }
  };

  /**
   * Register a new user
   */
  public signup = async (
    req: Request<any, any, SignupRequest>,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const { email, password, name } = req.body;
      
      const user = await this.userService.createUser({
        email,
        password,
        name
      });
      
      // Remove password hash from response
      const { password_hash, ...safeUser } = user;
      
      return res.status(201).json(
        createSuccessResponse({
          user: safeUser,
          message: 'User created successfully. Please verify your email.'
        })
      );
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get current user details
   */
  public getCurrentUser = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      if (!req.user || !req.user.id) {
        return res.status(401).json(
          createSuccessResponse({
            authenticated: false
          })
        );
      }
      
      const user = await this.userService.getUserById(req.user.id);
      
      // Remove password hash from response
      const { password_hash, ...safeUser } = user;
      
      return res.json(
        createSuccessResponse({
          authenticated: true,
          user: safeUser
        })
      );
    } catch (error) {
      next(error);
    }
  };

  /**
   * Refresh access token using refresh token
   */
  public refreshToken = async (
    req: Request<any, any, TokenRefreshRequest>,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const { refreshToken } = req.body;
      
      const tokens = await this.authService.refreshToken(refreshToken);
      
      return res.json(
        createSuccessResponse({
          tokens
        })
      );
    } catch (error) {
      next(error);
    }
  };

  /**
   * Logout user by revoking refresh token
   */
  public logout = async (
    req: Request<any, any, LogoutRequest>,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const { refreshToken } = req.body;
      
      await this.authService.logout(refreshToken);
      
      return res.json(
        createSuccessResponse({
          message: 'Logged out successfully'
        })
      );
    } catch (error) {
      next(error);
    }
  };

  /**
   * Revoke all sessions for the current user
   */
  public revokeAllSessions = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      if (!req.user || !req.user.id) {
        return res.status(401).json(
          createSuccessResponse({
            message: 'Unauthorized'
          })
        );
      }
      
      await this.authService.revokeAllSessions(req.user.id);
      
      return res.json(
        createSuccessResponse({
          message: 'All sessions revoked successfully'
        })
      );
    } catch (error) {
      next(error);
    }
  };

  /**
   * Request password reset email
   */
  public requestPasswordReset = async (
    req: Request<any, any, PasswordResetRequestRequest>,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const { email } = req.body;
      
      await this.userService.initiatePasswordReset(email);
      
      // Always return success for security reasons, even if email doesn't exist
      return res.json(
        createSuccessResponse({
          message: 'If the email exists, a password reset link has been sent'
        })
      );
    } catch (error) {
      next(error);
    }
  };

  /**
   * Reset password with token
   */
  public resetPassword = async (
    req: Request<any, any, PasswordResetRequest>,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const { token, newPassword } = req.body;
      
      await this.userService.resetPassword(token, newPassword);
      
      return res.json(
        createSuccessResponse({
          message: 'Password reset successfully'
        })
      );
    } catch (error) {
      next(error);
    }
  };

  /**
   * Change password (when logged in)
   */
  public changePassword = async (
    req: Request<any, any, PasswordChangeRequest>,
    res: Response,
    next: NextFunction
  ) => {
    try {
      if (!req.user || !req.user.id) {
        return res.status(401).json(
          createSuccessResponse({
            message: 'Unauthorized'
          })
        );
      }
      
      const { currentPassword, newPassword } = req.body;
      
      await this.userService.changePassword(
        req.user.id,
        currentPassword,
        newPassword
      );
      
      return res.json(
        createSuccessResponse({
          message: 'Password changed successfully'
        })
      );
    } catch (error) {
      next(error);
    }
  };

  /**
   * Send email verification
   */
  public sendEmailVerification = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      if (!req.user || !req.user.id) {
        return res.status(401).json(
          createSuccessResponse({
            message: 'Unauthorized'
          })
        );
      }
      
      await this.userService.sendEmailVerification(req.user.id);
      
      return res.json(
        createSuccessResponse({
          message: 'Email verification sent'
        })
      );
    } catch (error) {
      next(error);
    }
  };

  /**
   * Verify email with token
   */
  public verifyEmail = async (
    req: Request<any, any, EmailVerificationRequest>,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const { token } = req.body;
      
      await this.userService.verifyEmail(token);
      
      return res.json(
        createSuccessResponse({
          message: 'Email verified successfully'
        })
      );
    } catch (error) {
      next(error);
    }
  };

  /**
   * Handle Google OAuth redirect
   */
  public googleAuthRedirect = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      // Generate a state parameter for CSRF protection
      const state = Math.random().toString(36).substring(2, 15);
      
      // Store state in session
      req.session.oauthState = state;
      
      // Get Google auth URL
      const authUrl = await this.authService.getGoogleAuthUrl(state);
      
      // Redirect to Google auth page
      return res.redirect(authUrl);
    } catch (error) {
      next(error);
    }
  };

  /**
   * Handle Google OAuth callback
   */
  public googleAuthCallback = async (
    req: Request<any, any, any, GoogleAuthCallbackRequest>,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const { code, state } = req.query;
      
      // Verify state parameter to prevent CSRF
      const storedState = req.session.oauthState;
      
      if (!storedState || storedState !== state) {
        return res.status(400).json(
          createSuccessResponse({
            message: 'Invalid state parameter'
          })
        );
      }
      
      // Clear state from session
      delete req.session.oauthState;
      
      // Complete OAuth flow
      const { user, accessToken, refreshToken, isNewUser } = await this.authService.handleGoogleAuth(code);
      
      // Remove password hash from response
      const { password_hash, ...safeUser } = user;
      
      return res.json(
        createSuccessResponse({
          user: safeUser,
          tokens: {
            accessToken,
            refreshToken
          },
          isNewUser
        })
      );
    } catch (error) {
      next(error);
    }
  };
}

// Augment Express session with oauthState property
declare module 'express-session' {
  interface SessionData {
    oauthState?: string;
  }
}