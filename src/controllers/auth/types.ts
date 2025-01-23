import { Request } from 'express';

export interface AuthRequest extends Request {
  headers: {
    authorization?: string;
  };
}

export interface LoginBody {
  email: string;
  password: string;
}

export interface ForgotPasswordBody {
  email: string;
}

export interface ResetPasswordBody {
  token: string;
  newPassword: string;
}

export interface SignupBody {
  email: string;
  password: string;
  name: string;
}

export interface RefreshTokenBody {
  refreshToken: string;
}

export interface ChangePasswordBody {
  currentPassword: string;
  newPassword: string;
}

export interface VerifyEmailBody {
  token: string;
}

export interface UserPreferences {
  theme: 'light' | 'dark';
  language: string;
  notifications: boolean;
}

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  createdAt: string;
  emailVerified: boolean;
  preferences: UserPreferences;
}