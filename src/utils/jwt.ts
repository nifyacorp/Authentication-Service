import jwt from 'jsonwebtoken';
import { JWT_SECRET, ACCESS_TOKEN_EXPIRES_IN, REFRESH_TOKEN_EXPIRES_IN } from '../config/jwt.js';

export const generateEmailVerificationToken = (sub: string, email: string): string => {
  return jwt.sign(
    { 
      sub,
      email,
      type: 'email_verification'
    },
    JWT_SECRET,
    { expiresIn: '24h' }
  );
};

export const generateAccessToken = (sub: string): string => {
  return jwt.sign({ sub, type: 'access' }, JWT_SECRET, { expiresIn: ACCESS_TOKEN_EXPIRES_IN });
};

export const generateRefreshToken = (sub: string): string => {
  return jwt.sign({ sub, type: 'refresh' }, JWT_SECRET, { expiresIn: REFRESH_TOKEN_EXPIRES_IN });
};