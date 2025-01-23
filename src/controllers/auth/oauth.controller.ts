import { Request, Response } from 'express';
import { OAuth2Client, TokenPayload } from 'google-auth-library';
import crypto from 'crypto';
import { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI, GOOGLE_SCOPES } from '../../config/oauth.js';
import { generateAccessToken, generateRefreshToken } from '../../utils/jwt.js';

const oAuth2Client = new OAuth2Client(
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  GOOGLE_REDIRECT_URI
);

// In-memory state storage (replace with Redis/database in production)
const stateStore = new Map<string, { timestamp: number }>();

// Clean up expired states periodically
setInterval(() => {
  const now = Date.now();
  for (const [state, data] of stateStore.entries()) {
    if (now - data.timestamp > 10 * 60 * 1000) { // 10 minutes
      stateStore.delete(state);
    }
  }
}, 60 * 1000); // Clean up every minute

export const getGoogleAuthUrl = async (req: Request, res: Response) => {
  try {
    if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
      console.error('Google OAuth credentials not configured');
      return res.status(500).json({ message: 'OAuth configuration error' });
    }

    // Generate a random state token
    const state = crypto.randomBytes(32).toString('hex');

    // Store the state token with timestamp
    stateStore.set(state, { timestamp: Date.now() });

    // Generate the authorization URL
    const authorizeUrl = oAuth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: GOOGLE_SCOPES,
      state: state,
      prompt: 'consent'
    });

    res.json({ authUrl: authorizeUrl });
  } catch (error) {
    console.error('Google OAuth URL generation error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const handleGoogleCallback = async (req: Request, res: Response) => {
  try {
    const { state, code, error } = req.query;

    // Handle OAuth errors
    if (error) {
      console.error('Google OAuth error:', error);
      return res.status(400).json({ message: 'OAuth authentication failed' });
    }

    // Validate state parameter
    if (!state || !stateStore.has(state as string)) {
      return res.status(400).json({ message: 'Invalid state parameter' });
    }

    // Clean up used state
    stateStore.delete(state as string);

    if (!code) {
      return res.status(400).json({ message: 'Authorization code is required' });
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
      // TODO: Replace with actual database operations
      // Check if user exists
      let user = {
        id: 'user-id',
        email: payload.email,
        name: payload.name || '',
        picture: payload.picture || '',
        emailVerified: true,
        googleId: payload.sub,
        firstLogin: false
      };

      const isNewUser = false; // This would be determined by the database query

      if (isNewUser) {
        // Create new user
        user = {
          id: crypto.randomUUID(),
          email: payload.email,
          name: payload.name || '',
          picture: payload.picture || '',
          emailVerified: true,
          googleId: payload.sub,
          firstLogin: true
        };

        // TODO: Save new user to database
        console.log('New user registered via Google:', user.id);

        try {
          // TODO: Send welcome email
          // await sendEmail({
          //   to: user.email,
          //   subject: 'Welcome to Our Platform',
          //   template: 'welcome',
          //   context: { name: user.name }
          // });
        } catch (emailError) {
          // Log but don't fail the request
          console.error('Failed to send welcome email:', emailError);
        }
      } else {
        // TODO: Update existing user's Google-related info
        console.log('Existing user logged in via Google:', user.id);
      }

      // Generate application tokens
      const accessToken = generateAccessToken(user.id);
      const refreshToken = generateRefreshToken(user.id);

      // TODO: Save refresh token to database
      // await db.refreshToken.create({
      //   data: {
      //     token: refreshToken,
      //     userId: user.id
      //   }
      // });

      // Return user data and tokens
      res.json({
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          picture: user.picture,
          firstLogin: user.firstLogin
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