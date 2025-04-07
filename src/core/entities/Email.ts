/**
 * Core domain entity for Email Verification
 */
export interface EmailVerification {
  id: string;
  user_id: string;
  token: string;
  expires_at: Date;
  created_at: Date;
  is_used: boolean;
}

export interface EmailSendParams {
  to: string;
  subject: string;
  body: string;
}