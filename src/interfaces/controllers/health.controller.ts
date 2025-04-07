import { Request, Response, NextFunction } from 'express';
import { createSuccessResponse } from '../../core/interfaces/ApiResponse';
import { DatabaseClient } from '../../infrastructure/database/DatabaseClient';

/**
 * Controller for health check endpoints
 */
export class HealthController {
  constructor(
    private readonly dbClient: DatabaseClient,
    private readonly version: string = '1.0.0'
  ) {}

  /**
   * Basic health check
   */
  public check = async (req: Request, res: Response, next: NextFunction) => {
    try {
      return res.json(
        createSuccessResponse({
          status: 'healthy',
          service: 'authentication-service',
          version: this.version,
          timestamp: new Date().toISOString()
        })
      );
    } catch (error) {
      next(error);
    }
  };

  /**
   * Detailed health check with database connectivity
   */
  public detailed = async (req: Request, res: Response, next: NextFunction) => {
    try {
      let dbStatus = 'disconnected';
      let dbError = null;
      
      try {
        // Check database connectivity
        await this.dbClient.query('SELECT 1');
        dbStatus = 'connected';
      } catch (error: any) {
        dbStatus = 'error';
        dbError = error.message;
      }
      
      return res.json(
        createSuccessResponse({
          status: dbStatus === 'connected' ? 'healthy' : 'unhealthy',
          service: 'authentication-service',
          version: this.version,
          timestamp: new Date().toISOString(),
          details: {
            database: {
              status: dbStatus,
              error: dbError
            }
          }
        })
      );
    } catch (error) {
      next(error);
    }
  };
}