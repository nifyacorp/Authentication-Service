import { query } from '../../database/client';
import { User, RefreshToken, PasswordResetRequest } from './types';

/**
 * User repository - handles database operations for users and tokens
 */
export const userRepository = {
  /**
   * Create a new user
   */
  async createUser(
    email: string,
    passwordHash: string | null,
    name: string,
    googleId?: string,
    pictureUrl?: string
  ): Promise<User> {
    const result = await query<User>(
      `INSERT INTO users (email, password_hash, name, google_id, picture_url, email_verified)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [email, passwordHash, name, googleId, pictureUrl, googleId ? true : false]
    );
    return result.rows[0];
  },

  /**
   * Find a user by email
   */
  async findByEmail(email: string): Promise<User | null> {
    const result = await query<User>(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );
    return result.rows[0] || null;
  },

  /**
   * Find a user by ID
   */
  async findById(id: string): Promise<User | null> {
    const result = await query<User>(
      'SELECT * FROM users WHERE id = $1',
      [id]
    );
    return result.rows[0] || null;
  },

  /**
   * Find a user by Google ID
   */
  async findByGoogleId(googleId: string): Promise<User | null> {
    const result = await query<User>(
      'SELECT * FROM users WHERE google_id = $1',
      [googleId]
    );
    return result.rows[0] || null;
  },

  /**
   * Update user profile
   */
  async updateProfile(
    userId: string,
    data: {
      name?: string;
      googleId?: string;
      pictureUrl?: string;
      emailVerified?: boolean;
    }
  ): Promise<void> {
    // Build the update parts dynamically based on provided data
    const updateParts = [];
    const values = [];
    let paramIndex = 1;

    if (data.name !== undefined) {
      updateParts.push(`name = $${paramIndex++}`);
      values.push(data.name);
    }

    if (data.googleId !== undefined) {
      updateParts.push(`google_id = $${paramIndex++}`);
      values.push(data.googleId);
    }

    if (data.pictureUrl !== undefined) {
      updateParts.push(`picture_url = $${paramIndex++}`);
      values.push(data.pictureUrl);
    }

    if (data.emailVerified !== undefined) {
      updateParts.push(`email_verified = $${paramIndex++}`);
      values.push(data.emailVerified);
    }

    // Add updated_at
    updateParts.push(`updated_at = CURRENT_TIMESTAMP`);

    // If nothing to update, return
    if (updateParts.length === 1) {
      return;
    }

    // Add the user ID as the last parameter
    values.push(userId);

    const query = `
      UPDATE users 
      SET ${updateParts.join(', ')}
      WHERE id = $${paramIndex}
    `;

    await query(query, values);
  },

  /**
   * Update login attempts and lock status
   */
  async updateLoginAttempts(
    userId: string, 
    attempts: number, 
    lockUntil?: Date
  ): Promise<void> {
    await query(
      'UPDATE users SET login_attempts = $1, locked_until = $2 WHERE id = $3',
      [attempts, lockUntil, userId]
    );
  },

  /**
   * Update password
   */
  async updatePassword(
    userId: string,
    passwordHash: string
  ): Promise<void> {
    await query(
      `UPDATE users 
       SET password_hash = $1, 
           updated_at = CURRENT_TIMESTAMP 
       WHERE id = $2`,
      [passwordHash, userId]
    );
  },

  /**
   * Verify email
   */
  async verifyEmail(userId: string): Promise<void> {
    await query(
      `UPDATE users 
       SET email_verified = true, 
           updated_at = CURRENT_TIMESTAMP 
       WHERE id = $1`,
      [userId]
    );
  },

  // Refresh token operations

  /**
   * Create a refresh token
   */
  async createRefreshToken(
    userId: string,
    token: string,
    expiresAt: Date
  ): Promise<RefreshToken> {
    const result = await query<RefreshToken>(
      `INSERT INTO refresh_tokens (user_id, token, expires_at)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [userId, token, expiresAt]
    );
    return result.rows[0];
  },

  /**
   * Find refresh token
   */
  async findRefreshToken(token: string): Promise<RefreshToken | null> {
    const result = await query<RefreshToken>(
      'SELECT * FROM refresh_tokens WHERE token = $1 AND revoked = false',
      [token]
    );
    return result.rows[0] || null;
  },

  /**
   * Revoke a refresh token
   */
  async revokeRefreshToken(token: string): Promise<void> {
    await query(
      'UPDATE refresh_tokens SET revoked = true WHERE token = $1',
      [token]
    );
  },

  /**
   * Revoke all refresh tokens for a user
   */
  async revokeAllUserRefreshTokens(userId: string): Promise<void> {
    await query(
      'UPDATE refresh_tokens SET revoked = true WHERE user_id = $1',
      [userId]
    );
  },

  // Password reset operations

  /**
   * Create password reset request
   */
  async createPasswordReset(
    userId: string,
    token: string,
    expiresAt: Date
  ): Promise<PasswordResetRequest> {
    const result = await query<PasswordResetRequest>(
      `INSERT INTO password_reset_requests (user_id, token, expires_at)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [userId, token, expiresAt]
    );
    return result.rows[0];
  },

  /**
   * Find password reset request
   */
  async findPasswordReset(token: string): Promise<PasswordResetRequest | null> {
    const result = await query<PasswordResetRequest>(
      'SELECT * FROM password_reset_requests WHERE token = $1 AND used = false AND expires_at > NOW()',
      [token]
    );
    return result.rows[0] || null;
  },

  /**
   * Mark password reset as used
   */
  async markPasswordResetUsed(token: string): Promise<void> {
    await query(
      'UPDATE password_reset_requests SET used = true WHERE token = $1',
      [token]
    );
  }
}; 