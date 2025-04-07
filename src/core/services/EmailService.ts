import { EmailSendParams } from '../entities/Email';

/**
 * Interface for email service
 */
export interface EmailService {
  /**
   * Send an email
   */
  sendEmail(params: EmailSendParams): Promise<void>;
  
  /**
   * Send a verification email
   */
  sendVerificationEmail(email: string, verificationLink: string, name?: string): Promise<void>;
  
  /**
   * Send a password reset email
   */
  sendPasswordResetEmail(email: string, resetLink: string, name?: string): Promise<void>;
  
  /**
   * Send a welcome email
   */
  sendWelcomeEmail(email: string, name?: string): Promise<void>;
  
  /**
   * Send an account activity notification email
   */
  sendAccountActivityEmail(email: string, activity: string, name?: string): Promise<void>;
}