import { User, UserCreationParams, UserUpdateParams } from '../entities/User';

/**
 * Interface for user service
 */
export interface UserService {
  /**
   * Create a new user
   */
  createUser(params: UserCreationParams): Promise<User>;
  
  /**
   * Get a user by ID
   */
  getUserById(id: string): Promise<User>;
  
  /**
   * Get a user by email
   */
  getUserByEmail(email: string): Promise<User | null>;
  
  /**
   * Update a user
   */
  updateUser(id: string, params: UserUpdateParams): Promise<User>;
  
  /**
   * Change user password
   */
  changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void>;
  
  /**
   * Initiate password reset
   */
  initiatePasswordReset(email: string): Promise<void>;
  
  /**
   * Reset password with token
   */
  resetPassword(token: string, newPassword: string): Promise<void>;
  
  /**
   * Send email verification
   */
  sendEmailVerification(userId: string): Promise<void>;
  
  /**
   * Verify email with token
   */
  verifyEmail(token: string): Promise<void>;
  
  /**
   * Remove account locks if the lock period has expired
   */
  refreshAccountStatus(userId: string): Promise<User>;
}