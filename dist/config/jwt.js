import { config } from 'dotenv';
import { SecretManagerServiceClient } from '@google-cloud/secret-manager';
config();
const secretManagerClient = new SecretManagerServiceClient();
let JWT_SECRET_VALUE = null;
export async function getJwtSecret() {
    if (JWT_SECRET_VALUE) {
        return JWT_SECRET_VALUE;
    }
    try {
        const secretName = 'projects/delta-entity-447812-p2/secrets/JWT_SECRET/versions/latest';
        const [version] = await secretManagerClient.accessSecretVersion({ name: secretName });
        if (!version.payload?.data) {
            throw new Error('Failed to retrieve JWT secret from Secret Manager');
        }
        JWT_SECRET_VALUE = version.payload.data.toString();
        return JWT_SECRET_VALUE;
    }
    catch (error) {
        console.error('Failed to retrieve JWT secret:', error);
        throw new Error('Failed to retrieve JWT secret');
    }
}
export const ACCESS_TOKEN_EXPIRES_IN = '15m';
export const REFRESH_TOKEN_EXPIRES_IN = '7d';
export const MAX_LOGIN_ATTEMPTS = 5;
export const LOCK_TIME = 15 * 60 * 1000; // 15 minutes in milliseconds
export const RESET_TOKEN_EXPIRES_IN = '1h';
export const MAX_PASSWORD_RESET_REQUESTS = 3; // Maximum requests per hour
export const PASSWORD_RESET_WINDOW = 60 * 60 * 1000; // 1 hour in milliseconds
