import { getPool } from '../config/database.js';
import { publishUserCreated } from '../config/pubsub.js';
import type { QueryResult, QueryResultRow } from 'pg';

// Debug function to log query execution
async function executeQuery<T extends QueryResultRow>(query: string, params: any[] = []): Promise<QueryResult<T>> {
  console.log('Executing query:', {
    text: query,
    params: params.map(p => p === null ? 'null' : String(p))
  });
  try {
    const result = await getPool().query(query, params);
    console.log('Query result:', {
      rowCount: result.rowCount,
      firstRow: result.rows[0] ? '(data)' : null
    });
    return result;
  } catch (error) {
    console.error('Query error:', error);
    throw error;
  }
}

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
    const result = await executeQuery<User>(
      `INSERT INTO users (email, password_hash, name, google_id, picture_url, email_verified)
       VALUES ($1, $2, $3, $4, $5, true)
       RETURNING *`,
      [email, passwordHash, name, googleId, pictureUrl]
    );
    const user = result.rows[0];
    
    // Publish user created event
    await publishUserCreated({
      id: user.id,
      email: user.email,
      name: user.name,
      createdAt: user.created_at.toISOString(),
      emailVerified: user.email_verified
    });
    
    return user;
  },

  getUserByEmail: async (email: string): Promise<User | null> => {
    const result = await executeQuery<User>(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );
    return result.rows[0] || null;
  },

  getUserById: async (id: string): Promise<User | null> => {
    const result = await executeQuery<User>(
      'SELECT * FROM users WHERE id = $1',
      [id]
    );
    return result.rows[0] || null;
  },

  updateUserProfile: async (
    userId: string,
    data: {
      googleId?: string;
      name?: string;
      pictureUrl?: string;
    }
  ): Promise<void> => {
    await executeQuery(
      `UPDATE users 
       SET google_id = COALESCE($1, google_id),
           name = COALESCE($2, name),
           picture_url = COALESCE($3, picture_url),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $4`,
      [data.googleId, data.name, data.pictureUrl, userId]
    );
  },

  updateLoginAttempts: async (userId: string, attempts: number, lockUntil?: Date): Promise<void> => {
    await executeQuery(
      'UPDATE users SET login_attempts = $1, locked_until = $2 WHERE id = $3',
      [attempts, lockUntil, userId]
    );
  },

  // Refresh token queries
  createRefreshToken: async (userId: string, token: string, expiresAt: Date): Promise<RefreshToken> => {
    const result = await executeQuery<RefreshToken>(
      `INSERT INTO refresh_tokens (user_id, token, expires_at)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [userId, token, expiresAt]
    );
    return result.rows[0];
  },

  getRefreshToken: async (token: string): Promise<RefreshToken | null> => {
    const result = await executeQuery<RefreshToken>(
      'SELECT * FROM refresh_tokens WHERE token = $1 AND revoked = false',
      [token]
    );
    return result.rows[0] || null;
  },

  revokeRefreshToken: async (token: string): Promise<void> => {
    await executeQuery(
      'UPDATE refresh_tokens SET revoked = true WHERE token = $1',
      [token]
    );
  },

  revokeAllUserRefreshTokens: async (userId: string): Promise<void> => {
    await executeQuery(
      'UPDATE refresh_tokens SET revoked = true WHERE user_id = $1',
      [userId]
    );
  },

  // Password reset queries
  createPasswordReset: async (userId: string, token: string, expiresAt: Date): Promise<PasswordResetRequest> => {
    const result = await executeQuery<PasswordResetRequest>(
      `INSERT INTO password_reset_requests (user_id, token, expires_at)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [userId, token, expiresAt]
    );
    return result.rows[0];
  },

  getPasswordReset: async (token: string): Promise<PasswordResetRequest | null> => {
    const result = await executeQuery<PasswordResetRequest>(
      'SELECT * FROM password_reset_requests WHERE token = $1 AND used = false AND expires_at > NOW()',
      [token]
    );
    return result.rows[0] || null;
  },

  markPasswordResetUsed: async (token: string): Promise<void> => {
    await executeQuery(
      'UPDATE password_reset_requests SET used = true WHERE token = $1',
      [token]
    );
  }
};