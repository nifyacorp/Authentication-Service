import { Request, Response, NextFunction } from 'express';
import { LoginBody } from '../models/types.js';

/**
 * Middleware placeholder - no test accounts
 * This controller has been intentionally emptied to remove all test accounts
 */
export const testLogin = async (req: Request<{}, {}, LoginBody>, res: Response, next: NextFunction) => {
  // Simply pass to the next middleware without special account handling
  return next();
}; 