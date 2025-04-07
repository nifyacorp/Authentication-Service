import { Router } from 'express';
import { initAuthRoutes } from './auth.routes';
import { initHealthRoutes } from './health.routes';
import { AuthController, HealthController } from '../controllers';
import { AuthenticationService } from '../../core/services/AuthenticationService';
import { DatabaseClient } from '../../infrastructure/database/DatabaseClient';

/**
 * Initialize all routes
 */
export function initRoutes(
  authController: AuthController,
  authService: AuthenticationService,
  healthController: HealthController
): Router {
  const router = Router();
  
  // Initialize route groups
  initAuthRoutes(router, authController, authService);
  initHealthRoutes(router, healthController);
  
  return router;
}

export { initAuthRoutes, initHealthRoutes };