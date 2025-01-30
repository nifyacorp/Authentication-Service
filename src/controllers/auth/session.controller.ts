import { Response } from 'express';
import jwt from 'jsonwebtoken';
import { getJwtSecret } from '../../config/jwt.js';
import { generateAccessToken, generateRefreshToken } from '../../utils/jwt.js';
import { queries } from '../../models/index.js';
import { AuthRequest, RefreshTokenBody } from './types.js';

export const logout = async (req: AuthRequest, res: Response) => {
  try {
    console.log('Processing logout request');
    const authHeader = req.headers.authorization;
    
    if (!authHeader?.startsWith('Bearer ')) {
      console.log('Missing or invalid authorization header');
      return res.status(401).json({ message: 'Missing or invalid token' });
    }
    
    const token = authHeader.split(' ')[1];
    
    try {
      const secret = await getJwtSecret();
      const decoded = jwt.verify(token, secret) as { sub: string, type: string };

      // Verify token type
      if (decoded.type !== 'access') {
        console.log('Invalid token type for logout');
        return res.status(401).json({ message: 'Invalid token type' });
      }
      
      // Get user from database to verify existence
      const user = await queries.getUserById(decoded.sub);
      if (!user) {
        console.log('User not found for logout:', decoded.sub);
        return res.status(401).json({ message: 'Invalid token' });
      }

      // Revoke all refresh tokens for the user
      await queries.revokeAllUserRefreshTokens(decoded.sub);
      
      console.log(`User ${decoded.sub} logged out successfully`);
      
      res.status(200).json({ message: 'Logged out successfully' });
    } catch (jwtError) {
      console.log('JWT verification failed:', jwtError);
      return res.status(401).json({ message: 'Invalid or expired token' });
    }
  } catch (error) {
    console.error('Logout error:', error);
    if (error instanceof Error) {
      res.status(500).json({ 
        message: 'Internal server error',
        error: error.message 
      });
    } else {
      res.status(500).json({ message: 'Internal server error' });
    }
  }
};

export const refreshToken = async (req: AuthRequest<any, any, RefreshTokenBody>, res: Response) => {
  try {
    console.log('Processing refresh token request');
    const { refreshToken } = req.body;
    
    if (!refreshToken) {
      console.log('Missing refresh token');
      return res.status(400).json({ message: 'Refresh token is required' });
    }
    
    try {
      const secret = await getJwtSecret();
      // Verify the refresh token's JWT format and type
      const decoded = jwt.verify(refreshToken, secret) as { sub: string, type: string, email: string };
      
      if (decoded.type !== 'refresh') {
        console.log('Invalid token type for refresh');
        return res.status(401).json({ message: 'Invalid token type' });
      }
      
      // Check if the refresh token exists and is valid in the database
      const storedToken = await queries.getRefreshToken(refreshToken);
      
      if (!storedToken) {
        console.log('Refresh token not found or revoked');
        return res.status(401).json({ message: 'Invalid or expired refresh token' });
      }
      
      // Check if the token has expired
      if (new Date() > new Date(storedToken.expires_at)) {
        console.log('Refresh token has expired');
        await queries.revokeRefreshToken(refreshToken);
        return res.status(401).json({ message: 'Refresh token has expired' });
      }
      
      // Get the user
      const user = await queries.getUserById(decoded.sub);
      
      if (!user) {
        console.log('User not found for refresh token:', decoded.sub);
        await queries.revokeRefreshToken(refreshToken);
        return res.status(401).json({ message: 'User not found' });
      }
      
      // Generate new tokens with required claims
      const [newAccessToken, newRefreshToken] = await Promise.all([
        generateAccessToken(user.id, user.email, user.name, user.email_verified),
        generateRefreshToken(user.id, user.email)
      ]);
      
      // Revoke the old refresh token
      await queries.revokeRefreshToken(refreshToken);
      
      // Store the new refresh token
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7); // 7 days from now
      await queries.createRefreshToken(user.id, newRefreshToken, expiresAt);
      
      console.log(`Tokens refreshed successfully for user: ${user.id}`);
      
      res.json({
        accessToken: newAccessToken,
        refreshToken: newRefreshToken
      });
    } catch (jwtError) {
      console.log('JWT verification failed:', jwtError);
      return res.status(401).json({ message: 'Invalid refresh token' });
    }
    
  } catch (error) {
    console.error('Refresh token error:', error);
    if (error instanceof Error) {
      res.status(500).json({ 
        message: 'Internal server error',
        error: error.message 
      });
    } else {
      res.status(500).json({ message: 'Internal server error' });
    }
  }
};

export const revokeAllSessions = async (req: AuthRequest, res: Response) => {
  try {
    console.log('Processing revoke all sessions request');
    const authHeader = req.headers.authorization;
    
    if (!authHeader?.startsWith('Bearer ')) {
      console.log('Missing or invalid authorization header');
      return res.status(401).json({ message: 'Missing or invalid token' });
    }
    
    const token = authHeader.split(' ')[1];
    
    try {
      const secret = await getJwtSecret();
      // Verify and decode the access token
      const decoded = jwt.verify(token, secret) as { sub: string, type: string };
      
      // Verify token type
      if (decoded.type !== 'access') {
        console.log('Invalid token type for session revocation');
        return res.status(401).json({ message: 'Invalid token type' });
      }
      
      // Verify user exists
      const user = await queries.getUserById(decoded.sub);
      if (!user) {
        console.log('User not found:', decoded.sub);
        return res.status(404).json({ message: 'User not found' });
      }
      
      // Revoke all refresh tokens for the user
      await queries.revokeAllUserRefreshTokens(decoded.sub);
      
      console.log(`All sessions revoked for user: ${decoded.sub}`);
      
      res.json({ 
        message: 'All sessions have been revoked successfully',
        timestamp: new Date().toISOString()
      });
    } catch (jwtError) {
      console.log('JWT verification failed:', jwtError);
      return res.status(401).json({ message: 'Invalid or expired token' });
    }
  } catch (error) {
    console.error('Revoke all sessions error:', error);
    if (error instanceof Error) {
      res.status(500).json({ 
        message: 'Internal server error',
        error: error.message 
      });
    } else {
      res.status(500).json({ message: 'Internal server error' });
    }
  }
};