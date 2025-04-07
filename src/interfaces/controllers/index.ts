/**
 * Export all controllers
 */
export * from './auth.controller';
export * from './health.controller';

// Import and re-export controller types
import type { Request, Response, NextFunction } from 'express';
export type ControllerMethod = (req: Request, res: Response, next: NextFunction) => Promise<any>;