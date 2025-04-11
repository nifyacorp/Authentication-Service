import { query } from '../../database/client.js';
import { User, RefreshToken, PasswordResetRequest } from './types.js';

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
    name: string | null | undefined,
    googleId?: string,
    pictureUrl?: string
  ): Promise<User> {
    // Set a default name if none provided
    let userName = name;
    
    // If no name provided or it's empty, use the email username part
    if (!userName || userName.trim() === '') {
      userName = email.split('@')[0] || 'User';
      // Sanitize the username (remove special characters)
      userName = userName.replace(/[^A-Za-z0-9._\s]/g, '');
      // Ensure it's at least 2 characters
      if (userName.length < 2) {
        userName = 'User';
      }
    }
    
    // Split the name into first_name and last_name
    let first_name = userName;
    let last_name = '';
    
    // If name contains a space, split it into first and last name
    const nameParts = userName.split(' ');
    if (nameParts.length > 1) {
      first_name = nameParts[0];
      last_name = nameParts.slice(1).join(' ');
    }
    
    const result = await query<User>(
      `INSERT INTO users (email, password_hash, first_name, last_name, google_id, picture_url, email_verified)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [email, passwordHash, first_name, last_name, googleId, pictureUrl, googleId ? true : false]
    );
    
    // Construct full name for backward compatibility with code expecting 'name' property
    const user = result.rows[0];
    if (user && user.first_name) {
      // @ts-ignore - Adding virtual property for backward compatibility
      user.name = `${user.first_name || ''} ${user.last_name || ''}`.trim();
    }
    
    return user;
  },

  /**
   * Find a user by email
   */
  async findByEmail(email: string): Promise<User | null> {
    console.log(`🔍 DEBUG [USER REPO]: Finding user by email: ${email}`);
    
    // Special debug code to check for test accounts
    if (email === 'ratonxi@gmail.com') {
      console.log(`🔍 DEBUG [USER REPO]: Checking special case for email ${email}`);
    }
    
    try {
      // Execute the query with detailed logging
      const result = await query<User>(
        'SELECT * FROM users WHERE email = $1',
        [email]
      );
      
      // Log the result details
      console.log(`🔍 DEBUG [USER REPO]: findByEmail result rowCount: ${result.rowCount ?? 0}`);
      
      if (result.rowCount && result.rowCount > 0) {
        const user = result.rows[0];
        
        // Deep copy the user object and sanitize sensitive data for logging
        const userForLogging = { ...user };
        if (userForLogging.password_hash) {
          userForLogging.password_hash = '[REDACTED]';
        }
        
        console.log(`🔍 DEBUG [USER REPO]: User found: ${JSON.stringify(userForLogging)}`);
        
        // Additional checks to verify user ID matches expected pattern
        if (userForLogging.id) {
          console.log(`🔍 DEBUG [USER REPO]: User ID exists: ${userForLogging.id}`);
        }
        
        // Check if this is a special user ID we're looking for
        if (userForLogging.id === '65c6074d-dbc4-4091-8e45-b6aecffd9ab9') {
          console.log(`🔍 DEBUG [USER REPO]: Found the specific user ID we're tracking`);
        }
        
        return user;
      } else {
        console.log(`🔍 DEBUG [USER REPO]: No user found with email: ${email}`);
        return null;
      }
    } catch (error) {
      console.error(`⚠️ ERROR [USER REPO]: Error finding user by email: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  },

  /**
   * Find a user by ID
   */
  async findById(id: string): Promise<User | null> {
    console.log(`🔍 DEBUG [USER REPO]: Finding user by ID: ${id}`);
    
    const result = await query<User>(
      'SELECT * FROM users WHERE id = $1',
      [id]
    );
    
    if (result.rowCount && result.rowCount > 0) {
      console.log(`🔍 DEBUG [USER REPO]: User found by ID: ${id}`);
    } else {
      console.log(`🔍 DEBUG [USER REPO]: No user found with ID: ${id}`);
    }
    
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
      // Split name into first_name and last_name
      const nameParts = data.name.split(' ');
      const firstName = nameParts[0] || '';
      const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : '';
      
      updateParts.push(`first_name = $${paramIndex++}`);
      values.push(firstName);
      
      updateParts.push(`last_name = $${paramIndex++}`);
      values.push(lastName);
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

    const sqlQuery = `
      UPDATE users 
      SET ${updateParts.join(', ')}
      WHERE id = $${paramIndex}
    `;

    await query(sqlQuery, values);
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
    console.log(`🔍 DEBUG [TOKENS]: Creating refresh token for user: ${userId}`);
    
    try {
      // First attempt with tokens table since that's what's in the database
      console.log(`🔍 DEBUG [TOKENS]: Attempting to insert into tokens table first`);
      let result;
      
      try {
        result = await query<RefreshToken>(
          `INSERT INTO tokens (user_id, refresh_token, expires_at)
           VALUES ($1, $2, $3)
           RETURNING *`,
          [userId, token, expiresAt]
        );
        console.log(`🔍 DEBUG [TOKENS]: Successfully inserted into tokens table`);
      } catch (error) {
        console.log(`🔍 DEBUG [TOKENS]: Error inserting into tokens table: ${error instanceof Error ? error.message : String(error)}`);
        
        // Check if refresh_tokens table exists as fallback
        console.log(`🔍 DEBUG [TOKENS]: Checking if refresh_tokens table exists`);
        const refreshTokensTableExists = await query(`
          SELECT EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_schema = 'public' AND table_name = 'refresh_tokens'
          )
        `);
        
        if (refreshTokensTableExists.rows[0] && refreshTokensTableExists.rows[0].exists) {
          console.log(`🔍 DEBUG [TOKENS]: refresh_tokens table exists, trying to insert there instead`);
          
          // Try to insert into refresh_tokens table as fallback
          try {
            result = await query<RefreshToken>(
              `INSERT INTO refresh_tokens (user_id, token, expires_at)
               VALUES ($1, $2, $3)
               RETURNING *`,
              [userId, token, expiresAt]
            );
            console.log(`🔍 DEBUG [TOKENS]: Successfully inserted into refresh_tokens table`);
          } catch (refreshTokensInsertError) {
            console.log(`🔍 DEBUG [TOKENS]: Error inserting into refresh_tokens table: ${refreshTokensInsertError instanceof Error ? refreshTokensInsertError.message : String(refreshTokensInsertError)}`);
            throw refreshTokensInsertError;
          }
        } else {
          // Re-throw the original error
          throw error;
        }
      }
      
      console.log(`🔍 DEBUG [TOKENS]: Refresh token stored with ID: ${result?.rows?.[0]?.id || 'unknown'}`);
      return result.rows[0];
    } catch (error) {
      console.error(`⚠️ ERROR [TOKENS]: Failed to create refresh token: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  },

  /**
   * Find refresh token
   */
  async findRefreshToken(token: string): Promise<RefreshToken | null> {
    console.log(`🔍 DEBUG [TOKENS]: Finding refresh token: ${token.substring(0, 10)}...`);
    
    try {
      // First try to find in tokens table
      console.log(`🔍 DEBUG [TOKENS]: Searching in tokens table`);
      let result;
      
      try {
        result = await query<RefreshToken>(
          'SELECT * FROM tokens WHERE refresh_token = $1 AND is_revoked = false',
          [token]
        );
        console.log(`🔍 DEBUG [TOKENS]: Tokens table search result count: ${result.rowCount ?? 0}`);
        
        if (result.rowCount && result.rowCount > 0) {
          console.log(`🔍 DEBUG [TOKENS]: Token found in tokens table`);
          return result.rows[0];
        }
      } catch (error) {
        console.log(`🔍 DEBUG [TOKENS]: Error searching tokens table: ${error instanceof Error ? error.message : String(error)}`);
      }
      
      // If not found, try refresh_tokens table
      console.log(`🔍 DEBUG [TOKENS]: Searching in refresh_tokens table`);
      try {
        result = await query<RefreshToken>(
          'SELECT * FROM refresh_tokens WHERE token = $1 AND revoked = false',
          [token]
        );
        console.log(`🔍 DEBUG [TOKENS]: refresh_tokens table search result count: ${result.rowCount ?? 0}`);
        
        if (result.rowCount && result.rowCount > 0) {
          console.log(`🔍 DEBUG [TOKENS]: Token found in refresh_tokens table`);
          return result.rows[0];
        }
      } catch (error) {
        console.log(`🔍 DEBUG [TOKENS]: Error searching refresh_tokens table: ${error instanceof Error ? error.message : String(error)}`);
      }
      
      console.log(`🔍 DEBUG [TOKENS]: Token not found in any table`);
      return null;
    } catch (error) {
      console.error(`⚠️ ERROR [TOKENS]: Unexpected error finding refresh token: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  },

  /**
   * Revoke a refresh token
   */
  async revokeRefreshToken(token: string): Promise<void> {
    console.log(`🔍 DEBUG [TOKENS]: Revoking refresh token: ${token.substring(0, 10)}...`);
    
    try {
      // Try to revoke in tokens table first
      console.log(`🔍 DEBUG [TOKENS]: Attempting to revoke in tokens table`);
      try {
        const tokensResult = await query(
          'UPDATE tokens SET is_revoked = true WHERE refresh_token = $1',
          [token]
        );
        
        console.log(`🔍 DEBUG [TOKENS]: Tokens table update result: ${tokensResult.rowCount ?? 0} rows affected`);
        
        if (tokensResult.rowCount && tokensResult.rowCount > 0) {
          console.log(`🔍 DEBUG [TOKENS]: Token successfully revoked in tokens table`);
          return;
        }
      } catch (error) {
        console.log(`🔍 DEBUG [TOKENS]: Error revoking in tokens table: ${error instanceof Error ? error.message : String(error)}`);
      }
      
      // Try to revoke in refresh_tokens table
      console.log(`🔍 DEBUG [TOKENS]: Attempting to revoke in refresh_tokens table`);
      try {
        const refreshResult = await query(
          'UPDATE refresh_tokens SET revoked = true WHERE token = $1',
          [token]
        );
        
        console.log(`🔍 DEBUG [TOKENS]: refresh_tokens table update result: ${refreshResult.rowCount ?? 0} rows affected`);
        
        if (refreshResult.rowCount && refreshResult.rowCount > 0) {
          console.log(`🔍 DEBUG [TOKENS]: Token successfully revoked in refresh_tokens table`);
          return;
        }
      } catch (error) {
        console.log(`🔍 DEBUG [TOKENS]: Error revoking in refresh_tokens table: ${error instanceof Error ? error.message : String(error)}`);
      }
      
      console.log(`🔍 DEBUG [TOKENS]: Token not found in any table for revocation`);
    } catch (error) {
      console.error(`⚠️ ERROR [TOKENS]: Unexpected error revoking token: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  },

  /**
   * Revoke all refresh tokens for a user
   */
  async revokeAllUserRefreshTokens(userId: string): Promise<void> {
    console.log(`🔍 DEBUG [TOKENS]: Revoking all refresh tokens for user: ${userId}`);
    
    try {
      // Try to revoke in tokens table
      console.log(`🔍 DEBUG [TOKENS]: Attempting to revoke all tokens in tokens table for user`);
      try {
        const tokensResult = await query(
          'UPDATE tokens SET is_revoked = true WHERE user_id = $1',
          [userId]
        );
        
        console.log(`🔍 DEBUG [TOKENS]: Tokens table update result: ${tokensResult.rowCount ?? 0} rows affected`);
      } catch (error) {
        console.log(`🔍 DEBUG [TOKENS]: Error revoking all tokens in tokens table: ${error instanceof Error ? error.message : String(error)}`);
      }
      
      // Also try to revoke in refresh_tokens table
      console.log(`🔍 DEBUG [TOKENS]: Attempting to revoke all tokens in refresh_tokens table for user`);
      try {
        const refreshResult = await query(
          'UPDATE refresh_tokens SET revoked = true WHERE user_id = $1',
          [userId]
        );
        
        console.log(`🔍 DEBUG [TOKENS]: refresh_tokens table update result: ${refreshResult.rowCount ?? 0} rows affected`);
      } catch (error) {
        console.log(`🔍 DEBUG [TOKENS]: Error revoking all tokens in refresh_tokens table: ${error instanceof Error ? error.message : String(error)}`);
      }
    } catch (error) {
      console.error(`⚠️ ERROR [TOKENS]: Unexpected error revoking all tokens: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
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