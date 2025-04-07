/**
 * Core domain entity for User
 */
export interface User {
  id: string;
  email: string;
  name: string | null;
  password_hash: string;
  is_email_verified: boolean;
  login_attempts: number;
  locked_until: Date | null;
  created_at: Date;
  updated_at: Date;
}

export interface UserCreationParams {
  email: string;
  password: string;
  name?: string | null;
}

export interface UserUpdateParams {
  name?: string;
  email?: string;
  password_hash?: string;
  is_email_verified?: boolean;
  login_attempts?: number;
  locked_until?: Date | null;
}