"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleGoogleCallback = exports.getGoogleAuthUrl = void 0;
const google_auth_library_1 = require("google-auth-library");
const index_js_1 = require("../../models/index.js");
const oauth_js_1 = require("../../config/oauth.js");
const jwt_js_1 = require("../../utils/jwt.js");
const ErrorResponseBuilder_js_1 = require("../../shared/errors/ErrorResponseBuilder.js");
let oAuth2Client;
function getOAuthClient() {
    if (!oAuth2Client) {
        const { clientId, clientSecret } = (0, oauth_js_1.getGoogleCredentials)();
        oAuth2Client = new google_auth_library_1.OAuth2Client(clientId, clientSecret, oauth_js_1.GOOGLE_REDIRECT_URI);
    }
    return oAuth2Client;
}
const getGoogleAuthUrl = async (req, res, next) => {
    try {
        const { clientId, clientSecret } = (0, oauth_js_1.getGoogleCredentials)();
        if (!clientId || !clientSecret) {
            console.error('Google OAuth credentials not configured');
            return next(ErrorResponseBuilder_js_1.errorBuilders.serverError(req, new Error('OAuth configuration error')));
        }
        // Generate state token and nonce
        const { state, nonce } = (0, oauth_js_1.generateStateToken)();
        // Generate the authorization URL
        const authUrl = getOAuthClient().generateAuthUrl({
            access_type: 'offline',
            scope: oauth_js_1.GOOGLE_SCOPES,
            state: state,
            prompt: 'consent'
        });
        res.json({
            authUrl,
            state,
            nonce,
            expiresIn: 600, // 10 minutes in seconds
            scope: oauth_js_1.GOOGLE_SCOPES.join(' ')
        });
    }
    catch (error) {
        console.error('Google OAuth URL generation error:', error);
        return next(ErrorResponseBuilder_js_1.errorBuilders.serverError(req, error instanceof Error ? error : new Error('Internal server error')));
    }
};
exports.getGoogleAuthUrl = getGoogleAuthUrl;
const handleGoogleCallback = async (req, res, next) => {
    try {
        const { state, code, error, nonce } = req.query;
        // Handle OAuth errors
        if (error) {
            console.error('Google OAuth error:', error);
            return next(ErrorResponseBuilder_js_1.errorBuilders.badRequest(req, `OAuth authentication failed: ${error}`));
        }
        // Validate required parameters
        const missingParams = {
            code: !code ? "Missing required query parameter: code" : null,
            state: !state ? "Missing required query parameter: state" : null
        };
        // Filter out null values
        const missingDetails = Object.fromEntries(Object.entries(missingParams).filter(([_, v]) => v !== null));
        // If any required parameters are missing, return validation error
        if (Object.keys(missingDetails).length > 0) {
            return next(ErrorResponseBuilder_js_1.errorBuilders.validationError(req, missingDetails));
        }
        // Validate state token type
        if (typeof state !== 'string') {
            return next(ErrorResponseBuilder_js_1.errorBuilders.badRequest(req, 'Invalid state parameter type'));
        }
        // Type check code parameter
        if (typeof code !== 'string') {
            return next(ErrorResponseBuilder_js_1.errorBuilders.badRequest(req, 'Invalid code parameter type'));
        }
        // Validate state token and nonce (if provided)
        if (!(0, oauth_js_1.validateStateToken)(state, nonce)) {
            console.error('Invalid or expired state token');
            return next(ErrorResponseBuilder_js_1.errorBuilders.badRequest(req, 'Invalid state parameter (expired or tampered)'));
        }
        // Exchange authorization code for tokens
        const client = getOAuthClient();
        try {
            const { tokens } = await client.getToken(code);
            client.setCredentials(tokens);
            if (!tokens.id_token) {
                return next(ErrorResponseBuilder_js_1.errorBuilders.serverError(req, new Error('No ID token returned from Google')));
            }
            // Verify ID token and get user info
            const { clientId } = (0, oauth_js_1.getGoogleCredentials)();
            const ticket = await client.verifyIdToken({
                idToken: tokens.id_token,
                audience: clientId
            });
            const userPayload = ticket.getPayload();
            if (!userPayload) {
                return next(ErrorResponseBuilder_js_1.errorBuilders.serverError(req, new Error('Failed to parse ID token payload')));
            }
            if (!userPayload.email) {
                return next(ErrorResponseBuilder_js_1.errorBuilders.badRequest(req, 'Email missing from OAuth response'));
            }
            if (!userPayload.email_verified) {
                return next(ErrorResponseBuilder_js_1.errorBuilders.badRequest(req, 'Email not verified with Google'));
            }
            try {
                // Check if user exists
                let user = await index_js_1.queries.getUserByEmail(userPayload.email);
                let isNewUser = false;
                if (!user) {
                    isNewUser = true;
                    // Create new user with Google profile data
                    user = await index_js_1.queries.createUser(userPayload.email, null, // No password for Google users
                    userPayload.name || userPayload.email.split('@')[0], userPayload.sub, // Google ID
                    userPayload.picture || undefined);
                    console.log('New user registered via Google:', user.id);
                }
                else {
                    // Update existing user's Google profile info if needed
                    if (user.google_id !== userPayload.sub ||
                        user.name !== userPayload.name ||
                        user.picture_url !== userPayload.picture) {
                        // Update user profile using queries
                        await index_js_1.queries.updateUserProfile(user.id, {
                            googleId: userPayload.sub,
                            name: userPayload.name || undefined,
                            pictureUrl: userPayload.picture || undefined
                        });
                    }
                    console.log('Existing user logged in via Google:', user.id);
                }
                // Generate application tokens with required claims
                const [accessToken, refreshToken] = await Promise.all([
                    (0, jwt_js_1.generateAccessToken)(user.id, user.email, user.name, user.email_verified),
                    (0, jwt_js_1.generateRefreshToken)(user.id, user.email)
                ]);
                // Store refresh token
                const expiresAt = new Date();
                expiresAt.setDate(expiresAt.getDate() + 7); // 7 days from now
                await index_js_1.queries.createRefreshToken(user.id, refreshToken, expiresAt);
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
                return next(ErrorResponseBuilder_js_1.errorBuilders.serverError(req, dbError instanceof Error ? dbError : new Error('Failed to process authentication')));
            }
        }
        catch (tokenError) {
            console.error('Token exchange error:', tokenError);
            return next(ErrorResponseBuilder_js_1.errorBuilders.badRequest(req, 'Failed to exchange code for tokens'));
        }
    }
    catch (error) {
        console.error('Google OAuth callback error:', error);
        if (error instanceof Error && error.message.includes('Invalid Value')) {
            return next(ErrorResponseBuilder_js_1.errorBuilders.badRequest(req, 'Invalid OAuth callback parameters'));
        }
        return next(ErrorResponseBuilder_js_1.errorBuilders.serverError(req, error instanceof Error ? error : new Error('Internal server error')));
    }
};
exports.handleGoogleCallback = handleGoogleCallback;
//# sourceMappingURL=oauth.controller.js.map