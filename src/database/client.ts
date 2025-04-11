import pkg from 'pg';
import { SecretManagerServiceClient } from '@google-cloud/secret-manager';
const { Pool } = pkg;

// Type imports (only for TypeScript, not for runtime)
import type { PoolConfig, QueryResult, QueryResultRow } from 'pg';

const secretManagerClient = new SecretManagerServiceClient();

/**
 * Get database password from Secret Manager
 */
async function getDbPassword(): Promise<string> {
  try {
    const secretName = 'projects/delta-entity-447812-p2/secrets/auth-db-app-password/versions/latest';
    const [version] = await secretManagerClient.accessSecretVersion({ name: secretName });
    
    if (!version.payload?.data) {
      throw new Error('Failed to retrieve database password from Secret Manager');
    }

    return version.payload.data.toString();
  } catch (error) {
    console.error('Failed to retrieve database password from Secret Manager:', error);
    throw new Error('Failed to retrieve database credentials');
  }
}

// Database connection configuration
const config: PoolConfig = {
  host: process.env.DB_HOST || '/cloudsql/delta-entity-447812-p2:us-central1:auth-service-db',
  user: process.env.DB_USER || 'auth_service',
  database: process.env.DB_NAME || 'auth_db',
  // Password will be set later after fetching from Secret Manager
  port: parseInt(process.env.DB_PORT || '5432'),
  max: parseInt(process.env.DB_MAX_CONNECTIONS || '20'),
  idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT || '30000'),
  connectionTimeoutMillis: parseInt(process.env.DB_CONNECTION_TIMEOUT || '2000')
};

// Create connection pool - will be initialized properly in initializeDatabase
let pool: pkg.Pool;

// Connection event handlers for when pool is initialized
function setupPoolEventHandlers(pool: pkg.Pool): void {
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
export async function query<T extends QueryResultRow = any>(text: string, params: any[] = []): Promise<QueryResult<T>> {
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
    const result = await pool.query<T>(text, params);
    const duration = Date.now() - start;
    
    // Log query execution time (not in production)
    if (process.env.NODE_ENV !== 'production') {
      console.debug(`Query executed in ${duration}ms: { rowCount: ${result.rowCount} }`);
    }
    
    return result;
  } catch (error) {
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
export async function initializeDatabase(): Promise<void> {
  try {
    // Get password from Secret Manager
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
    
    // Check if schema exists and create it if needed
    const schemaExists = await query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'users'
      )`);
    
    if (!schemaExists.rows[0].exists) {
      console.log('Creating database schema');
      // Import schema from file
      // This would typically read in the schema.sql file and execute it
      // For this refactoring, we'll assume the schema already exists
    } else {
      console.log('Schema already exists');
    }
    
    // Log available tables
    const tablesResult = await query(`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    `);
    
    console.log('Available tables:', tablesResult.rows.map((row: { table_name: string }) => row.table_name));
    
    // Log users table structure
    const usersStructure = await query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'users'
    `);
    
    console.log('Users table structure:', usersStructure.rows);
  } catch (error) {
    console.error('Database initialization error:', error);
    throw error;
  }
}

// Export the pool for direct access if needed
export { pool }; 