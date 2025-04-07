import { PasswordResetRepository } from '../../../core/repositories/PasswordResetRepository';
import { PasswordResetRequest } from '../../../core/entities/PasswordReset';
import { DatabaseClient } from '../DatabaseClient';
import { createInternalError } from '../../../core/errors/AppError';
import { v4 as uuidv4 } from 'uuid';

/**
 * PostgreSQL implementation of PasswordResetRepository
 */
export class PostgresPasswordResetRepository implements PasswordResetRepository {
  constructor(private readonly dbClient: DatabaseClient) {}

  /**
   * Create a new password reset request
   */
  public async createPasswordResetRequest(userId: string, token: string, expiresAt: Date): Promise<PasswordResetRequest> {
    try {
      const id = uuidv4();
      
      const query = `
        INSERT INTO password_reset_requests (id, user_id, token, expires_at, is_used)
        VALUES ($1, $2, $3, $4, FALSE)
        RETURNING id, user_id, token, expires_at, created_at, is_used
      `;
      
      const result = await this.dbClient.query<PasswordResetRequest>(query, [id, userId, token, expiresAt]);
      return result.rows[0];
    } catch (error) {
      console.error('Error creating password reset request:', error);
      throw createInternalError('Failed to create password reset request', { error });
    }
  }

  /**
   * Find a password reset request by token
   */
  public async findByToken(token: string): Promise<PasswordResetRequest | null> {
    try {
      const query = `
        SELECT id, user_id, token, expires_at, created_at, is_used
        FROM password_reset_requests
        WHERE token = $1
      `;
      
      const result = await this.dbClient.query<PasswordResetRequest>(query, [token]);
      return result.rows.length ? result.rows[0] : null;
    } catch (error) {
      console.error('Error finding password reset request by token:', error);
      throw createInternalError('Failed to find password reset request by token', { error });
    }
  }

  /**
   * Find a password reset request by user ID
   */
  public async findByUserId(userId: string): Promise<PasswordResetRequest | null> {
    try {
      const query = `
        SELECT id, user_id, token, expires_at, created_at, is_used
        FROM password_reset_requests
        WHERE user_id = $1 AND is_used = FALSE AND expires_at > NOW()
        ORDER BY created_at DESC
        LIMIT 1
      `;
      
      const result = await this.dbClient.query<PasswordResetRequest>(query, [userId]);
      return result.rows.length ? result.rows[0] : null;
    } catch (error) {
      console.error('Error finding password reset request by user ID:', error);
      throw createInternalError('Failed to find password reset request by user ID', { error });
    }
  }

  /**
   * Mark a password reset request as used
   */
  public async markAsUsed(id: string): Promise<void> {
    try {
      const query = `
        UPDATE password_reset_requests
        SET is_used = TRUE
        WHERE id = $1
      `;
      
      await this.dbClient.query(query, [id]);
    } catch (error) {
      console.error('Error marking password reset request as used:', error);
      throw createInternalError('Failed to mark password reset request as used', { error });
    }
  }

  /**
   * Delete expired password reset requests (maintenance function)
   */
  public async deleteExpiredRequests(): Promise<number> {
    try {
      const query = `
        DELETE FROM password_reset_requests
        WHERE expires_at < NOW()
        OR is_used = TRUE
      `;
      
      const result = await this.dbClient.query(query);
      return result.rowCount || 0;
    } catch (error) {
      console.error('Error deleting expired password reset requests:', error);
      throw createInternalError('Failed to delete expired password reset requests', { error });
    }
  }
}