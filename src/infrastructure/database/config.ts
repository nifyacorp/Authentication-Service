/**
 * Database configuration
 */
interface DatabaseConfig {
  connectionString: string;
  enableSsl: boolean;
  socketPath?: string;
}

/**
 * Get database configuration from environment variables
 */
export function getDatabaseConfig(): DatabaseConfig {
  // Get database connection variables from environment
  const {
    DB_HOST = 'localhost',
    DB_PORT = '5432',
    DB_NAME = 'auth',
    DB_USER = 'postgres',
    DB_PASSWORD = 'postgres',
    DB_SSL = 'false',
    INSTANCE_CONNECTION_NAME = '',
    NODE_ENV = 'development'
  } = process.env;

  // Check if running on Google Cloud with Cloud SQL
  const useSocketConnection = NODE_ENV === 'production' && INSTANCE_CONNECTION_NAME;
  
  // Build connection string based on connection type
  let connectionString = '';

  if (useSocketConnection) {
    // Format for Cloud SQL socket connection
    connectionString = `postgresql://${DB_USER}:${DB_PASSWORD}@${DB_HOST}/${DB_NAME}`;
  } else {
    // Format for standard connection
    connectionString = `postgresql://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}`;
  }

  return {
    connectionString,
    enableSsl: DB_SSL.toLowerCase() === 'true',
    ...(useSocketConnection && { socketPath: `/cloudsql/${INSTANCE_CONNECTION_NAME}` })
  };
}

/**
 * Get SQL for creating database schema
 */
export function getSchemaSQL(): string {
  return `
    -- Make sure we have the uuid-ossp extension
    CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

    -- Create users table if it doesn't exist
    CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY,
      email VARCHAR(255) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      name VARCHAR(255),
      is_email_verified BOOLEAN DEFAULT FALSE,
      login_attempts INTEGER DEFAULT 0,
      locked_until TIMESTAMP WITH TIME ZONE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );

    -- Create refresh tokens table if it doesn't exist
    CREATE TABLE IF NOT EXISTS refresh_tokens (
      id UUID PRIMARY KEY,
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token VARCHAR(255) UNIQUE NOT NULL,
      expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
      is_revoked BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );

    -- Create password reset requests table if it doesn't exist
    CREATE TABLE IF NOT EXISTS password_reset_requests (
      id UUID PRIMARY KEY,
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token VARCHAR(255) UNIQUE NOT NULL,
      expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
      is_used BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );

    -- Create email verifications table if it doesn't exist
    CREATE TABLE IF NOT EXISTS email_verifications (
      id UUID PRIMARY KEY,
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token VARCHAR(255) UNIQUE NOT NULL,
      expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
      is_used BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );

    -- Create indexes for performance
    CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
    CREATE INDEX IF NOT EXISTS idx_refresh_tokens_token ON refresh_tokens(token);
    CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON refresh_tokens(user_id);
    CREATE INDEX IF NOT EXISTS idx_password_reset_requests_token ON password_reset_requests(token);
    CREATE INDEX IF NOT EXISTS idx_password_reset_requests_user_id ON password_reset_requests(user_id);
    CREATE INDEX IF NOT EXISTS idx_email_verifications_token ON email_verifications(token);
    CREATE INDEX IF NOT EXISTS idx_email_verifications_user_id ON email_verifications(user_id);
  `;
}

/**
 * Initialize the database schema
 */
export async function initializeDatabase(client: any): Promise<void> {
  try {
    console.log('Initializing database schema...');
    const sql = getSchemaSQL();
    await client.query(sql);
    console.log('Database schema initialized successfully');
  } catch (error) {
    console.error('Error initializing database schema:', error);
    throw error;
  }
}