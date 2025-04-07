import { EmailVerificationRepository } from '../../../core/repositories/EmailVerificationRepository';
import { EmailVerification } from '../../../core/entities/Email';
import { DatabaseClient } from '../DatabaseClient';
import { createInternalError } from '../../../core/errors/AppError';
import { v4 as uuidv4 } from 'uuid';

/**
 * PostgreSQL implementation of EmailVerificationRepository
 */
export class PostgresEmailVerificationRepository implements EmailVerificationRepository {
  constructor(private readonly dbClient: DatabaseClient) {}

  /**
   * Create a new email verification request
   */
  public async createVerificationRequest(userId: string, token: string, expiresAt: Date): Promise<EmailVerification> {
    try {
      const id = uuidv4();
      
      const query = `
        INSERT INTO email_verifications (id, user_id, token, expires_at, is_used)
        VALUES ($1, $2, $3, $4, FALSE)
        RETURNING id, user_id, token, expires_at, created_at, is_used
      `;
      
      const result = await this.dbClient.query<EmailVerification>(query, [id, userId, token, expiresAt]);
      return result.rows[0];
    } catch (error) {
      console.error('Error creating email verification request:', error);
      throw createInternalError('Failed to create email verification request', { error });
    }
  }

  /**
   * Find an email verification request by token
   */
  public async findByToken(token: string): Promise<EmailVerification | null> {
    try {
      const query = `
        SELECT id, user_id, token, expires_at, created_at, is_used
        FROM email_verifications
        WHERE token = $1
      `;
      
      const result = await this.dbClient.query<EmailVerification>(query, [token]);
      return result.rows.length ? result.rows[0] : null;
    } catch (error) {
      console.error('Error finding email verification request by token:', error);
      throw createInternalError('Failed to find email verification request by token', { error });
    }
  }

  /**
   * Find an email verification request by user ID
   */
  public async findByUserId(userId: string): Promise<EmailVerification | null> {
    try {
      const query = `
        SELECT id, user_id, token, expires_at, created_at, is_used
        FROM email_verifications
        WHERE user_id = $1 AND is_used = FALSE AND expires_at > NOW()
        ORDER BY created_at DESC
        LIMIT 1
      `;
      
      const result = await this.dbClient.query<EmailVerification>(query, [userId]);
      return result.rows.length ? result.rows[0] : null;
    } catch (error) {
      console.error('Error finding email verification request by user ID:', error);
      throw createInternalError('Failed to find email verification request by user ID', { error });
    }
  }

  /**
   * Mark an email verification request as used
   */
  public async markAsUsed(id: string): Promise<void> {
    try {
      const query = `
        UPDATE email_verifications
        SET is_used = TRUE
        WHERE id = $1
      `;
      
      await this.dbClient.query(query, [id]);
    } catch (error) {
      console.error('Error marking email verification request as used:', error);
      throw createInternalError('Failed to mark email verification request as used', { error });
    }
  }

  /**
   * Delete expired email verification requests (maintenance function)
   */
  public async deleteExpiredRequests(): Promise<number> {
    try {
      const query = `
        DELETE FROM email_verifications
        WHERE expires_at < NOW()
        OR is_used = TRUE
      `;
      
      const result = await this.dbClient.query(query);
      return result.rowCount || 0;
    } catch (error) {
      console.error('Error deleting expired email verification requests:', error);
      throw createInternalError('Failed to delete expired email verification requests', { error });
    }
  }
}