import { Request, Response, NextFunction } from 'express';
import { authService } from '../services/auth.service.js';
import { formatErrorResponse } from '../errors/factory.js';
import { AuthRequest, SignupBody, LoginBody, ChangePasswordBody } from '../models/types.js';

/**
 * User signup controller
 */
export const signup = async (req: Request<{}, {}, SignupBody>, res: Response, next: NextFunction) => {
  try {
    const { email, password, name } = req.body;
    
    // Validation is handled by middleware
    
    // Create user
    const result = await authService.createUser(email, password, name);
    
    res.status(201).json(result);
  } catch (error) {
    // Error handling is centralized
    const errorResponse = formatErrorResponse(req, error);
    res.status(errorResponse.status).json({ error: errorResponse });
  }
};

/**
 * User login controller
 */
export const login = async (req: Request<{}, {}, LoginBody>, res: Response, next: NextFunction) => {
  try {
    const { email, password } = req.body;
    
    // Validation is handled by middleware
    
    // Authenticate user
    const result = await authService.login(email, password);
    
    res.json(result);
  } catch (error) {
    // Error handling is centralized
    const errorResponse = formatErrorResponse(req, error);
    res.status(errorResponse.status).json({ error: errorResponse });
  }
};

/**
 * Logout controller
 */
export const logout = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { refreshToken } = req.body;
    
    // Validation is handled by middleware
    
    // Logout user
    const result = await authService.logout(refreshToken);
    
    res.json(result);
  } catch (error) {
    // Error handling is centralized
    const errorResponse = formatErrorResponse(req, error);
    res.status(errorResponse.status).json({ error: errorResponse });
  }
};

/**
 * Get current user profile
 */
export const getCurrentUser = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    // User ID comes from auth middleware
    if (!req.user?.id) {
      throw new Error('User ID not found in request');
    }
    
    const profile = await authService.getUserProfile(req.user.id);
    
    res.json(profile);
  } catch (error) {
    // Error handling is centralized
    const errorResponse = formatErrorResponse(req as Request, error);
    res.status(errorResponse.status).json({ error: errorResponse });
  }
};

/**
 * Change user password
 */
export const changePassword = async (req: AuthRequest<{}, {}, ChangePasswordBody>, res: Response, next: NextFunction) => {
  try {
    if (!req.user?.id) {
      throw new Error('User ID not found in request');
    }
    
    const { currentPassword, newPassword } = req.body;
    
    // Validation is handled by middleware
    
    // Change password
    const result = await authService.changePassword(req.user.id, currentPassword, newPassword);
    
    res.json(result);
  } catch (error) {
    // Error handling is centralized
    const errorResponse = formatErrorResponse(req as Request, error);
    res.status(errorResponse.status).json({ error: errorResponse });
  }
}; 