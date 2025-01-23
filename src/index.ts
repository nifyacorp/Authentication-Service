import express from 'express';
import cors from 'cors';
import { authRouter } from './routes/auth.js';
import { initializePool } from './config/database.js';
import { Request, Response, NextFunction } from 'express';

const app = express();
const port = parseInt(process.env.PORT || '8080', 10); // Convert to number

// CORS configuration
const corsOptions = {
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

// Routes
app.use('/api/auth', authRouter);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Initialize database pool and start server
initializePool().then(() => {
  app.listen(port, '0.0.0.0', () => {
    console.log(`Server running on port ${port}`);
  });
}).catch(error => {
  console.error('Failed to initialize database:', error);
  process.exit(1);
});