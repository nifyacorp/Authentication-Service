import { Request, Response } from 'express';
import { OAuth2Client, TokenPayload } from 'google-auth-library';
import { queries } from '../../models/index.js';
import { 
  GOOGLE_CLIENT_ID, 
  GOOGLE_CLIENT_SECRET, 
  GOOGLE_REDIRECT_URI, 
  GOOGLE_SCOPES,
  generateStateToken,
  validateStateToken
} from '../../config/oauth.js';
import { generateAccessToken, generateRefreshToken } from '../../utils/jwt.js';

const oAuth2Client = new OAuth2Client(
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  GOOGLE_REDIRECT_URI
);

export const getGoogleAuthUrl = async (req: Request, res: Response) => {
  try {
    if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
      console.error('Google OAuth credentials not configured');
      return res.status(500).json({ message: 'OAuth configuration error' });
    }

    // Generate state token and nonce
    const { state, nonce } = generateStateToken();

    // Generate the authorization URL
    const authUrl = oAuth2Client.generateAuthUrl({
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
    const { tokens } = await oAuth2Client.getToken(code as string);
    oAuth2Client.setCredentials(tokens);

    // Verify ID token and get user info
    const ticket = await oAuth2Client.verifyIdToken({
      idToken: tokens.id_token!,
      audience: GOOGLE_CLIENT_ID
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
          payload.name || payload.email.split('@')[0], // Use name or email prefix
          payload.sub, // Google ID
          payload.picture || null
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
            name: payload.name,
            pictureUrl: payload.picture
          });
        }
        console.log('Existing user logged in via Google:', user.id);
      }

      // Generate application tokens
      const accessToken = generateAccessToken(user.id);
      const refreshToken = generateRefreshToken(user.id);

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