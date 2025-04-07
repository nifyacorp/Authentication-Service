import { OAuth2Client } from 'google-auth-library';
import { createInternalError } from '../../core/errors/AppError';

/**
 * Interface for OAuth user profile from Google
 */
export interface GoogleUserProfile {
  id: string;
  email: string;
  verified_email: boolean;
  name?: string;
  given_name?: string;
  family_name?: string;
  picture?: string;
  locale?: string;
}

/**
 * Google OAuth integration service
 */
export class GoogleOAuthService {
  private client: OAuth2Client;
  private readonly redirectUri: string;

  constructor(clientId: string, clientSecret: string, redirectUri: string) {
    this.client = new OAuth2Client(clientId, clientSecret, redirectUri);
    this.redirectUri = redirectUri;
  }

  /**
   * Generate the authorization URL for Google OAuth
   */
  public generateAuthUrl(state: string): string {
    return this.client.generateAuthUrl({
      access_type: 'offline',
      scope: [
        'https://www.googleapis.com/auth/userinfo.email',
        'https://www.googleapis.com/auth/userinfo.profile'
      ],
      prompt: 'consent',
      state
    });
  }

  /**
   * Exchange authorization code for tokens
   */
  public async getTokens(code: string): Promise<{
    access_token: string;
    refresh_token?: string;
    id_token?: string;
    expiry_date: number;
  }> {
    try {
      const { tokens } = await this.client.getToken(code);
      
      if (!tokens.access_token) {
        throw new Error('No access token returned from Google');
      }
      
      return {
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        id_token: tokens.id_token,
        expiry_date: tokens.expiry_date || 0
      };
    } catch (error) {
      console.error('Error getting tokens from Google:', error);
      throw createInternalError('Failed to get tokens from Google', { error });
    }
  }

  /**
   * Get user profile from Google
   */
  public async getUserProfile(accessToken: string): Promise<GoogleUserProfile> {
    try {
      // Set credentials
      this.client.setCredentials({ access_token: accessToken });
      
      // Fetch user profile
      const response = await fetch(
        'https://www.googleapis.com/oauth2/v1/userinfo?alt=json',
        {
          headers: {
            Authorization: `Bearer ${accessToken}`
          }
        }
      );
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to get user profile: ${response.status} ${errorText}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error getting user profile from Google:', error);
      throw createInternalError('Failed to get user profile from Google', { error });
    }
  }

  /**
   * Verify an ID token
   */
  public async verifyIdToken(idToken: string): Promise<{
    userId: string;
    email: string;
    emailVerified: boolean;
    name?: string;
  }> {
    try {
      const ticket = await this.client.verifyIdToken({
        idToken,
        audience: this.client.clientId_
      });
      
      const payload = ticket.getPayload();
      
      if (!payload || !payload.sub || !payload.email) {
        throw new Error('Invalid ID token payload');
      }
      
      return {
        userId: payload.sub,
        email: payload.email,
        emailVerified: payload.email_verified || false,
        name: payload.name
      };
    } catch (error) {
      console.error('Error verifying ID token:', error);
      throw createInternalError('Failed to verify ID token', { error });
    }
  }
}