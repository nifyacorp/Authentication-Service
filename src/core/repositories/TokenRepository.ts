import { RefreshToken } from '../entities/Token';

/**
 * Repository interface for Token operations
 */
export interface TokenRepository {
  /**
   * Create a new refresh token
   */
  createRefreshToken(userId: string, token: string, expiresAt: Date): Promise<RefreshToken>;
  
  /**
   * Find a refresh token by token string
   */
  findRefreshToken(token: string): Promise<RefreshToken | null>;
  
  /**
   * Revoke a refresh token
   */
  revokeRefreshToken(token: string): Promise<void>;
  
  /**
   * Revoke all refresh tokens for a user
   */
  revokeAllUserTokens(userId: string): Promise<void>;
  
  /**
   * Delete expired tokens (maintenance function)
   */
  deleteExpiredTokens(): Promise<number>;
}