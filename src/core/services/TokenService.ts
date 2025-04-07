import { JwtPayload, TokenType } from '../entities/Token';

/**
 * Interface for token service
 */
export interface TokenService {
  /**
   * Generate an access token
   */
  generateAccessToken(userId: string, email: string): string;
  
  /**
   * Generate a refresh token
   */
  generateRefreshToken(userId: string, email: string): Promise<string>;
  
  /**
   * Generate a verification token
   */
  generateVerificationToken(userId: string, email: string): string;
  
  /**
   * Generate a password reset token
   */
  generatePasswordResetToken(userId: string, email: string): string;
  
  /**
   * Verify and decode a token
   */
  verifyToken(token: string, type: TokenType): Promise<JwtPayload>;
  
  /**
   * Delete expired tokens from the database
   */
  cleanupExpiredTokens(): Promise<void>;
}