import jwt from 'jsonwebtoken';
import { JWT_SECRET, ACCESS_TOKEN_EXPIRES_IN, REFRESH_TOKEN_EXPIRES_IN } from '../config/jwt.js';

export const generateEmailVerificationToken = (userId: string, email: string): string => {
  return jwt.sign(
    { 
      userId,
      email,
      type: 'email_verification'
    },
    JWT_SECRET,
    { expiresIn: '24h' }
  );
};

export const generateAccessToken = (userId: string): string => {
  return jwt.sign({ userId, type: 'access' }, JWT_SECRET, { expiresIn: ACCESS_TOKEN_EXPIRES_IN });
};

export const generateRefreshToken = (userId: string): string => {
  return jwt.sign({ userId, type: 'refresh' }, JWT_SECRET, { expiresIn: REFRESH_TOKEN_EXPIRES_IN });
};