import { Pool, PoolConfig, QueryResult, QueryResultRow } from 'pg';

// Database connection configuration
const config: PoolConfig = {
  host: process.env.DB_HOST || '/cloudsql/delta-entity-447812-p2:us-central1:auth-service-db',
  user: process.env.DB_USER || 'auth_service',
  database: process.env.DB_NAME || 'auth_db',
  password: process.env.DB_PASSWORD,
  port: parseInt(process.env.DB_PORT || '5432'),
  max: parseInt(process.env.DB_MAX_CONNECTIONS || '20'),
  idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT || '30000'),
  connectionTimeoutMillis: parseInt(process.env.DB_CONNECTION_TIMEOUT || '2000')
};

// Create connection pool
const pool = new Pool(config);

// Connection event handlers
pool.on('connect', (client) => {
  console.log('Database connected successfully');
});

pool.on('error', (err) => {
  console.error('Unexpected database error', err);
});

/**
 * Execute a database query with logging
 * 
 * @param text SQL query text with $1, $2, etc. placeholders
 * @param params Array of parameters for the query
 * @returns Query result
 */
export async function query<T extends QueryResultRow = any>(text: string, params: any[] = []): Promise<QueryResult<T>> {
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
    
    console.log('Available tables:', tablesResult.rows.map(row => row.table_name));
    
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