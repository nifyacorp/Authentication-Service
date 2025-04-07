import { OAuth2Client } from 'google-auth-library';
import { queries } from '../../models/index.js';
import { getJwtSecret } from '../../config/jwt.js';
import { getGoogleCredentials, GOOGLE_REDIRECT_URI, GOOGLE_SCOPES, generateStateToken, validateStateToken } from '../../config/oauth.js';
import { generateAccessToken, generateRefreshToken } from '../../utils/jwt.js';
import { errorBuilders } from '../../shared/errors/ErrorResponseBuilder.js';
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
        const { state, code, error, nonce } = req.query;
        // Handle OAuth errors
        if (error) {
            console.error('Google OAuth error:', error);
            return next(errorBuilders.badRequest(req, 'OAuth authentication failed'));
        }
        // Validate state parameter
        if (!state || typeof state !== 'string') {
            return next(errorBuilders.badRequest(req, 'Missing state parameter'));
        }
        if (!code) {
            return next(errorBuilders.badRequest(req, 'Missing authorization code'));
        }
        // Validate state token and nonce
        if (!validateStateToken(state, nonce)) {
            console.error('Invalid or expired state token');
            return next(errorBuilders.badRequest(req, 'Invalid state parameter'));
        }
        // Exchange authorization code for tokens
        const client = getOAuthClient();
        const { tokens } = await client.getToken(code);
        client.setCredentials(tokens);
        const secret = await getJwtSecret();
        // Verify ID token and get user info
        const { clientId } = getGoogleCredentials();
        const ticket = await client.verifyIdToken({
            idToken: tokens.id_token,
            audience: clientId
        });
        const payload = ticket.getPayload();
        if (!payload.email || !payload.email_verified) {
            return next(errorBuilders.badRequest(req, 'Valid email is required'));
        }
        try {
            // Check if user exists
            let user = await queries.getUserByEmail(payload.email);
            let isNewUser = false;
            if (!user) {
                isNewUser = true;
                // Create new user with Google profile data
                user = await queries.createUser(payload.email, null, // No password for Google users
                payload.name || payload.email.split('@')[0], payload.sub, // Google ID
                payload.picture || undefined);
                console.log('New user registered via Google:', user.id);
            }
            else {
                // Update existing user's Google profile info if needed
                if (user.google_id !== payload.sub ||
                    user.name !== payload.name ||
                    user.picture_url !== payload.picture) {
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
        }
        catch (dbError) {
            console.error('Database error during Google authentication:', dbError);
            return next(errorBuilders.serverError(req, dbError instanceof Error ? dbError : new Error('Failed to process authentication')));
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
