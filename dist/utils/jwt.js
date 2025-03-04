import jwt from 'jsonwebtoken';
import { getJwtSecret, ACCESS_TOKEN_EXPIRES_IN, REFRESH_TOKEN_EXPIRES_IN } from '../config/jwt.js';
export const generateEmailVerificationToken = async (sub, email) => {
    const secret = await getJwtSecret();
    return jwt.sign({
        sub,
        email,
        type: 'email_verification'
    }, secret, { expiresIn: '24h' });
};
export const generateAccessToken = async (sub, email, name, emailVerified = false) => {
    const secret = await getJwtSecret();
    return jwt.sign({
        sub,
        email,
        name: name || email.split('@')[0],
        email_verified: emailVerified,
        type: 'access'
    }, secret, { expiresIn: ACCESS_TOKEN_EXPIRES_IN });
};
export const generateRefreshToken = async (sub, email) => {
    const secret = await getJwtSecret();
    return jwt.sign({
        sub,
        email,
        type: 'refresh'
    }, secret, { expiresIn: REFRESH_TOKEN_EXPIRES_IN });
};
