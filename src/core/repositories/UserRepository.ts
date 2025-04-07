import { User, UserCreationParams, UserUpdateParams } from '../entities/User';

/**
 * Repository interface for User operations
 */
export interface UserRepository {
  /**
   * Create a new user
   */
  createUser(params: UserCreationParams): Promise<User>;
  
  /**
   * Find a user by ID
   */
  findById(id: string): Promise<User | null>;
  
  /**
   * Find a user by email
   */
  findByEmail(email: string): Promise<User | null>;
  
  /**
   * Update a user
   */
  updateUser(id: string, params: UserUpdateParams): Promise<User>;
  
  /**
   * Update login attempts
   */
  incrementLoginAttempts(id: string): Promise<void>;
  
  /**
   * Reset login attempts
   */
  resetLoginAttempts(id: string): Promise<void>;
  
  /**
   * Lock a user account until the specified date
   */
  lockAccount(id: string, lockedUntil: Date): Promise<void>;
  
  /**
   * Unlock a user account
   */
  unlockAccount(id: string): Promise<void>;
  
  /**
   * Mark user email as verified
   */
  markEmailAsVerified(id: string): Promise<void>;
}