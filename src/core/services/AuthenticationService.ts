import { User } from '../entities/User';
import { JwtPayload } from '../entities/Token';

/**
 * Interface for authentication service
 */
export interface AuthenticationService {
  /**
   * Authenticate a user with email and password
   */
  login(email: string, password: string): Promise<{
    user: User;
    accessToken: string;
    refreshToken: string;
  }>;
  
  /**
   * Refresh an access token using a refresh token
   */
  refreshToken(refreshToken: string): Promise<{
    accessToken: string;
    refreshToken: string;
  }>;
  
  /**
   * Logout a user by revoking their refresh token
   */
  logout(refreshToken: string): Promise<void>;
  
  /**
   * Revoke all refresh tokens for a user
   */
  revokeAllSessions(userId: string): Promise<void>;
  
  /**
   * Verify an access token
   */
  verifyAccessToken(token: string): Promise<JwtPayload>;
  
  /**
   * Handle Google OAuth authentication
   */
  handleGoogleAuth(code: string): Promise<{
    user: User;
    accessToken: string;
    refreshToken: string;
    isNewUser: boolean;
  }>;
}