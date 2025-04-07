import { UserService } from '../UserService';
import { User, UserCreationParams, UserUpdateParams } from '../../entities/User';
import { UserRepository } from '../../repositories/UserRepository';
import { PasswordResetRepository } from '../../repositories/PasswordResetRepository';
import { EmailVerificationRepository } from '../../repositories/EmailVerificationRepository';
import { TokenService } from '../TokenService';
import { EmailService } from '../EmailService';
import { 
  AppError, 
  createUserNotFoundError, 
  createInvalidCredentialsError, 
  createUserAlreadyExistsError,
  createTokenExpiredError,
  createTokenInvalidError,
  createEmailNotVerifiedError
} from '../../errors/AppError';
import * as bcrypt from 'bcryptjs';

/**
 * Implementation of the UserService
 */
export class UserServiceImpl implements UserService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly passwordResetRepository: PasswordResetRepository,
    private readonly emailVerificationRepository: EmailVerificationRepository,
    private readonly tokenService: TokenService,
    private readonly emailService: EmailService,
    private readonly requireEmailVerification: boolean = true
  ) {}

  /**
   * Create a new user
   */
  public async createUser(params: UserCreationParams): Promise<User> {
    // Check if email already exists
    const existingUser = await this.userRepository.findByEmail(params.email);
    if (existingUser) {
      throw createUserAlreadyExistsError('Email already in use');
    }

    // Hash the password
    const passwordHash = await this.hashPassword(params.password);

    // Create the user
    const user = await this.userRepository.createUser({
      ...params,
      password: passwordHash
    });

    // Send verification email if required
    if (this.requireEmailVerification) {
      await this.sendEmailVerification(user.id);
    }

    // Send welcome email
    await this.emailService.sendWelcomeEmail(user.email, user.name || undefined);

    return user;
  }

  /**
   * Get a user by ID
   */
  public async getUserById(id: string): Promise<User> {
    const user = await this.userRepository.findById(id);
    if (!user) {
      throw createUserNotFoundError();
    }
    return user;
  }

  /**
   * Get a user by email
   */
  public async getUserByEmail(email: string): Promise<User | null> {
    return this.userRepository.findByEmail(email);
  }

  /**
   * Update a user
   */
  public async updateUser(id: string, params: UserUpdateParams): Promise<User> {
    // If updating email, check if new email is already in use
    if (params.email) {
      const existingUser = await this.userRepository.findByEmail(params.email);
      if (existingUser && existingUser.id !== id) {
        throw createUserAlreadyExistsError('Email already in use');
      }
      
      // If email is changing, set email_verified to false
      params.is_email_verified = false;
    }

    // If updating password, hash it
    if (params.password_hash) {
      params.password_hash = await this.hashPassword(params.password_hash);
    }

    return this.userRepository.updateUser(id, params);
  }

  /**
   * Change user password
   */
  public async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
    // Get the user
    const user = await this.getUserById(userId);

    // Verify current password
    const isPasswordValid = await this.verifyPassword(currentPassword, user.password_hash);
    if (!isPasswordValid) {
      throw createInvalidCredentialsError('Current password is incorrect');
    }

    // Update to new password
    const newPasswordHash = await this.hashPassword(newPassword);
    await this.userRepository.updateUser(userId, { password_hash: newPasswordHash });

    // Send account activity notification
    await this.emailService.sendAccountActivityEmail(
      user.email,
      'Your password has been changed successfully.',
      user.name || undefined
    );
  }

  /**
   * Initiate password reset
   */
  public async initiatePasswordReset(email: string): Promise<void> {
    // Find user by email
    const user = await this.userRepository.findByEmail(email);
    
    // If user not found, silently return (for security reasons)
    if (!user) {
      return;
    }

    // Generate password reset token
    const token = this.tokenService.generatePasswordResetToken(user.id, user.email);
    
    // Calculate token expiry (1 hour)
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1);
    
    // Store token in database
    await this.passwordResetRepository.createPasswordResetRequest(user.id, token, expiresAt);
    
    // Send password reset email
    await this.emailService.sendPasswordResetEmail(
      user.email,
      token,
      user.name || undefined
    );
  }

  /**
   * Reset password with token
   */
  public async resetPassword(token: string, newPassword: string): Promise<void> {
    try {
      // Verify the token
      const payload = await this.tokenService.verifyToken(token, 'password_reset');
      
      // Find the password reset request
      const resetRequest = await this.passwordResetRepository.findByToken(token);
      
      if (!resetRequest) {
        throw createTokenInvalidError('Password reset token not found');
      }
      
      if (resetRequest.is_used) {
        throw createTokenInvalidError('Password reset token has already been used');
      }
      
      if (new Date(resetRequest.expires_at) < new Date()) {
        throw createTokenExpiredError('Password reset token has expired');
      }
      
      // Get the user
      const user = await this.getUserById(resetRequest.user_id);
      
      // Hash the new password
      const passwordHash = await this.hashPassword(newPassword);
      
      // Update the user's password
      await this.userRepository.updateUser(user.id, { password_hash: passwordHash });
      
      // Mark the reset request as used
      await this.passwordResetRepository.markAsUsed(resetRequest.id);
      
      // Reset login attempts and unlock account
      await this.userRepository.resetLoginAttempts(user.id);
      
      // Send account activity notification
      await this.emailService.sendAccountActivityEmail(
        user.email,
        'Your password has been reset successfully.',
        user.name || undefined
      );
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw createTokenInvalidError('Invalid password reset token');
    }
  }

  /**
   * Send email verification
   */
  public async sendEmailVerification(userId: string): Promise<void> {
    // Get the user
    const user = await this.getUserById(userId);
    
    // If email already verified, no need to send verification
    if (user.is_email_verified) {
      return;
    }
    
    // Generate verification token
    const token = this.tokenService.generateVerificationToken(user.id, user.email);
    
    // Calculate token expiry (24 hours)
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);
    
    // Store token in database
    await this.emailVerificationRepository.createVerificationRequest(user.id, token, expiresAt);
    
    // Send verification email
    await this.emailService.sendVerificationEmail(
      user.email,
      token,
      user.name || undefined
    );
  }

  /**
   * Verify email with token
   */
  public async verifyEmail(token: string): Promise<void> {
    try {
      // Verify the token
      const payload = await this.tokenService.verifyToken(token, 'email_verification');
      
      // Find the verification request
      const verificationRequest = await this.emailVerificationRepository.findByToken(token);
      
      if (!verificationRequest) {
        throw createTokenInvalidError('Email verification token not found');
      }
      
      if (verificationRequest.is_used) {
        throw createTokenInvalidError('Email verification token has already been used');
      }
      
      if (new Date(verificationRequest.expires_at) < new Date()) {
        throw createTokenExpiredError('Email verification token has expired');
      }
      
      // Get the user
      const user = await this.getUserById(verificationRequest.user_id);
      
      // Mark email as verified
      await this.userRepository.markEmailAsVerified(user.id);
      
      // Mark the verification request as used
      await this.emailVerificationRepository.markAsUsed(verificationRequest.id);
      
      // Send account activity notification
      await this.emailService.sendAccountActivityEmail(
        user.email,
        'Your email has been verified successfully.',
        user.name || undefined
      );
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw createTokenInvalidError('Invalid email verification token');
    }
  }

  /**
   * Remove account locks if the lock period has expired
   */
  public async refreshAccountStatus(userId: string): Promise<User> {
    const user = await this.getUserById(userId);
    
    // If account is locked but lock period has expired, unlock it
    if (user.locked_until && new Date(user.locked_until) < new Date()) {
      await this.userRepository.unlockAccount(userId);
      return this.getUserById(userId);
    }
    
    return user;
  }

  /**
   * Verify a password against its hash
   */
  private async verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  /**
   * Hash a password
   */
  private async hashPassword(password: string): Promise<string> {
    const saltRounds = 10;
    return bcrypt.hash(password, saltRounds);
  }
}