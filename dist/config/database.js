"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initializePool = initializePool;
exports.getPool = getPool;
const pg_1 = __importDefault(require("pg"));
const secret_manager_1 = require("@google-cloud/secret-manager");
const fs_1 = __importDefault(require("fs"));
const { Pool } = pg_1.default;
const secretManagerClient = new secret_manager_1.SecretManagerServiceClient();
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
let pool;
async function initializePool() {
    try {
        const dbPassword = await getDbPassword();
        // Debug: Check if Unix socket exists
        const socketPath = '/cloudsql/delta-entity-447812-p2:us-central1:auth-service-db/.s.PGSQL.5432';
        console.log('Checking Cloud SQL socket path...');
        try {
            fs_1.default.accessSync(socketPath.split('/.s.PGSQL.5432')[0], fs_1.default.constants.F_OK);
            console.log('Cloud SQL socket directory exists');
            // Add a small delay to ensure socket is ready
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
        catch (err) {
            console.error('Cloud SQL socket directory not found:', err);
            throw new Error('Cloud SQL socket not available');
        }
        // Debug: Log connection config
        console.log('Attempting database connection with config:', {
            host: '/cloudsql/delta-entity-447812-p2:us-central1:auth-service-db',
            user: 'auth_service',
            database: 'auth_db',
            port: 5432,
            max: 20,
            idleTimeoutMillis: 30000,
            connectionTimeoutMillis: 2000,
        });
        pool = new Pool({
            host: '/cloudsql/delta-entity-447812-p2:us-central1:auth-service-db',
            user: 'auth_service',
            password: dbPassword,
            database: 'auth_db',
            port: 5432,
            max: 20,
            idleTimeoutMillis: 30000,
            connectionTimeoutMillis: 2000,
        });
        // Test the connection
        const client = await pool.connect();
        await client.query('SELECT 1'); // Verify we can execute queries
        client.release();
        console.log('Database connected successfully');
        // Initialize schema if needed
        await initializeSchema();
        // Debug: Check database schema
        try {
            const tableCheck = await pool.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public'
        ORDER BY table_name;
      `);
            console.log('Available tables:', tableCheck.rows.map(row => row.table_name));
            // Check users table structure
            if (tableCheck.rows.some(row => row.table_name === 'users')) {
                const userColumns = await pool.query(`
          SELECT column_name, data_type, is_nullable
          FROM information_schema.columns
          WHERE table_name = 'users'
          ORDER BY ordinal_position;
        `);
                console.log('Users table structure:', userColumns.rows);
            }
            else {
                console.log('Users table not found - schema might not be initialized');
            }
        }
        catch (schemaError) {
            console.error('Error checking database schema:', schemaError);
        }
    }
    catch (err) {
        console.error('Database connection error:', err instanceof Error ? err.stack : err);
        throw err;
    }
}
function getPool() {
    if (!pool) {
        throw new Error('Database pool not initialized');
    }
    return pool;
}
async function initializeSchema() {
    try {
        // Check if schema is already initialized
        const schemaCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'users'
      );
    `);
        if (!schemaCheck.rows[0].exists) {
            console.log('Schema not found, initializing...');
            // Apply schema
            const schema = `
        -- Users table
        CREATE TABLE IF NOT EXISTS users (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          email VARCHAR(255) UNIQUE NOT NULL,
          password_hash VARCHAR(255),
          name VARCHAR(255) NOT NULL,
          created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
          email_verified BOOLEAN DEFAULT FALSE,
          google_id VARCHAR(255) UNIQUE,
          picture_url TEXT,
          login_attempts INTEGER DEFAULT 0,
          locked_until TIMESTAMPTZ
        );

        -- Refresh tokens table
        CREATE TABLE IF NOT EXISTS refresh_tokens (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          token TEXT UNIQUE NOT NULL,
          created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
          expires_at TIMESTAMPTZ NOT NULL,
          revoked BOOLEAN DEFAULT FALSE
        );

        -- Password reset requests table
        CREATE TABLE IF NOT EXISTS password_reset_requests (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          token TEXT UNIQUE NOT NULL,
          created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
          expires_at TIMESTAMPTZ NOT NULL,
          used BOOLEAN DEFAULT FALSE
        );

        -- Create indexes
        CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
        CREATE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id);
        CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON refresh_tokens(user_id);
        CREATE INDEX IF NOT EXISTS idx_refresh_tokens_token ON refresh_tokens(token);
        CREATE INDEX IF NOT EXISTS idx_password_reset_token ON password_reset_requests(token);

        -- Create updated_at trigger function
        CREATE OR REPLACE FUNCTION update_updated_at_column()
        RETURNS TRIGGER AS $$
        BEGIN
            NEW.updated_at = CURRENT_TIMESTAMP;
            RETURN NEW;
        END;
        $$ language 'plpgsql';

        -- Create trigger for users table
        DROP TRIGGER IF EXISTS update_users_updated_at ON users;
        CREATE TRIGGER update_users_updated_at
            BEFORE UPDATE ON users
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column();
      `;
            await pool.query(schema);
            console.log('Schema initialized successfully');
        }
        else {
            console.log('Schema already exists');
        }
    }
    catch (error) {
        console.error('Error initializing schema:', error);
        throw error;
    }
}
//# sourceMappingURL=database.js.map