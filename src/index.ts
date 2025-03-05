import express from 'express';
import cors from 'cors';
import { authRouter } from './routes/auth.js';
import { initializePool } from './config/database.js';
import { initializeOAuthConfig } from './config/oauth.js';
import { Request, Response, NextFunction } from 'express';
import { apiDocumenter } from './interfaces/http/middleware/apiDocumenter.js';
import { errorHandler } from './interfaces/http/middleware/errorHandler.js';
import { apiExplorerRouter } from './interfaces/http/routes/apiExplorer.routes.js';
import { v4 as uuidv4 } from 'uuid';

const app = express();
const port = parseInt(process.env.PORT || '8080', 10); // Convert to number

// CORS configuration
const corsOptions = {
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    // Allow requests from any Netlify subdomains and localhost for development
    if (
      origin.endsWith('.netlify.app') || 
      origin.includes('localhost') || 
      origin.includes('127.0.0.1')
    ) {
      return callback(null, true);
    }
    
    // Block other origins
    callback(new Error('Not allowed by CORS'), false);
  },
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  maxAge: 86400 // 24 hours
};

// Middleware
app.use(cors(corsOptions));
app.use(express.json());

// Handle preflight requests
app.options('*', cors(corsOptions));

// Add request ID middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  req.headers['x-request-id'] = req.headers['x-request-id'] || uuidv4();
  next();
});

// Method validation middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  const allowedMethods = ['GET', 'POST', 'OPTIONS'];
  if (!allowedMethods.includes(req.method)) {
    return res.status(405).json({ 
      message: 'Method Not Allowed',
      allowedMethods
    });
  }
  next();
});

// Add API documenter middleware
app.use(apiDocumenter);

// Routes
app.use('/api/auth', authRouter);
app.use('/api', apiExplorerRouter);

// Health check endpoint (legacy - kept for backward compatibility)
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Error handler middleware (must be last)
app.use(errorHandler);

// Initialize services and start server
Promise.all([
  initializePool(),
  initializeOAuthConfig()
]).then(() => {
  app.listen(port, '0.0.0.0', () => {
    console.log(`Server running on port ${port}`);
    console.log(`API Explorer available at http://localhost:${port}/api/explorer`);
  });
}).catch(error => {
  console.error('Failed to initialize services:', error);
  process.exit(1);
});