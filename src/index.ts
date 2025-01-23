import express from 'express';
import cors from 'cors';
import { authRouter } from './routes/auth.js';
import { initializePool } from './config/database.js';

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRouter);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Initialize database pool and start server
initializePool().then(() => {
  app.listen(port, () => {
  console.log(`Server running on port ${port}`);
  });
}).catch(error => {
  console.error('Failed to initialize database:', error);
  process.exit(1);
});