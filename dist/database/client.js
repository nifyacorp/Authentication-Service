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
        const [version] = await secretManagerClient.accessSecretVersion({ name: secretName });
        if (!version.payload?.data) {
            throw new Error('Failed to retrieve database password from Secret Manager');
        }
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
    // Log the query and parameters for debugging (not in production)
    if (process.env.NODE_ENV !== 'production') {
        console.debug(`Executing query: { \n  text: ${JSON.stringify(text)}, \n  params: ${JSON.stringify(params)} \n}`);
    }
    try {
        const start = Date.now();
        const result = await pool.query(text, params);
        const duration = Date.now() - start;
        // Log query execution time (not in production)
        if (process.env.NODE_ENV !== 'production') {
            console.debug(`Query executed in ${duration}ms: { rowCount: ${result.rowCount} }`);
        }
        return result;
    }
    catch (error) {
        // Always log database errors
        console.error(`Database query error: ${error instanceof Error ? error.message : String(error)}`, {
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
        // Set up event handlers
        setupPoolEventHandlers(pool);
        // Test database connection
        await query('SELECT NOW()');
        // Log connection information (sanitized for security)
        console.log(`Connected to database ${config.database} at ${config.host} as ${config.user}`);
        // Check if schema exists and log tables
        const tablesResult = await query(`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    `);
        console.log('Available tables:', tablesResult.rows.map((row) => row.table_name));
        // Check refresh_tokens table specifically since that's what the code seems to use
        const refreshTokensExists = await query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'refresh_tokens'
      )
    `);
        if (!refreshTokensExists.rows[0].exists) {
            console.warn('refresh_tokens table not found - schema might need updating');
        }
        else {
            console.log('refresh_tokens table confirmed');
        }
    }
    catch (error) {
        console.error('Database initialization error:', error);
        throw error;
    }
}
// Export the pool for direct access if needed
export { pool };
