"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.STATE_TOKEN_EXPIRY = exports.STATE_TOKEN_BYTES = exports.GOOGLE_SCOPES = exports.GOOGLE_REDIRECT_URI = void 0;
exports.initializeOAuthConfig = initializeOAuthConfig;
exports.getGoogleCredentials = getGoogleCredentials;
exports.generateStateToken = generateStateToken;
exports.validateStateToken = validateStateToken;
const dotenv_1 = require("dotenv");
const crypto_1 = __importDefault(require("crypto"));
const secret_manager_1 = require("@google-cloud/secret-manager");
(0, dotenv_1.config)();
const secretManagerClient = new secret_manager_1.SecretManagerServiceClient();
async function getSecret(secretName) {
    try {
        const name = `projects/delta-entity-447812-p2/secrets/${secretName}/versions/latest`;
        const [version] = await secretManagerClient.accessSecretVersion({ name });
        if (!version.payload?.data) {
            throw new Error(`Failed to retrieve ${secretName} from Secret Manager`);
        }
        return version.payload.data.toString();
    }
    catch (error) {
        console.error(`Failed to retrieve ${secretName}:`, error);
        throw error;
    }
}
let GOOGLE_CLIENT_ID = '';
let GOOGLE_CLIENT_SECRET = '';
async function initializeOAuthConfig() {
    try {
        [GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET] = await Promise.all([
            getSecret('OAUTH_CLIENT'),
            getSecret('OAUTH_SECRET')
        ]);
        console.log('OAuth configuration initialized successfully');
    }
    catch (error) {
        console.error('Failed to initialize OAuth configuration:', error);
        throw error;
    }
}
function getGoogleCredentials() {
    if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
        throw new Error('OAuth credentials not initialized');
    }
    return {
        clientId: GOOGLE_CLIENT_ID,
        clientSecret: GOOGLE_CLIENT_SECRET
    };
}
exports.GOOGLE_REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/api/auth/google/callback';
// OAuth scopes for user profile and email
exports.GOOGLE_SCOPES = [
    'openid', // Required for OpenID Connect
    'email', // User's email address
    'profile', // Basic profile information
    'https://www.googleapis.com/auth/userinfo.email', // Email address (read-only)
    'https://www.googleapis.com/auth/userinfo.profile' // Basic profile info (read-only)
];
// State token configuration
exports.STATE_TOKEN_BYTES = 32; // 256 bits
exports.STATE_TOKEN_EXPIRY = 10 * 60 * 1000; // 10 minutes in milliseconds
// In-memory state store (replace with Redis in production)
const stateStore = new Map();
// Clean up expired states periodically
setInterval(() => {
    const now = Date.now();
    for (const [state, data] of stateStore.entries()) {
        if (now - data.timestamp > exports.STATE_TOKEN_EXPIRY) {
            stateStore.delete(state);
        }
    }
}, 60 * 1000); // Clean up every minute
function generateStateToken() {
    // Generate random state token
    const stateToken = crypto_1.default.randomBytes(exports.STATE_TOKEN_BYTES).toString('hex');
    // Generate nonce for additional security
    const nonce = crypto_1.default.randomBytes(16).toString('hex');
    // Store state data
    stateStore.set(stateToken, {
        timestamp: Date.now(),
        nonce
    });
    return { state: stateToken, nonce };
}
function validateStateToken(state, nonce) {
    const stateData = stateStore.get(state);
    if (!stateData) {
        return false;
    }
    // Check expiration
    if (Date.now() - stateData.timestamp > exports.STATE_TOKEN_EXPIRY) {
        stateStore.delete(state);
        return false;
    }
    // If nonce is provided, verify it matches
    if (nonce && nonce !== stateData.nonce) {
        return false;
    }
    // Clean up used state
    stateStore.delete(state);
    return true;
}
//# sourceMappingURL=oauth.js.map