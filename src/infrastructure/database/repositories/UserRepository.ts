import { UserRepository } from '../../../core/repositories/UserRepository';
import { User, UserCreationParams, UserUpdateParams } from '../../../core/entities/User';
import { DatabaseClient } from '../DatabaseClient';
import { createInternalError, createUserNotFoundError } from '../../../core/errors/AppError';
import { v4 as uuidv4 } from 'uuid';

/**
 * PostgreSQL implementation of UserRepository
 */
export class PostgresUserRepository implements UserRepository {
  constructor(private readonly dbClient: DatabaseClient) {}

  /**
   * Create a new user
   */
  public async createUser(params: UserCreationParams): Promise<User> {
    const id = uuidv4();
    const { email, password, name = null } = params;
    
    try {
      const query = `
        INSERT INTO users (id, email, password_hash, name, is_email_verified, login_attempts)
        VALUES ($1, $2, $3, $4, FALSE, 0)
        RETURNING id, email, name, password_hash, is_email_verified, login_attempts, locked_until, created_at, updated_at
      `;
      
      const result = await this.dbClient.query<User>(query, [id, email, password, name]);
      return result.rows[0];
    } catch (error) {
      console.error('Error creating user:', error);
      throw createInternalError('Failed to create user', { error });
    }
  }

  /**
   * Find a user by ID
   */
  public async findById(id: string): Promise<User | null> {
    try {
      const query = `
        SELECT id, email, name, password_hash, is_email_verified, login_attempts, locked_until, created_at, updated_at
        FROM users
        WHERE id = $1
      `;
      
      const result = await this.dbClient.query<User>(query, [id]);
      return result.rows.length ? result.rows[0] : null;
    } catch (error) {
      console.error('Error finding user by ID:', error);
      throw createInternalError('Failed to find user by ID', { error });
    }
  }

  /**
   * Find a user by email
   */
  public async findByEmail(email: string): Promise<User | null> {
    try {
      const query = `
        SELECT id, email, name, password_hash, is_email_verified, login_attempts, locked_until, created_at, updated_at
        FROM users
        WHERE email = $1
      `;
      
      const result = await this.dbClient.query<User>(query, [email]);
      return result.rows.length ? result.rows[0] : null;
    } catch (error) {
      console.error('Error finding user by email:', error);
      throw createInternalError('Failed to find user by email', { error });
    }
  }

  /**
   * Update a user
   */
  public async updateUser(id: string, params: UserUpdateParams): Promise<User> {
    try {
      const updates: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;
      
      // Build dynamic update query based on provided params
      if (params.name !== undefined) {
        updates.push(`name = $${paramIndex}`);
        values.push(params.name);
        paramIndex++;
      }
      
      if (params.email !== undefined) {
        updates.push(`email = $${paramIndex}`);
        values.push(params.email);
        paramIndex++;
      }
      
      if (params.password_hash !== undefined) {
        updates.push(`password_hash = $${paramIndex}`);
        values.push(params.password_hash);
        paramIndex++;
      }
      
      if (params.is_email_verified !== undefined) {
        updates.push(`is_email_verified = $${paramIndex}`);
        values.push(params.is_email_verified);
        paramIndex++;
      }
      
      if (params.login_attempts !== undefined) {
        updates.push(`login_attempts = $${paramIndex}`);
        values.push(params.login_attempts);
        paramIndex++;
      }
      
      if (params.locked_until !== undefined) {
        updates.push(`locked_until = $${paramIndex}`);
        values.push(params.locked_until);
        paramIndex++;
      }
      
      // Return early if no updates
      if (updates.length === 0) {
        const user = await this.findById(id);
        if (!user) {
          throw createUserNotFoundError();
        }
        return user;
      }
      
      // Add mandatory updated_at field
      updates.push(`updated_at = NOW()`);
      
      // Create the query with all updates
      const query = `
        UPDATE users
        SET ${updates.join(', ')}
        WHERE id = $${paramIndex}
        RETURNING id, email, name, password_hash, is_email_verified, login_attempts, locked_until, created_at, updated_at
      `;
      
      // Add the ID as the last parameter
      values.push(id);
      
      const result = await this.dbClient.query<User>(query, values);
      if (!result.rows.length) {
        throw createUserNotFoundError();
      }
      
      return result.rows[0];
    } catch (error: any) {
      console.error('Error updating user:', error);
      
      if (error.code === createUserNotFoundError().code) {
        throw error;
      }
      
      throw createInternalError('Failed to update user', { error });
    }
  }

  /**
   * Increment login attempts
   */
  public async incrementLoginAttempts(id: string): Promise<void> {
    try {
      const query = `
        UPDATE users
        SET login_attempts = login_attempts + 1,
            updated_at = NOW()
        WHERE id = $1
      `;
      
      await this.dbClient.query(query, [id]);
    } catch (error) {
      console.error('Error incrementing login attempts:', error);
      throw createInternalError('Failed to increment login attempts', { error });
    }
  }

  /**
   * Reset login attempts
   */
  public async resetLoginAttempts(id: string): Promise<void> {
    try {
      const query = `
        UPDATE users
        SET login_attempts = 0,
            locked_until = NULL,
            updated_at = NOW()
        WHERE id = $1
      `;
      
      await this.dbClient.query(query, [id]);
    } catch (error) {
      console.error('Error resetting login attempts:', error);
      throw createInternalError('Failed to reset login attempts', { error });
    }
  }

  /**
   * Lock a user account until the specified date
   */
  public async lockAccount(id: string, lockedUntil: Date): Promise<void> {
    try {
      const query = `
        UPDATE users
        SET locked_until = $1,
            updated_at = NOW()
        WHERE id = $2
      `;
      
      await this.dbClient.query(query, [lockedUntil, id]);
    } catch (error) {
      console.error('Error locking account:', error);
      throw createInternalError('Failed to lock account', { error });
    }
  }

  /**
   * Unlock a user account
   */
  public async unlockAccount(id: string): Promise<void> {
    try {
      const query = `
        UPDATE users
        SET locked_until = NULL,
            updated_at = NOW()
        WHERE id = $1
      `;
      
      await this.dbClient.query(query, [id]);
    } catch (error) {
      console.error('Error unlocking account:', error);
      throw createInternalError('Failed to unlock account', { error });
    }
  }

  /**
   * Mark user email as verified
   */
  public async markEmailAsVerified(id: string): Promise<void> {
    try {
      const query = `
        UPDATE users
        SET is_email_verified = TRUE,
            updated_at = NOW()
        WHERE id = $1
      `;
      
      await this.dbClient.query(query, [id]);
    } catch (error) {
      console.error('Error marking email as verified:', error);
      throw createInternalError('Failed to mark email as verified', { error });
    }
  }
}