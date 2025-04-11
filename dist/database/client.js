import pkg from 'pg';
import { SecretManagerServiceClient } from '@google-cloud/secret-manager';
const { Pool } = pkg;
const secretManagerClient = new SecretManagerServiceClient();
/**
 * Get database password from Secret Manager
 */
async function getDbPassword() {
    try {
        const secretName = 'projects/delta-entity-447812-p2/secrets/auth-db-app-password/versions/latest';
        console.log(`🔍 DEBUG: Retrieving database password from ${secretName}`);
        const [version] = await secretManagerClient.accessSecretVersion({ name: secretName });
        if (!version.payload?.data) {
            throw new Error('Failed to retrieve database password from Secret Manager');
        }
        console.log(`🔍 DEBUG: Successfully retrieved database password`);
        return version.payload.data.toString();
    }
    catch (error) {
        console.error('Failed to retrieve database password from Secret Manager:', error);
        throw new Error('Failed to retrieve database credentials');
    }
}
// Database connection configuration - optimized for Cloud Run socket connection
const config = {
    // For Cloud Run, we connect via Unix socket with the Cloud SQL Auth Proxy
    host: process.env.DB_HOST || '/cloudsql/delta-entity-447812-p2:us-central1:auth-service-db',
    // Default user and database names if not provided by environment
    user: process.env.DB_USER || 'auth_service',
    database: process.env.DB_NAME || 'auth_db',
    // Connection pool configuration
    max: parseInt(process.env.DB_MAX_CONNECTIONS || '20'),
    idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT || '30000'),
    connectionTimeoutMillis: parseInt(process.env.DB_CONNECTION_TIMEOUT || '2000')
};
// Port should only be used if not connecting through socket
if (process.env.DB_PORT) {
    config.port = parseInt(process.env.DB_PORT);
}
// Create connection pool - will be initialized properly in initializeDatabase
let pool;
// Connection event handlers for when pool is initialized
function setupPoolEventHandlers(pool) {
    pool.on('connect', (client) => {
        console.log('Database connected successfully');
    });
    pool.on('error', (err) => {
        console.error('Unexpected database error', err);
    });
}
/**
 * Execute a database query with logging
 *
 * @param text SQL query text with $1, $2, etc. placeholders
 * @param params Array of parameters for the query
 * @returns Query result
 */
export async function query(text, params = []) {
    // Check if pool is initialized
    if (!pool) {
        throw new Error('Database pool not initialized. Call initializeDatabase() first.');
    }
    // Always log the query for debugging during this investigation
    console.log(`🔍 DEBUG [DB QUERY]: ${text}`);
    console.log(`🔍 DEBUG [DB PARAMS]: ${JSON.stringify(params)}`);
    try {
        const start = Date.now();
        const result = await pool.query(text, params);
        const duration = Date.now() - start;
        // Always log results for debugging during this investigation
        console.log(`🔍 DEBUG [DB RESULT]: Query executed in ${duration}ms`);
        console.log(`🔍 DEBUG [DB RESULT]: Row count = ${result.rowCount || 0}`);
        if (result.rowCount && result.rowCount > 0) {
            // Print the first row for debugging (sanitize sensitive data)
            const firstRow = { ...result.rows[0] };
            // Safely handle password_hash field if it exists
            if (typeof firstRow === 'object' && firstRow !== null && 'password_hash' in firstRow) {
                // @ts-ignore - Use type assertion since we've confirmed password_hash exists
                firstRow.password_hash = '[REDACTED]';
            }
            console.log(`🔍 DEBUG [DB RESULT]: First row = ${JSON.stringify(firstRow)}`);
        }
        return result;
    }
    catch (error) {
        // Always log database errors
        console.error(`⚠️ DATABASE ERROR: ${error instanceof Error ? error.message : String(error)}`, {
            query: text,
            params
        });
        throw error;
    }
}
/**
 * Initialize database connection and create schema if needed
 */
export async function initializeDatabase() {
    try {
        // Always get password from Secret Manager for security
        const dbPassword = await getDbPassword();
        // Initialize pool with password
        pool = new Pool({
            ...config,
            password: dbPassword
        });
        // Log complete connection details for debugging (redact password)
        console.log(`🔍 DEBUG [DB CONNECTION]: Connecting to database with configuration:`);
        console.log(`🔍 DEBUG [DB CONNECTION]: Host: ${config.host}`);
        console.log(`🔍 DEBUG [DB CONNECTION]: User: ${config.user}`);
        console.log(`🔍 DEBUG [DB CONNECTION]: Database: ${config.database}`);
        console.log(`🔍 DEBUG [DB CONNECTION]: Max connections: ${config.max}`);
        // Set up event handlers
        setupPoolEventHandlers(pool);
        // Test database connection
        await query('SELECT NOW() as connection_time');
        // Log connection information (sanitized for security)
        console.log(`🔍 DEBUG [DB CONNECTION]: Connected to database ${config.database} at ${config.host} as ${config.user}`);
        // Check if schema exists and log tables
        const tablesResult = await query(`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    `);
        const tableNames = tablesResult.rows.map((row) => row.table_name);
        console.log(`🔍 DEBUG [DB TABLES]: Available tables: ${JSON.stringify(tableNames)}`);
        // Check refresh_tokens table specifically since that's what the code seems to use
        const refreshTokensExists = await query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'refresh_tokens'
      )
    `);
        console.log(`🔍 DEBUG [DB TABLES]: refresh_tokens table exists: ${refreshTokensExists.rows[0].exists}`);
        // Check tokens table as well
        const tokensExists = await query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'tokens'
      )
    `);
        console.log(`🔍 DEBUG [DB TABLES]: tokens table exists: ${tokensExists.rows[0].exists}`);
        // Try to check if it's an automatic table mapping/alias issue
        if (refreshTokensExists.rows[0].exists) {
            try {
                const refreshTokensCount = await query('SELECT COUNT(*) FROM refresh_tokens');
                console.log(`🔍 DEBUG [DB TABLES]: refresh_tokens table row count: ${refreshTokensCount.rows[0].count}`);
            }
            catch (e) {
                console.log(`🔍 DEBUG [DB TABLES]: Error querying refresh_tokens: ${e instanceof Error ? e.message : String(e)}`);
            }
        }
        if (tokensExists.rows[0].exists) {
            try {
                const tokensCount = await query('SELECT COUNT(*) FROM tokens');
                console.log(`🔍 DEBUG [DB TABLES]: tokens table row count: ${tokensCount.rows[0].count}`);
            }
            catch (e) {
                console.log(`🔍 DEBUG [DB TABLES]: Error querying tokens: ${e instanceof Error ? e.message : String(e)}`);
            }
        }
    }
    catch (error) {
        console.error('⚠️ DATABASE INITIALIZATION ERROR:', error);
        throw error;
    }
}
// Export the pool for direct access if needed
export { pool };
