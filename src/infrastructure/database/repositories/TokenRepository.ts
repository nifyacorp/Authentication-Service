import { TokenRepository } from '../../../core/repositories/TokenRepository';
import { RefreshToken } from '../../../core/entities/Token';
import { DatabaseClient } from '../DatabaseClient';
import { createInternalError } from '../../../core/errors/AppError';
import { v4 as uuidv4 } from 'uuid';

/**
 * PostgreSQL implementation of TokenRepository
 */
export class PostgresTokenRepository implements TokenRepository {
  constructor(private readonly dbClient: DatabaseClient) {}

  /**
   * Create a new refresh token
   */
  public async createRefreshToken(userId: string, token: string, expiresAt: Date): Promise<RefreshToken> {
    try {
      const id = uuidv4();
      
      const query = `
        INSERT INTO refresh_tokens (id, user_id, token, expires_at, is_revoked)
        VALUES ($1, $2, $3, $4, FALSE)
        RETURNING id, user_id, token, expires_at, created_at, is_revoked
      `;
      
      const result = await this.dbClient.query<RefreshToken>(query, [id, userId, token, expiresAt]);
      return result.rows[0];
    } catch (error) {
      console.error('Error creating refresh token:', error);
      throw createInternalError('Failed to create refresh token', { error });
    }
  }

  /**
   * Find a refresh token by token string
   */
  public async findRefreshToken(token: string): Promise<RefreshToken | null> {
    try {
      const query = `
        SELECT id, user_id, token, expires_at, created_at, is_revoked
        FROM refresh_tokens
        WHERE token = $1
      `;
      
      const result = await this.dbClient.query<RefreshToken>(query, [token]);
      return result.rows.length ? result.rows[0] : null;
    } catch (error) {
      console.error('Error finding refresh token:', error);
      throw createInternalError('Failed to find refresh token', { error });
    }
  }

  /**
   * Revoke a refresh token
   */
  public async revokeRefreshToken(token: string): Promise<void> {
    try {
      const query = `
        UPDATE refresh_tokens
        SET is_revoked = TRUE
        WHERE token = $1
      `;
      
      await this.dbClient.query(query, [token]);
    } catch (error) {
      console.error('Error revoking refresh token:', error);
      throw createInternalError('Failed to revoke refresh token', { error });
    }
  }

  /**
   * Revoke all refresh tokens for a user
   */
  public async revokeAllUserTokens(userId: string): Promise<void> {
    try {
      const query = `
        UPDATE refresh_tokens
        SET is_revoked = TRUE
        WHERE user_id = $1
      `;
      
      await this.dbClient.query(query, [userId]);
    } catch (error) {
      console.error('Error revoking all user tokens:', error);
      throw createInternalError('Failed to revoke all user tokens', { error });
    }
  }

  /**
   * Delete expired tokens (maintenance function)
   */
  public async deleteExpiredTokens(): Promise<number> {
    try {
      const query = `
        DELETE FROM refresh_tokens
        WHERE expires_at < NOW()
        OR is_revoked = TRUE
      `;
      
      const result = await this.dbClient.query(query);
      return result.rowCount || 0;
    } catch (error) {
      console.error('Error deleting expired tokens:', error);
      throw createInternalError('Failed to delete expired tokens', { error });
    }
  }
}