/**
 * Core domain entity for Token
 */
export interface RefreshToken {
  id: string;
  user_id: string;
  token: string;
  expires_at: Date;
  created_at: Date;
  is_revoked: boolean;
}

export interface JwtPayload {
  sub: string; // user id
  email: string;
  type: TokenType;
  iat: number; // issued at timestamp
  exp: number; // expiration timestamp
  jti?: string; // JWT ID (for refresh tokens)
}

export enum TokenType {
  ACCESS = 'access',
  REFRESH = 'refresh',
  EMAIL_VERIFICATION = 'email_verification',
  PASSWORD_RESET = 'password_reset'
}