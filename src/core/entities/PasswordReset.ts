/**
 * Core domain entity for PasswordReset
 */
export interface PasswordResetRequest {
  id: string;
  user_id: string;
  token: string;
  expires_at: Date;
  created_at: Date;
  is_used: boolean;
}

export interface PasswordResetParams {
  email: string;
  token: string;
  newPassword: string;
}