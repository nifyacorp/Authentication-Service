import { Pool, PoolClient, QueryResult } from 'pg';
import { createInternalError } from '../../core/errors/AppError';

/**
 * Database client for PostgreSQL
 */
export class DatabaseClient {
  private pool: Pool;
  private static instance: DatabaseClient;

  private constructor(connectionString: string) {
    this.pool = new Pool({
      connectionString,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });
    
    // Log pool events
    this.pool.on('connect', () => {
      console.log('New client connected to database');
    });
    
    this.pool.on('error', (err) => {
      console.error('Unexpected error on idle client', err);
    });
  }

  /**
   * Get singleton instance of DatabaseClient
   */
  public static getInstance(connectionString: string): DatabaseClient {
    if (!DatabaseClient.instance) {
      DatabaseClient.instance = new DatabaseClient(connectionString);
    }
    return DatabaseClient.instance;
  }

  /**
   * Execute a query with parameters
   */
  public async query<T = any>(text: string, params: any[] = []): Promise<QueryResult<T>> {
    try {
      return await this.pool.query<T>(text, params);
    } catch (error) {
      console.error('Database query error:', error);
      throw createInternalError('Database error', { query: text, error });
    }
  }

  /**
   * Get a client from the pool for transaction usage
   */
  public async getClient(): Promise<PoolClient> {
    try {
      return await this.pool.connect();
    } catch (error) {
      console.error('Error acquiring client:', error);
      throw createInternalError('Failed to acquire database client', { error });
    }
  }

  /**
   * Execute multiple queries in a transaction
   */
  public async transaction<T = any>(callback: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await this.getClient();
    
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Transaction error:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Close the database pool
   */
  public async close(): Promise<void> {
    await this.pool.end();
  }
}