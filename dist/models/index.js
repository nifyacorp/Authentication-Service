"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.queries = void 0;
const database_js_1 = require("../config/database.js");
// Debug function to log query execution
async function executeQuery(query, params = []) {
    console.log('Executing query:', {
        text: query,
        params: params.map(p => p === null ? 'null' : String(p))
    });
    try {
        const result = await (0, database_js_1.getPool)().query(query, params);
        console.log('Query result:', {
            rowCount: result.rowCount,
            firstRow: result.rows[0] ? '(data)' : null
        });
        return result;
    }
    catch (error) {
        console.error('Query error:', error);
        throw error;
    }
}
exports.queries = {
    // User queries
    createUser: async (email, passwordHash, name, googleId, pictureUrl) => {
        const result = await executeQuery(`INSERT INTO users (email, password_hash, name, google_id, picture_url, email_verified)
       VALUES ($1, $2, $3, $4, $5, true)
       RETURNING *`, [email, passwordHash, name, googleId, pictureUrl]);
        return result.rows[0];
    },
    getUserByEmail: async (email) => {
        const result = await executeQuery('SELECT * FROM users WHERE email = $1', [email]);
        return result.rows[0] || null;
    },
    getUserById: async (id) => {
        const result = await executeQuery('SELECT * FROM users WHERE id = $1', [id]);
        return result.rows[0] || null;
    },
    updateUserProfile: async (userId, data) => {
        await executeQuery(`UPDATE users 
       SET google_id = $1,
           name = $2,
           picture_url = $3,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $4`, [data.googleId, data.name, data.pictureUrl, userId]);
    },
    updateLoginAttempts: async (userId, attempts, lockUntil) => {
        await executeQuery('UPDATE users SET login_attempts = $1, locked_until = $2 WHERE id = $3', [attempts, lockUntil, userId]);
    },
    // Refresh token queries
    createRefreshToken: async (userId, token, expiresAt) => {
        const result = await executeQuery(`INSERT INTO refresh_tokens (user_id, token, expires_at)
       VALUES ($1, $2, $3)
       RETURNING *`, [userId, token, expiresAt]);
        return result.rows[0];
    },
    getRefreshToken: async (token) => {
        const result = await executeQuery('SELECT * FROM refresh_tokens WHERE token = $1 AND revoked = false', [token]);
        return result.rows[0] || null;
    },
    revokeRefreshToken: async (token) => {
        await executeQuery('UPDATE refresh_tokens SET revoked = true WHERE token = $1', [token]);
    },
    revokeAllUserRefreshTokens: async (userId) => {
        await executeQuery('UPDATE refresh_tokens SET revoked = true WHERE user_id = $1', [userId]);
    },
    // Password reset queries
    createPasswordReset: async (userId, token, expiresAt) => {
        const result = await executeQuery(`INSERT INTO password_reset_requests (user_id, token, expires_at)
       VALUES ($1, $2, $3)
       RETURNING *`, [userId, token, expiresAt]);
        return result.rows[0];
    },
    getPasswordReset: async (token) => {
        const result = await executeQuery('SELECT * FROM password_reset_requests WHERE token = $1 AND used = false AND expires_at > NOW()', [token]);
        return result.rows[0] || null;
    },
    markPasswordResetUsed: async (token) => {
        await executeQuery('UPDATE password_reset_requests SET used = true WHERE token = $1', [token]);
    }
};
//# sourceMappingURL=index.js.map