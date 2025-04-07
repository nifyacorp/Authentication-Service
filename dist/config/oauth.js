import { config } from 'dotenv';
import crypto from 'crypto';
import { SecretManagerServiceClient } from '@google-cloud/secret-manager';
config();
const secretManagerClient = new SecretManagerServiceClient();
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
export async function initializeOAuthConfig() {
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
export function getGoogleCredentials() {
    if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
        throw new Error('OAuth credentials not initialized');
    }
    return {
        clientId: GOOGLE_CLIENT_ID,
        clientSecret: GOOGLE_CLIENT_SECRET
    };
}
export const GOOGLE_REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/api/auth/google/callback';
// OAuth scopes for user profile and email
export const GOOGLE_SCOPES = [
    'openid', // Required for OpenID Connect
    'email', // User's email address
    'profile', // Basic profile information
    'https://www.googleapis.com/auth/userinfo.email', // Email address (read-only)
    'https://www.googleapis.com/auth/userinfo.profile' // Basic profile info (read-only)
];
// State token configuration
export const STATE_TOKEN_BYTES = 32; // 256 bits
export const STATE_TOKEN_EXPIRY = 10 * 60 * 1000; // 10 minutes in milliseconds
// In-memory state store (replace with Redis in production)
const stateStore = new Map();
// Clean up expired states periodically
setInterval(() => {
    const now = Date.now();
    for (const [state, data] of stateStore.entries()) {
        if (now - data.timestamp > STATE_TOKEN_EXPIRY) {
            stateStore.delete(state);
        }
    }
}, 60 * 1000); // Clean up every minute
export function generateStateToken() {
    // Generate random state token
    const stateToken = crypto.randomBytes(STATE_TOKEN_BYTES).toString('hex');
    // Generate nonce for additional security
    const nonce = crypto.randomBytes(16).toString('hex');
    // Store state data
    stateStore.set(stateToken, {
        timestamp: Date.now(),
        nonce
    });
    return { state: stateToken, nonce };
}
export function validateStateToken(state, nonce) {
    const stateData = stateStore.get(state);
    if (!stateData) {
        return false;
    }
    // Check expiration
    if (Date.now() - stateData.timestamp > STATE_TOKEN_EXPIRY) {
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
