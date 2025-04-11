import { z } from 'zod';
/**
 * User signup schema
 * - Email must be a valid email format
 * - Password must be at least 6 characters and contain at least one number
 * - Name is optional, but if provided must be 2-50 characters and contain only letters, numbers, dots, underscores, and spaces
 */
export const signupSchema = z.object({
    email: z.string()
        .email('Invalid email format'),
    password: z.string()
        .min(6, 'Password must be at least 6 characters')
        .regex(/[0-9]/, 'Password must contain at least one number'),
    name: z.string()
        .min(2, 'Name must be at least 2 characters')
        .max(50, 'Name must not exceed 50 characters')
        .regex(/^[A-Za-z0-9._\s]+$/, 'Name can only contain letters, numbers, dots, underscores, and spaces')
        .optional()
});
/**
 * User login schema
 * - Email must be a valid email format
 * - Password must be provided
 */
export const loginSchema = z.object({
    email: z.string()
        .email('Invalid email format'),
    password: z.string()
        .min(1, 'Password is required')
});
/**
 * Password reset request schema
 */
export const forgotPasswordSchema = z.object({
    email: z.string()
        .email('Invalid email format')
});
/**
 * Password reset schema
 */
export const resetPasswordSchema = z.object({
    token: z.string()
        .min(1, 'Token is required'),
    password: z.string()
        .min(6, 'Password must be at least 6 characters')
        .regex(/[0-9]/, 'Password must contain at least one number')
});
/**
 * Change password schema
 */
export const changePasswordSchema = z.object({
    currentPassword: z.string()
        .min(1, 'Current password is required'),
    newPassword: z.string()
        .min(6, 'New password must be at least 6 characters')
        .regex(/[0-9]/, 'New password must contain at least one number')
});
/**
 * Email verification schema
 */
export const verifyEmailSchema = z.object({
    token: z.string()
        .min(1, 'Token is required')
});
/**
 * Refresh token schema
 */
export const refreshTokenSchema = z.object({
    refreshToken: z.string()
        .min(1, 'Refresh token is required')
});
/**
 * Logout schema
 */
export const logoutSchema = z.object({
    refreshToken: z.string()
        .min(1, 'Refresh token is required')
});
/**
 * Schema map for easy access
 */
export const schemas = {
    signup: signupSchema,
    login: loginSchema,
    forgotPassword: forgotPasswordSchema,
    resetPassword: resetPasswordSchema,
    changePassword: changePasswordSchema,
    verifyEmail: verifyEmailSchema,
    refreshToken: refreshTokenSchema,
    logout: logoutSchema
};
