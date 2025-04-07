"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PASSWORD_RESET_WINDOW = exports.MAX_PASSWORD_RESET_REQUESTS = exports.RESET_TOKEN_EXPIRES_IN = exports.LOCK_TIME = exports.MAX_LOGIN_ATTEMPTS = exports.REFRESH_TOKEN_EXPIRES_IN = exports.ACCESS_TOKEN_EXPIRES_IN = void 0;
exports.getJwtSecret = getJwtSecret;
const dotenv_1 = require("dotenv");
const secret_manager_1 = require("@google-cloud/secret-manager");
(0, dotenv_1.config)();
const secretManagerClient = new secret_manager_1.SecretManagerServiceClient();
let JWT_SECRET_VALUE = null;
async function getJwtSecret() {
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
exports.ACCESS_TOKEN_EXPIRES_IN = '15m';
exports.REFRESH_TOKEN_EXPIRES_IN = '7d';
exports.MAX_LOGIN_ATTEMPTS = 5;
exports.LOCK_TIME = 15 * 60 * 1000; // 15 minutes in milliseconds
exports.RESET_TOKEN_EXPIRES_IN = '1h';
exports.MAX_PASSWORD_RESET_REQUESTS = 3; // Maximum requests per hour
exports.PASSWORD_RESET_WINDOW = 60 * 60 * 1000; // 1 hour in milliseconds
//# sourceMappingURL=jwt.js.map