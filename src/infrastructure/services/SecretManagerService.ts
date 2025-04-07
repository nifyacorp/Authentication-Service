import { SecretManagerServiceClient } from '@google-cloud/secret-manager';
import { createInternalError } from '../../core/errors/AppError';

/**
 * Service for accessing Google Secret Manager
 */
export class SecretManagerService {
  private client: SecretManagerServiceClient;
  private projectId: string;
  private secretCache: Map<string, { value: string; timestamp: number }> = new Map();
  private readonly cacheTtlMs: number = 30 * 60 * 1000; // 30 minutes TTL for cache

  constructor(projectId: string) {
    this.client = new SecretManagerServiceClient();
    this.projectId = projectId;
  }

  /**
   * Get a secret value from Secret Manager
   */
  public async getSecret(secretName: string): Promise<string> {
    try {
      // Check cache first
      const cachedSecret = this.secretCache.get(secretName);
      const now = Date.now();
      
      if (cachedSecret && now - cachedSecret.timestamp < this.cacheTtlMs) {
        return cachedSecret.value;
      }

      // Format the resource name
      const name = `projects/${this.projectId}/secrets/${secretName}/versions/latest`;
      
      // Access the secret
      const [response] = await this.client.accessSecretVersion({ name });
      
      if (!response.payload?.data) {
        throw new Error(`Secret ${secretName} has no data`);
      }
      
      const secretValue = response.payload.data.toString();
      
      // Cache the result
      this.secretCache.set(secretName, {
        value: secretValue,
        timestamp: now
      });
      
      return secretValue;
    } catch (error) {
      console.error(`Error retrieving secret ${secretName}:`, error);
      
      // Fallback to environment variable in development
      if (process.env.NODE_ENV !== 'production') {
        const envVar = `SECRET_${secretName.toUpperCase().replace(/-/g, '_')}`;
        const envValue = process.env[envVar];
        
        if (envValue) {
          console.log(`Using fallback environment variable ${envVar}`);
          return envValue;
        }
      }
      
      throw createInternalError(`Failed to retrieve secret ${secretName}`, { error });
    }
  }

  /**
   * Clear the secret cache
   */
  public clearCache(): void {
    this.secretCache.clear();
  }
}