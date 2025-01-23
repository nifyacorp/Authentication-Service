import pkg from 'pg';
import { SecretManagerServiceClient } from '@google-cloud/secret-manager';
import { config } from 'dotenv';

const { Pool } = pkg;
config();

// Required database configuration
const DB_HOST = process.env.DB_HOST;
const DB_USER = process.env.DB_USER;
const DB_NAME = process.env.DB_NAME;
const DB_PORT = process.env.DB_PORT;

const secretManagerClient = new SecretManagerServiceClient();

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

let pool: pkg.Pool;

export async function initializePool(): Promise<void> {
  try {
    // Validate required configuration
    if (!DB_HOST || !DB_USER || !DB_NAME || !DB_PORT) {
      throw new Error(
        'Missing required database configuration. ' +
        'Please ensure DB_HOST, DB_USER, DB_NAME, and DB_PORT ' +
        'are properly configured.'
      );
    }

    const dbPassword = await getDbPassword();
    
    pool = new Pool({
      host: DB_HOST,
      user: DB_USER,
      password: dbPassword,
      database: DB_NAME,
      port: parseInt(DB_PORT, 10),
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });

    // Test the connection
    await pool.connect();
    console.log('Database connected successfully');
  } catch (err) {
    console.error('Database connection error:', err);
    throw err; // Let the caller handle the error
  }
}

export function getPool(): pkg.Pool {
  if (!pool) {
    throw new Error('Database pool not initialized');
  }
  return pool;
}