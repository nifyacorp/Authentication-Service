import { Pool } from 'pg';
import { SecretManagerServiceClient } from '@google-cloud/secret-manager';
import { config } from 'dotenv';

config();

const {
  DB_HOST = '/cloudsql/delta-entity-447812-p2:us-central1:auth-service-db',
  DB_USER = 'auth_service',
  DB_NAME = 'auth_db',
  DB_PORT = '5432',
} = process.env;

const secretManagerClient = new SecretManagerServiceClient();

async function getDbPassword(): Promise<string> {
  try {
    const secretName = 'projects/delta-entity-447812-p2/secrets/auth-db-password/versions/latest';
    const [version] = await secretManagerClient.accessSecretVersion({ name: secretName });
    
    if (!version.payload?.data) {
      throw new Error('Failed to retrieve database password from Secret Manager');
    }

    return version.payload.data.toString();
  } catch (error) {
    console.error('Error retrieving secret:', error);
    throw new Error('Failed to retrieve database credentials');
  }
}

let pool: Pool;

export async function initializePool(): Promise<void> {
  try {
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
    process.exit(1);
  }
}

export function getPool(): Pool {
  if (!pool) {
    throw new Error('Database pool not initialized');
  }
  return pool;
}