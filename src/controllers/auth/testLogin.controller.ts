import { Request, Response, NextFunction } from 'express';
import { generateAccessToken, generateRefreshToken } from '../../utils/jwt.js';
import { LoginBody } from './types.js';

export const testLogin = async (req: Request<{}, {}, LoginBody>, res: Response, next: NextFunction) => {
  try {
    console.log('Checking for test account login');
    const { email, password } = req.body;
    
    // Special case for test account
    if (email === 'nifyacorp@gmail.com' && password === 'nifyaCorp12!') {
      console.log('Test account login detected - providing direct access');
      
      // Generate tokens for test account
      const testUserId = '1';
      const [accessToken, refreshToken] = await Promise.all([
        generateAccessToken(testUserId, email, 'NIFYA Test User', true),
        generateRefreshToken(testUserId, email)
      ]);
      
      // Return success response for test account
      return res.json({
        accessToken,
        refreshToken,
        user: {
          id: testUserId,
          email: email,
          name: 'NIFYA Test User',
          email_verified: true
        }
      });
    }
    
    // If not test account, call next middleware
    return next();
  } catch (error) {
    console.error('Test login error:', error);
    next(error);
  }
};