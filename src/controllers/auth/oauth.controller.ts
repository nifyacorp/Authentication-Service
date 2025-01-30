import { Request, Response } from 'express';
import { OAuth2Client, TokenPayload } from 'google-auth-library';
import { queries } from '../../models/index.js';
import { getJwtSecret } from '../../config/jwt.js';
import {
  getGoogleCredentials,
  GOOGLE_REDIRECT_URI, 
  GOOGLE_SCOPES,
  generateStateToken,
  validateStateToken
} from '../../config/oauth.js';
import { generateAccessToken, generateRefreshToken } from '../../utils/jwt.js';

let oAuth2Client: OAuth2Client;

function getOAuthClient() {
  if (!oAuth2Client) {
    const { clientId, clientSecret } = getGoogleCredentials();
    oAuth2Client = new OAuth2Client(
      clientId,
      clientSecret,
      GOOGLE_REDIRECT_URI
    );
  }
  return oAuth2Client;
}

export const getGoogleAuthUrl = async (req: Request, res: Response) => {
  try {
    const { clientId, clientSecret } = getGoogleCredentials();
    if (!clientId || !clientSecret) {
      console.error('Google OAuth credentials not configured');
      return res.status(500).json({ message: 'OAuth configuration error' });
    }

    // Generate state token and nonce
    const { state, nonce } = generateStateToken();

    // Generate the authorization URL
    const authUrl = getOAuthClient().generateAuthUrl({
      access_type: 'offline',
      scope: GOOGLE_SCOPES,
      state: state,
      prompt: 'consent'
    });

    res.json({ 
      authUrl,
      state,
      nonce,
      expiresIn: 600, // 10 minutes in seconds
      scope: GOOGLE_SCOPES.join(' ')
    });
  } catch (error) {
    console.error('Google OAuth URL generation error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const handleGoogleCallback = async (req: Request, res: Response) => {
  try {
    const { state, code, error, nonce } = req.query;

    // Handle OAuth errors
    if (error) {
      console.error('Google OAuth error:', error);
      return res.status(400).json({ message: 'OAuth authentication failed' });
    }
    
    // Validate state parameter
    if (!state || typeof state !== 'string') {
      return res.status(400).json({ message: 'Missing state parameter' });
    }

    if (!code) {
      return res.status(400).json({ message: 'Missing authorization code' });
    }

    // Validate state token and nonce
    if (!validateStateToken(state, nonce as string)) {
      console.error('Invalid or expired state token');
      return res.status(400).json({ message: 'Invalid state parameter' });
    }

    // Exchange authorization code for tokens
    const client = getOAuthClient();
    const { tokens } = await client.getToken(code as string);
    client.setCredentials(tokens);

    const secret = await getJwtSecret();
    // Verify ID token and get user info
    const { clientId } = getGoogleCredentials();
    const ticket = await client.verifyIdToken({
      idToken: tokens.id_token!,
      audience: clientId
    });

    const payload = ticket.getPayload() as TokenPayload;
    if (!payload.email || !payload.email_verified) {
      return res.status(400).json({ message: 'Valid email is required' });
    }

    try {
      // Check if user exists
      let user = await queries.getUserByEmail(payload.email);
      let isNewUser = false;

      if (!user) {
        isNewUser = true;
        // Create new user with Google profile data
        user = await queries.createUser(
          payload.email,
          null, // No password for Google users
          payload.name || payload.email.split('@')[0],
          payload.sub, // Google ID
          payload.picture || undefined
        );

        console.log('New user registered via Google:', user.id);
      } else {
        // Update existing user's Google profile info if needed
        if (
          user.google_id !== payload.sub ||
          user.name !== payload.name ||
          user.picture_url !== payload.picture
        ) {
          // Update user profile using queries
          await queries.updateUserProfile(user.id, {
            googleId: payload.sub,
            name: payload.name || undefined,
            pictureUrl: payload.picture || undefined
          });
        }
        console.log('Existing user logged in via Google:', user.id);
      }

      // Generate application tokens with required claims
      const [accessToken, refreshToken] = await Promise.all([
        generateAccessToken(user.id, user.email, user.name, user.email_verified),
        generateRefreshToken(user.id, user.email)
      ]);

      // Store refresh token
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7); // 7 days from now
      await queries.createRefreshToken(user.id, refreshToken, expiresAt);

      // Return user data and tokens
      res.json({
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          picture: user.picture_url,
          firstLogin: isNewUser
        },
        accessToken,
        refreshToken
      });
    } catch (dbError) {
      console.error('Database error during Google authentication:', dbError);
      throw new Error('Failed to process authentication');
    }
  } catch (error) {
    console.error('Google OAuth callback error:', error);
    if (error instanceof Error && error.message.includes('Invalid Value')) {
      return res.status(400).json({ message: 'Invalid OAuth callback parameters' });
    }
    res.status(500).json({ message: 'Internal server error' });
  }
};