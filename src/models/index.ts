import { getPool } from '../config/database.js';
import { QueryResult } from 'pg';

export interface User {
  id: string;
  email: string;
  password_hash?: string;
  name: string;
  created_at: Date;
  updated_at: Date;
  email_verified: boolean;
  google_id?: string;
  picture_url?: string;
  login_attempts: number;
  locked_until?: Date;
}

export interface RefreshToken {
  id: string;
  user_id: string;
  token: string;
  created_at: Date;
  expires_at: Date;
  revoked: boolean;
}

export interface PasswordResetRequest {
  id: string;
  user_id: string;
  token: string;
  created_at: Date;
  expires_at: Date;
  used: boolean;
}

export const queries = {
  // User queries
  createUser: async (
    email: string,
    passwordHash: string | null,
    name: string,
    googleId?: string,
    pictureUrl?: string
  ): Promise<User> => {
    const result = await getPool().query(
      `INSERT INTO users (email, password_hash, name, google_id, picture_url)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [email, passwordHash, name, googleId, pictureUrl]
    );
    return result.rows[0];
  },

  getUserByEmail: async (email: string): Promise<User | null> => {
    const result = await getPool().query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );
    return result.rows[0] || null;
  },

  getUserById: async (id: string): Promise<User | null> => {
    const result = await getPool().query(
      'SELECT * FROM users WHERE id = $1',
      [id]
    );
    return result.rows[0] || null;
  },

  updateLoginAttempts: async (userId: string, attempts: number, lockUntil?: Date): Promise<void> => {
    await getPool().query(
      'UPDATE users SET login_attempts = $1, locked_until = $2 WHERE id = $3',
      [attempts, lockUntil, userId]
    );
  },

  // Refresh token queries
  createRefreshToken: async (userId: string, token: string, expiresAt: Date): Promise<RefreshToken> => {
    const result = await getPool().query(
      `INSERT INTO refresh_tokens (user_id, token, expires_at)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [userId, token, expiresAt]
    );
    return result.rows[0];
  },

  getRefreshToken: async (token: string): Promise<RefreshToken | null> => {
    const result = await getPool().query(
      'SELECT * FROM refresh_tokens WHERE token = $1 AND revoked = false',
      [token]
    );
    return result.rows[0] || null;
  },

  revokeRefreshToken: async (token: string): Promise<void> => {
    await getPool().query(
      'UPDATE refresh_tokens SET revoked = true WHERE token = $1',
      [token]
    );
  },

  revokeAllUserRefreshTokens: async (userId: string): Promise<void> => {
    await getPool().query(
      'UPDATE refresh_tokens SET revoked = true WHERE user_id = $1',
      [userId]
    );
  },

  // Password reset queries
  createPasswordReset: async (userId: string, token: string, expiresAt: Date): Promise<PasswordResetRequest> => {
    const result = await getPool().query(
      `INSERT INTO password_reset_requests (user_id, token, expires_at)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [userId, token, expiresAt]
    );
    return result.rows[0];
  },

  getPasswordReset: async (token: string): Promise<PasswordResetRequest | null> => {
    const result = await getPool().query(
      'SELECT * FROM password_reset_requests WHERE token = $1 AND used = false AND expires_at > NOW()',
      [token]
    );
    return result.rows[0] || null;
  },

  markPasswordResetUsed: async (token: string): Promise<void> => {
    await getPool().query(
      'UPDATE password_reset_requests SET used = true WHERE token = $1',
      [token]
    );
  }
};