import { z } from 'zod';
export const signupSchema = z.object({
    email: z.string().email('Invalid email format'),
    password: z.string()
        .min(6, 'Password must be at least 6 characters')
        .regex(/[0-9]/, 'Password must contain at least one number'),
    name: z.string()
        .min(2, 'Name must be at least 2 characters')
        .max(50, 'Name must not exceed 50 characters')
        .regex(/^[A-Za-z0-9._\s]+$/, 'Name can only contain letters, numbers, dots, underscores, and spaces')
        .optional()
        .default('')
});
export const loginSchema = z.object({
    email: z.string().email('Invalid email format'),
    password: z.string().min(1, 'Password is required')
});
