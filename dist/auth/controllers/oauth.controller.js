import { OAuth2Client } from 'google-auth-library';
import { queries } from '../models/index.js';
import { getGoogleCredentials, GOOGLE_REDIRECT_URI, GOOGLE_SCOPES, generateStateToken } from '../../config/oauth.js';
import { generateAccessToken, generateRefreshToken } from '../../utils/jwt.js';
import { errorBuilders } from '../errors/factory.js';
let oAuth2Client;
function getOAuthClient() {
    if (!oAuth2Client) {
        const { clientId, clientSecret } = getGoogleCredentials();
        oAuth2Client = new OAuth2Client(clientId, clientSecret, GOOGLE_REDIRECT_URI);
    }
    return oAuth2Client;
}
export const getGoogleAuthUrl = async (req, res, next) => {
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
    }
    catch (error) {
        console.error('Google OAuth URL generation error:', error);
        return next(errorBuilders.serverError(req, error instanceof Error ? error : new Error('Internal server error')));
    }
};
export const handleGoogleCallback = async (req, res, next) => {
    try {
        const { code, state, error } = req.query;
        // Handle OAuth errors
        if (error) {
            console.error('Google OAuth error:', error);
            return next(errorBuilders.badRequest(req, `Google OAuth error: ${error}`));
        }
        // Validate required parameters
        if (!code) {
            return next(errorBuilders.badRequest(req, 'Authorization code is required'));
        }
        try {
            // Exchange code for tokens
            const oauth2Client = getOAuthClient();
            const { tokens } = await oauth2Client.getToken(code);
            if (!tokens.id_token) {
                return next(errorBuilders.badRequest(req, 'No ID token returned from Google'));
            }
            // Verify the ID token
            const client = new OAuth2Client();
            const ticket = await client.verifyIdToken({
                idToken: tokens.id_token,
                audience: oauth2Client._clientId,
            });
            const userPayload = ticket.getPayload();
            if (!userPayload || !userPayload.email) {
                return next(errorBuilders.badRequest(req, 'Invalid user data from Google'));
            }
            try {
                // Check if user exists
                let user = await queries.getUserByEmail(userPayload.email);
                let isNewUser = false;
                if (!user) {
                    isNewUser = true;
                    // Create new user with Google profile data
                    user = await queries.createUser(userPayload.email, null, // No password for Google users
                    userPayload.sub, // Google ID
                    userPayload.picture || undefined);
                    console.log('New user registered via Google:', user.id);
                }
                else {
                    // Update existing user's Google profile info if needed
                    if (user.google_id !== userPayload.sub ||
                        user.picture_url !== userPayload.picture) {
                        // Update user profile using queries
                        await queries.updateUserProfile(user.id, {
                            googleId: userPayload.sub,
                            pictureUrl: userPayload.picture || undefined
                        });
                    }
                    console.log('Existing user logged in via Google:', user.id);
                }
                // Generate application tokens with required claims
                const [accessToken, refreshToken] = await Promise.all([
                    generateAccessToken(user.id, user.email, user.email_verified),
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
                        picture: user.picture_url,
                        firstLogin: isNewUser
                    },
                    accessToken,
                    refreshToken
                });
            }
            catch (dbError) {
                console.error('Database error during Google authentication:', dbError);
                return next(errorBuilders.serverError(req, dbError instanceof Error ? dbError : new Error('Failed to process authentication')));
            }
        }
        catch (tokenError) {
            console.error('Token exchange error:', tokenError);
            return next(errorBuilders.badRequest(req, 'Failed to exchange code for tokens'));
        }
    }
    catch (error) {
        console.error('Google OAuth callback error:', error);
        if (error instanceof Error && error.message.includes('Invalid Value')) {
            return next(errorBuilders.badRequest(req, 'Invalid OAuth callback parameters'));
        }
        return next(errorBuilders.serverError(req, error instanceof Error ? error : new Error('Internal server error')));
    }
};
