import jwt, { SignOptions } from 'jsonwebtoken';
import { StringValue } from 'ms';

// JWT configuration
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '15m';
const REFRESH_TOKEN_EXPIRES_IN = process.env.REFRESH_TOKEN_EXPIRES_IN || '7d';

// Convert expiration time to seconds for client use
const getExpirationSeconds = (expirationString: string): number => {
  const unit = expirationString.slice(-1);
  const value = parseInt(expirationString.slice(0, -1));
  
  switch (unit) {
    case 's': return value;
    case 'm': return value * 60;
    case 'h': return value * 60 * 60;
    case 'd': return value * 24 * 60 * 60;
    default: return 900; // Default 15 minutes
  }
};

/**
 * Generate a JWT access token
 * 
 * @param userId User ID to include in the token
 * @param email User email to include in the token
 * @param emailVerified Whether the user's email is verified
 * @returns JWT access token
 */
export const generateAccessToken = async (
  userId: string,
  email: string,
  emailVerified: boolean = false
): Promise<string> => {
  const options: SignOptions = { };
  options.expiresIn = JWT_EXPIRES_IN as any;
  
  return jwt.sign(
    {
      sub: userId,
      email,
      email_verified: emailVerified,
      type: 'access'
    },
    JWT_SECRET,
    options
  );
};

/**
 * Generate a JWT refresh token
 * 
 * @param userId User ID to include in the token
 * @returns JWT refresh token
 */
export const generateRefreshToken = async (userId: string): Promise<string> => {
  const options: SignOptions = { };
  options.expiresIn = REFRESH_TOKEN_EXPIRES_IN as any;
  
  return jwt.sign(
    {
      sub: userId,
      type: 'refresh'
    },
    JWT_SECRET,
    options
  );
};

/**
 * Verify a JWT token
 * 
 * @param token JWT token to verify
 * @returns Decoded token payload or null if invalid
 */
export const verifyToken = async (token: string): Promise<jwt.JwtPayload | null> => {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as jwt.JwtPayload;
    return decoded;
  } catch (error) {
    console.error('JWT verification error:', error);
    return null;
  }
};

/**
 * Calculate token expiration date
 * 
 * @param expiresIn Expiration string (e.g., '15m', '7d')
 * @returns Expiration date
 */
export const calculateExpirationDate = (expiresIn: string): Date => {
  const seconds = getExpirationSeconds(expiresIn);
  return new Date(Date.now() + seconds * 1000);
};

/**
 * Get JWT expiration in seconds
 * 
 * @returns Expiration time in seconds
 */
export const getJwtExpirationSeconds = (): number => {
  return getExpirationSeconds(JWT_EXPIRES_IN);
};

export {
  JWT_SECRET,
  JWT_EXPIRES_IN,
  REFRESH_TOKEN_EXPIRES_IN
};