import bcrypt from 'bcryptjs';
import { userRepository } from '../models/user.repository';
import { AUTH_ERRORS } from '../errors/factory';
import { 
  generateAccessToken, 
  generateRefreshToken, 
  verifyToken,
  calculateExpirationDate,
  getJwtExpirationSeconds,
  JWT_EXPIRES_IN,
  REFRESH_TOKEN_EXPIRES_IN
} from '../../utils/jwt';
import { User, LoginResponse, UserProfile } from '../models/types';

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
    password: string, 
    name?: string
  ) {
    // Check if email exists
    const existingUser = await userRepository.findByEmail(email);
    if (existingUser) {
      throw AUTH_ERRORS.EMAIL_EXISTS;
    }
    
    // Extract username from email if name not provided
    let extractedName = email.split('@')[0];
    
    // Sanitize the extracted name 
    extractedName = extractedName.replace(/[^A-Za-z0-9._\s]/g, '');
    
    // Ensure it's at least 2 characters (minimum required by validation)
    if (extractedName.length < 2) {
      extractedName = extractedName.padEnd(2, 'x');
    }
    
    // Use the extracted name if no name is provided
    const userName = name || extractedName;
    
    // Hash password
    const salt = await bcrypt.genSalt(SALT_ROUNDS);
    const hashedPassword = await bcrypt.hash(password, salt);
    
    // Create user
    const user = await userRepository.createUser(
      email,
      hashedPassword,
      userName
    );
    
    // Return success response
    return {
      message: 'User created successfully',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        email_verified: user.email_verified
      }
    };
  },
  
  /**
   * Authenticate a user and return tokens
   */
  async login(email: string, password: string): Promise<LoginResponse> {
    // Get user from database
    const user = await userRepository.findByEmail(email);
    
    if (!user) {
      throw AUTH_ERRORS.INVALID_CREDENTIALS;
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
      user.name, 
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
        name: user.name,
        email_verified: user.email_verified
      }
    };
  },
  
  /**
   * Handle failed login attempt
   */
  private async handleFailedLogin(user: User): Promise<void> {
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
      user.name, 
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
        name: user.name,
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
      name: user.name,
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