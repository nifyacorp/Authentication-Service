import { Router } from 'express';
import { HealthController } from '../controllers';

/**
 * Initialize health check routes
 */
export function initHealthRoutes(
  router: Router,
  healthController: HealthController
): Router {
  // Simple health check
  router.get(
    '/health',
    healthController.check
  );
  
  // Detailed health check
  router.get(
    '/health/detailed',
    healthController.detailed
  );
  
  return router;
}