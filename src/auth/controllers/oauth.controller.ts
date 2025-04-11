import { Request, Response, NextFunction } from 'express';
import { OAuth2Client, TokenPayload } from 'google-auth-library';
import { queries } from '../models/index.js';
import { getJwtSecret } from '../../config/jwt.js';
import {
  getGoogleCredentials,
  GOOGLE_REDIRECT_URI, 
  GOOGLE_SCOPES,
  generateStateToken,
  validateStateToken
} from '../../config/oauth.js';
import { generateAccessToken, generateRefreshToken } from '../../utils/jwt.js';
import { formatErrorResponse, errorBuilders } from '../errors/factory.js';

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

export const getGoogleAuthUrl = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { clientId, clientSecret } = getGoogleCredentials();
    if (!clientId || !clientSecret) {
      console.error('Google OAuth credentials not configured');
      return next(errorBuilders.serverError(req, new Error('OAuth configuration error')));
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
    return next(errorBuilders.serverError(req, error instanceof Error ? error : new Error('Internal server error')));
  }
};

export const handleGoogleCallback = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { state, code, error, nonce } = req.query;

    // Handle OAuth errors
    if (error) {
      console.error('Google OAuth error:', error);
      return next(errorBuilders.badRequest(req, `OAuth authentication failed: ${error}`));
    }
    
    // Validate required parameters
    const missingParams = {
      code: !code ? "Missing required query parameter: code" : null,
      state: !state ? "Missing required query parameter: state" : null
    };
    
    // Filter out null values
    const missingDetails = Object.fromEntries(
      Object.entries(missingParams).filter(([_, v]) => v !== null)
    );
    
    // If any required parameters are missing, return validation error
    if (Object.keys(missingDetails).length > 0) {
      return next(errorBuilders.validationError(req, missingDetails));
    }

    // Validate state token type
    if (typeof state !== 'string') {
      return next(errorBuilders.badRequest(req, 'Invalid state parameter type'));
    }
    
    // Type check code parameter
    if (typeof code !== 'string') {
      return next(errorBuilders.badRequest(req, 'Invalid code parameter type'));
    }

    // Validate state token and nonce (if provided)
    if (!validateStateToken(state, nonce as string)) {
      console.error('Invalid or expired state token');
      return next(errorBuilders.badRequest(req, 'Invalid state parameter (expired or tampered)'));
    }

    // Exchange authorization code for tokens
    const client = getOAuthClient();
    
    try {
      const { tokens } = await client.getToken(code);
      client.setCredentials(tokens);
      
      if (!tokens.id_token) {
        return next(errorBuilders.serverError(req, new Error('No ID token returned from Google')));
      }
      
      // Verify ID token and get user info
      const { clientId } = getGoogleCredentials();
      const ticket = await client.verifyIdToken({
        idToken: tokens.id_token,
        audience: clientId
      });
      
      const userPayload = ticket.getPayload() as TokenPayload;
      if (!userPayload) {
        return next(errorBuilders.serverError(req, new Error('Failed to parse ID token payload')));
      }
      
      if (!userPayload.email) {
        return next(errorBuilders.badRequest(req, 'Email missing from OAuth response'));
      }
      
      if (!userPayload.email_verified) {
        return next(errorBuilders.badRequest(req, 'Email not verified with Google'));
      }
      
      try {
        // Check if user exists
        let user = await queries.getUserByEmail(userPayload.email);
        let isNewUser = false;

        if (!user) {
          isNewUser = true;
          // Create new user with Google profile data
          user = await queries.createUser(
            userPayload.email,
            null, // No password for Google users
            userPayload.name || userPayload.email.split('@')[0],
            userPayload.sub, // Google ID
            userPayload.picture || undefined
          );

          console.log('New user registered via Google:', user.id);
        } else {
          // Update existing user's Google profile info if needed
          if (
            user.google_id !== userPayload.sub ||
            user.name !== userPayload.name ||
            user.picture_url !== userPayload.picture
          ) {
            // Update user profile using queries
            await queries.updateUserProfile(user.id, {
              googleId: userPayload.sub,
              name: userPayload.name || undefined,
              pictureUrl: userPayload.picture || undefined
            });
          }
          console.log('Existing user logged in via Google:', user.id);
        }

        // Generate application tokens with required claims
        const [accessToken, refreshToken] = await Promise.all([
          generateAccessToken(user.id, user.email, user.name, user.email_verified),
          generateRefreshToken(user.id)
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
        return next(errorBuilders.serverError(req, dbError instanceof Error ? dbError : new Error('Failed to process authentication')));
      }
    } catch (tokenError) {
      console.error('Token exchange error:', tokenError);
      return next(errorBuilders.badRequest(req, 'Failed to exchange code for tokens'));
    }
  } catch (error) {
    console.error('Google OAuth callback error:', error);
    if (error instanceof Error && error.message.includes('Invalid Value')) {
      return next(errorBuilders.badRequest(req, 'Invalid OAuth callback parameters'));
    }
    return next(errorBuilders.serverError(req, error instanceof Error ? error : new Error('Internal server error')));
  }
};