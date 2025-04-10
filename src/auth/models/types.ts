/**
 * User entity from database
 */
export interface User {
  id: string;
  email: string;
  password_hash?: string;
  first_name?: string;
  last_name?: string;
  name?: string; // Virtual property for backward compatibility
  created_at: Date;
  updated_at: Date;
  email_verified: boolean;
  google_id?: string;
  picture_url?: string;
  login_attempts: number;
  locked_until?: Date;
}

/**
 * User profile for API responses
 */
export interface UserProfile {
  id: string;
  email: string;
  name: string;
  createdAt: string;
  emailVerified: boolean;
  pictureUrl?: string;
  preferences?: {
    theme?: string;
    language?: string;
    notifications?: boolean;
  };
}

/**
 * Login response data
 */
export interface LoginResponse {
  user: {
    id: string;
    email: string;
    name: string;
    email_verified: boolean;
  };
  accessToken: string;
  refreshToken?: string;
  expiresIn: number;
}

/**
 * Refresh token entity from database
 */
export interface RefreshToken {
  id: string;
  user_id: string;
  token: string;
  created_at: Date;
  expires_at: Date;
  revoked: boolean;
}

/**
 * Password reset request entity from database
 */
export interface PasswordResetRequest {
  id: string;
  user_id: string;
  token: string;
  created_at: Date;
  expires_at: Date;
  used: boolean;
}

/**
 * Login request body
 */
export interface LoginBody {
  email: string;
  password: string;
}

/**
 * Signup request body
 */
export interface SignupBody {
  email: string;
  password: string;
  name?: string;
}

/**
 * Verify email request body
 */
export interface VerifyEmailBody {
  token: string;
}

/**
 * Refresh token request body
 */
export interface RefreshTokenBody {
  refreshToken: string;
}

/**
 * Logout request body
 */
export interface LogoutBody {
  refreshToken: string;
}

/**
 * Forgot password request body
 */
export interface ForgotPasswordBody {
  email: string;
}

/**
 * Reset password request body
 */
export interface ResetPasswordBody {
  token: string;
  password: string;
}

/**
 * Change password request body
 */
export interface ChangePasswordBody {
  currentPassword: string;
  newPassword: string;
}

/**
 * AuthRequest interface with user property
 */
export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    name: string;
    email_verified: boolean;
  };
} 