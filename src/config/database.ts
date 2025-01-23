import pkg from 'pg';
import { SecretManagerServiceClient } from '@google-cloud/secret-manager';
import fs from 'fs';

const { Pool } = pkg;

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
    const dbPassword = await getDbPassword();

    // Debug: Check if Unix socket exists
    const socketPath = '/cloudsql/delta-entity-447812-p2:us-central1:auth-service-db/.s.PGSQL.5432';
    console.log('Checking Cloud SQL socket path...');
    try {
      fs.accessSync(socketPath.split('/.s.PGSQL.5432')[0], fs.constants.F_OK);
      console.log('Cloud SQL socket directory exists');
    } catch (err) {
      console.error('Cloud SQL socket directory not found:', err);
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
    await pool.connect();
    console.log('Database connected successfully');
  } catch (err) {
    console.error('Database connection error:', err instanceof Error ? err.stack : err);
    throw err;
  }
}

export function getPool(): pkg.Pool {
  if (!pool) {
    throw new Error('Database pool not initialized');
  }
  return pool;
}