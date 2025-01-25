import jwt from 'jsonwebtoken';
import { getJwtSecret, ACCESS_TOKEN_EXPIRES_IN, REFRESH_TOKEN_EXPIRES_IN } from '../config/jwt.js';

export const generateEmailVerificationToken = async (sub: string, email: string): Promise<string> => {
  const secret = await getJwtSecret();
  return jwt.sign(
    { 
      sub,
      email,
      type: 'email_verification'
    },
    secret,
    { expiresIn: '24h' }
  );
};

export const generateAccessToken = async (sub: string): Promise<string> => {
  const secret = await getJwtSecret();
  return jwt.sign(
    { sub, type: 'access' },
    secret,
    { expiresIn: ACCESS_TOKEN_EXPIRES_IN }
  );
};

export const generateRefreshToken = async (sub: string): Promise<string> => {
  const secret = await getJwtSecret();
  return jwt.sign(
    { sub, type: 'refresh' },
    secret,
    { expiresIn: REFRESH_TOKEN_EXPIRES_IN }
  );
};