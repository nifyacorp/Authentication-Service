import { z } from 'zod';

/**
 * Validation schemas for authentication-related requests
 */

// Login validation schema
export const loginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(6, 'Password must be at least 6 characters')
});

// Signup validation schema
export const signupSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  name: z.string().optional()
});

// Password reset request validation schema
export const passwordResetRequestSchema = z.object({
  email: z.string().email('Invalid email format')
});

// Password reset validation schema
export const passwordResetSchema = z.object({
  token: z.string(),
  newPassword: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
});

// Password change validation schema
export const passwordChangeSchema = z.object({
  currentPassword: z.string(),
  newPassword: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
});

// Email verification validation schema
export const emailVerificationSchema = z.object({
  token: z.string()
});

// Token refresh validation schema
export const tokenRefreshSchema = z.object({
  refreshToken: z.string()
});

// Logout validation schema
export const logoutSchema = z.object({
  refreshToken: z.string()
});

// Google OAuth callback validation schema
export const googleAuthCallbackSchema = z.object({
  code: z.string(),
  state: z.string().optional()
});

// Extract the TypeScript types from the schemas
export type LoginRequest = z.infer<typeof loginSchema>;
export type SignupRequest = z.infer<typeof signupSchema>;
export type PasswordResetRequestRequest = z.infer<typeof passwordResetRequestSchema>;
export type PasswordResetRequest = z.infer<typeof passwordResetSchema>;
export type PasswordChangeRequest = z.infer<typeof passwordChangeSchema>;
export type EmailVerificationRequest = z.infer<typeof emailVerificationSchema>;
export type TokenRefreshRequest = z.infer<typeof tokenRefreshSchema>;
export type LogoutRequest = z.infer<typeof logoutSchema>;
export type GoogleAuthCallbackRequest = z.infer<typeof googleAuthCallbackSchema>;