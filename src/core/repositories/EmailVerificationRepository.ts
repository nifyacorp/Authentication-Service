import { EmailVerification } from '../entities/Email';

/**
 * Repository interface for EmailVerification operations
 */
export interface EmailVerificationRepository {
  /**
   * Create a new email verification request
   */
  createVerificationRequest(userId: string, token: string, expiresAt: Date): Promise<EmailVerification>;
  
  /**
   * Find an email verification request by token
   */
  findByToken(token: string): Promise<EmailVerification | null>;
  
  /**
   * Find an email verification request by user ID
   */
  findByUserId(userId: string): Promise<EmailVerification | null>;
  
  /**
   * Mark an email verification request as used
   */
  markAsUsed(id: string): Promise<void>;
  
  /**
   * Delete expired email verification requests (maintenance function)
   */
  deleteExpiredRequests(): Promise<number>;
}