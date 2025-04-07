import { PasswordResetRequest } from '../entities/PasswordReset';

/**
 * Repository interface for PasswordReset operations
 */
export interface PasswordResetRepository {
  /**
   * Create a new password reset request
   */
  createPasswordResetRequest(userId: string, token: string, expiresAt: Date): Promise<PasswordResetRequest>;
  
  /**
   * Find a password reset request by token
   */
  findByToken(token: string): Promise<PasswordResetRequest | null>;
  
  /**
   * Find a password reset request by user ID
   */
  findByUserId(userId: string): Promise<PasswordResetRequest | null>;
  
  /**
   * Mark a password reset request as used
   */
  markAsUsed(id: string): Promise<void>;
  
  /**
   * Delete expired password reset requests (maintenance function)
   */
  deleteExpiredRequests(): Promise<number>;
}