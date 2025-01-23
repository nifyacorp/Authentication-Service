import { config } from 'dotenv';

config();

export const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
export const ACCESS_TOKEN_EXPIRES_IN = '15m';
export const REFRESH_TOKEN_EXPIRES_IN = '7d';
export const MAX_LOGIN_ATTEMPTS = 5;
export const LOCK_TIME = 15 * 60 * 1000; // 15 minutes in milliseconds
export const RESET_TOKEN_EXPIRES_IN = '1h';
export const MAX_PASSWORD_RESET_REQUESTS = 3; // Maximum requests per hour
export const PASSWORD_RESET_WINDOW = 60 * 60 * 1000; // 1 hour in milliseconds