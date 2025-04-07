import { Router, Request, Response } from 'express';
import apiExplorerService from '../../../core/apiExplorer/service.js';

export const apiExplorerRouter = Router();

// Health check and API overview
apiExplorerRouter.get('/health', (req: Request, res: Response) => {
  const healthInfo = apiExplorerService.getApiHealth();
  return res.json(healthInfo);
});

// List all available endpoints
apiExplorerRouter.get('/explorer', (req: Request, res: Response) => {
  const endpoints = apiExplorerService.getAllEndpoints();
  return res.json(endpoints);
});

// Get documentation for a specific endpoint
apiExplorerRouter.get('/explorer/:path', (req: Request, res: Response) => {
  let path = req.params.path;
  
  // Add leading slash if missing
  if (!path.startsWith('/')) {
    path = `/${path}`;
  }
  
  // If path doesn't include auth, assume it's an auth endpoint
  if (!path.includes('/auth/')) {
    path = `/api/auth/${path}`;
  } else if (!path.startsWith('/api/')) {
    path = `/api${path}`;
  }
  
  const method = (req.query.method as string) || 'GET';
  const documentation = apiExplorerService.getEndpointDocumentation(path, method.toUpperCase());
  
  return res.json(documentation);
}); 