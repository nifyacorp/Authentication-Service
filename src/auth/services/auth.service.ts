import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { userRepository } from '../models/user.repository.js';
import { AUTH_ERRORS } from '../errors/factory.js';
import { 
  generateAccessToken, 
  generateRefreshToken, 
  verifyToken,
  calculateExpirationDate,
  getJwtExpirationSeconds,
  JWT_EXPIRES_IN,
  REFRESH_TOKEN_EXPIRES_IN
} from '../../utils/jwt.js';
import { User, LoginResponse, UserProfile } from '../models/types.js';

// Number of rounds for bcrypt salt generation
const SALT_ROUNDS = 10;

// Maximum login attempts before account lockout
const MAX_LOGIN_ATTEMPTS = 5;

// Account lockout duration in minutes
const ACCOUNT_LOCKOUT_MINUTES = 15;

/**
 * Authentication service - handles user authentication logic
 */
export const authService = {
  /**
   * Create a new user
   */
  async createUser(
    email: string, 
    password: string
  ) {
    // Check if email exists
    const existingUser = await userRepository.findByEmail(email);
    if (existingUser) {
      throw AUTH_ERRORS.EMAIL_EXISTS;
    }
    
    // Hash password
    const salt = await bcrypt.genSalt(SALT_ROUNDS);
    const hashedPassword = await bcrypt.hash(password, salt);
    
    // Create user
    const user = await userRepository.createUser(
      email,
      hashedPassword
    );
    
    // Sync user to backend
    try {
      await this.syncUserToBackend(user.id, user.email);
    } catch (error) {
      console.error('Failed to sync user to backend:', error instanceof Error ? error.message : 'Unknown error');
      // Don't fail user creation if sync fails
    }
    
    // Return success response
    return {
      message: 'User created successfully',
      user: {
        id: user.id,
        email: user.email,
        email_verified: user.email_verified
      }
    };
  },
  
  /**
   * Sync user to backend service
   */
  async syncUserToBackend(userId: string, email: string): Promise<boolean> {
    try {
      console.log(`Syncing user ${userId} to backend service`);
      
      // Get backend URL from environment or use default
      const backendUrl = process.env.BACKEND_API_URL || 'https://backend-415554190254.us-central1.run.app';
      
      // Try to get API key from environment first
      let apiKey = process.env.BACKEND_API_KEY || '';
      
      // If not in env, try to get it from Secret Manager
      if (!apiKey) {
        try {
          // Check if we have access to Secret Manager and the secret exists
          const { SecretManagerServiceClient } = await import('@google-cloud/secret-manager');
          const secretClient = new SecretManagerServiceClient();
          
          // Format of the secret name
          const projectId = process.env.GOOGLE_CLOUD_PROJECT || 'delta-entity-447812-p2';
          const secretName = `projects/${projectId}/secrets/SYNC_USERS_API_KEY/versions/latest`;
          
          console.log(`Attempting to fetch API key from Secret Manager: ${secretName}`);
          
          const [version] = await secretClient.accessSecretVersion({ name: secretName });
          if (version && version.payload && version.payload.data) {
            apiKey = version.payload.data.toString();
            console.log('Successfully retrieved API key from Secret Manager');
          } else {
            console.warn('Retrieved secret version has no payload or data');
          }
        } catch (secretError) {
          console.error('Failed to get SYNC_USERS_API_KEY from Secret Manager:', 
            secretError instanceof Error ? secretError.message : 'Unknown error');
        }
      }
      
      if (!apiKey) {
        console.warn('No API key available for backend sync. Neither BACKEND_API_KEY environment variable nor SYNC_USERS_API_KEY in Secret Manager is set.');
      }
      
      // Make API call to backend sync endpoint
      const response = await fetch(`${backendUrl}/api/v1/users/sync`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': apiKey,
        },
        body: JSON.stringify({
          userId,
          email
        })
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Backend sync failed with status ${response.status}: ${errorText}`);
      }
      
      console.log(`User ${userId} successfully synced to backend`);
      return true;
    } catch (error) {
      console.error('User sync error:', error instanceof Error ? error.message : 'Unknown error');
      throw error;
    }
  },
  
  /**
   * Authenticate a user and return tokens
   */
  async login(email: string, password: string): Promise<LoginResponse> {
    // Get user from database
    const user = await userRepository.findByEmail(email);
    
    if (!user) {
      throw AUTH_ERRORS.USER_NOT_FOUND;
    }
    
    // Check if account is locked
    if (user.locked_until && new Date(user.locked_until) > new Date()) {
      throw AUTH_ERRORS.ACCOUNT_LOCKED(user.locked_until.toISOString());
    }
    
    // Verify password
    if (!user.password_hash) {
      throw AUTH_ERRORS.INVALID_LOGIN_METHOD;
    }
    
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    
    if (!isValidPassword) {
      await this.handleFailedLogin(user);
      throw AUTH_ERRORS.INVALID_CREDENTIALS;
    }
    
    // Reset login attempts on successful login
    if (user.login_attempts > 0) {
      await userRepository.updateLoginAttempts(user.id, 0, undefined);
    }
    
    // Generate tokens
    const accessToken = await generateAccessToken(
      user.id, 
      user.email,
      user.email_verified
    );
    
    const refreshToken = await generateRefreshToken(user.id);
    
    // Store refresh token
    const expiresAt = calculateExpirationDate(REFRESH_TOKEN_EXPIRES_IN);
    await userRepository.createRefreshToken(user.id, refreshToken, expiresAt);
    
    return {
      accessToken,
      refreshToken,
      expiresIn: getJwtExpirationSeconds(),
      user: {
        id: user.id,
        email: user.email,
        email_verified: user.email_verified
      }
    };
  },
  
  /**
   * Handle failed login attempt
   */
  async handleFailedLogin(user: User): Promise<void> {
    const loginAttempts = (user.login_attempts || 0) + 1;
    let lockUntil: Date | undefined;
    
    if (loginAttempts >= MAX_LOGIN_ATTEMPTS) {
      lockUntil = new Date(Date.now() + ACCOUNT_LOCKOUT_MINUTES * 60 * 1000);
    }
    
    await userRepository.updateLoginAttempts(user.id, loginAttempts, lockUntil);
  },
  
  /**
   * Refresh access token
   */
  async refreshToken(refreshToken: string): Promise<LoginResponse> {
    // Verify refresh token
    const tokenData = await userRepository.findRefreshToken(refreshToken);
    
    if (!tokenData) {
      throw AUTH_ERRORS.INVALID_TOKEN;
    }
    
    // Check if token is expired
    if (new Date(tokenData.expires_at) < new Date()) {
      await userRepository.revokeRefreshToken(refreshToken);
      throw AUTH_ERRORS.SESSION_EXPIRED;
    }
    
    // Verify token payload
    const decoded = await verifyToken(refreshToken);
    
    if (!decoded || decoded.type !== 'refresh') {
      await userRepository.revokeRefreshToken(refreshToken);
      throw AUTH_ERRORS.INVALID_TOKEN;
    }
    
    // Get user
    const user = await userRepository.findById(tokenData.user_id);
    
    if (!user) {
      throw AUTH_ERRORS.NOT_FOUND('User');
    }
    
    // Revoke old token
    await userRepository.revokeRefreshToken(refreshToken);
    
    // Generate new tokens
    const newAccessToken = await generateAccessToken(
      user.id, 
      user.email,
      user.email_verified
    );
    
    const newRefreshToken = await generateRefreshToken(user.id);
    
    // Store new refresh token
    const expiresAt = calculateExpirationDate(REFRESH_TOKEN_EXPIRES_IN);
    await userRepository.createRefreshToken(user.id, newRefreshToken, expiresAt);
    
    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
      expiresIn: getJwtExpirationSeconds(),
      user: {
        id: user.id,
        email: user.email,
        email_verified: user.email_verified
      }
    };
  },
  
  /**
   * Logout user by revoking refresh token
   */
  async logout(refreshToken: string): Promise<{ message: string; timestamp: string }> {
    await userRepository.revokeRefreshToken(refreshToken);
    
    return {
      message: 'Logged out successfully',
      timestamp: new Date().toISOString()
    };
  },
  
  /**
   * Get user profile by ID
   */
  async getUserProfile(userId: string): Promise<UserProfile> {
    const user = await userRepository.findById(userId);
    
    if (!user) {
      throw AUTH_ERRORS.NOT_FOUND('User');
    }
    
    return {
      id: user.id,
      email: user.email,
      createdAt: user.created_at.toISOString(),
      emailVerified: user.email_verified,
      pictureUrl: user.picture_url,
      preferences: {
        theme: 'light', // Default preferences
        language: 'en',
        notifications: true
      }
    };
  },
  
  /**
   * Change user password
   */
  async changePassword(
    userId: string, 
    currentPassword: string, 
    newPassword: string
  ): Promise<{ message: string }> {
    const user = await userRepository.findById(userId);
    
    if (!user || !user.password_hash) {
      throw AUTH_ERRORS.INVALID_CREDENTIALS;
    }
    
    // Verify current password
    const isValidPassword = await bcrypt.compare(currentPassword, user.password_hash);
    
    if (!isValidPassword) {
      throw AUTH_ERRORS.INVALID_CREDENTIALS;
    }
    
    // Hash new password
    const salt = await bcrypt.genSalt(SALT_ROUNDS);
    const hashedPassword = await bcrypt.hash(newPassword, salt);
    
    // Update password
    await userRepository.updatePassword(userId, hashedPassword);
    
    return {
      message: 'Password changed successfully'
    };
  },
  
  /**
   * Request password reset
   */
  async requestPasswordReset(email: string): Promise<{ message: string }> {
    const user = await userRepository.findByEmail(email);
    
    // Don't reveal if user exists
    if (!user) {
      return {
        message: 'If the email exists, a password reset link has been sent'
      };
    }
    
    // Generate token
    const token = crypto.randomUUID();
    
    // Store token
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
    await userRepository.createPasswordReset(user.id, token, expiresAt);
    
    // TODO: Send email with reset link
    // This would be implemented in a real service
    
    return {
      message: 'If the email exists, a password reset link has been sent'
    };
  },
  
  /**
   * Reset password with token
   */
  async resetPassword(token: string, newPassword: string): Promise<{ message: string }> {
    const resetRequest = await userRepository.findPasswordReset(token);
    
    if (!resetRequest) {
      throw AUTH_ERRORS.INVALID_TOKEN;
    }
    
    // Hash new password
    const salt = await bcrypt.genSalt(SALT_ROUNDS);
    const hashedPassword = await bcrypt.hash(newPassword, salt);
    
    // Update password
    await userRepository.updatePassword(resetRequest.user_id, hashedPassword);
    
    // Mark token as used
    await userRepository.markPasswordResetUsed(token);
    
    // Revoke all refresh tokens for security
    await userRepository.revokeAllUserRefreshTokens(resetRequest.user_id);
    
    return {
      message: 'Password reset successfully'
    };
  }
}; 