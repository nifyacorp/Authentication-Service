import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import apiRoutes from './api/routes.js';
import { initializeDatabase } from './database/client.js';
import { formatErrorResponse } from './auth/errors/factory.js';
// Load environment variables
const PORT = process.env.PORT || 8080;
const CORS_ALLOWED_ORIGINS = (process.env.CORS_ALLOWED_ORIGINS || 'localhost,127.0.0.1')
    .split(',')
    .map(origin => origin.trim());
// Log runtime configuration
console.log('Runtime config loaded:', {
    AUTH_SERVICE_URL: process.env.AUTH_SERVICE_URL || 'https://authentication-service-415554190254.us-central1.run.app',
    BACKEND_SERVICE_URL: process.env.BACKEND_SERVICE_URL || 'https://backend-415554190254.us-central1.run.app',
    NODE_ENV: process.env.NODE_ENV || 'production',
    REACT_APP_ENV: process.env.REACT_APP_ENV || 'production',
    USE_NETLIFY_REDIRECTS: false
});
// Initialize Express app
const app = express();
// Middleware
app.use(helmet()); // Security headers
app.use(cors({
    origin: (origin, callback) => {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin)
            return callback(null, true);
        // Check if origin is allowed
        if (CORS_ALLOWED_ORIGINS.includes(origin) ||
            CORS_ALLOWED_ORIGINS.some(allowed => origin.endsWith(allowed))) {
            return callback(null, true);
        }
        // Log rejected origins
        console.warn(`CORS blocked request from origin: ${origin}`);
        callback(new Error('Not allowed by CORS'));
    },
    credentials: true
}));
app.use(express.json()); // Parse JSON request body
// Request logging
app.use((req, res, next) => {
    console.log(`${req.method} ${req.path} - ${new Date().toISOString()}`);
    next();
});
// Trust proxy - needed for accurate IP detection behind load balancers
app.set('trust proxy', true);
// Register routes
app.use('/api', apiRoutes);
// Default route
app.get('/', (req, res) => {
    res.json({
        service: 'Authentication Service',
        status: 'running',
        version: '1.0.0',
        documentation: '/api/docs'
    });
});
// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    const errorResponse = formatErrorResponse(req, err);
    res.status(errorResponse.status).json({ error: errorResponse });
});
// Start server
const startServer = async () => {
    try {
        // Initialize database connection
        await initializeDatabase();
        // Start the server
        app.listen(PORT, () => {
            console.log(`Server running on port ${PORT}`);
            console.log(`API Explorer available at http://localhost:${PORT}/api/explorer`);
        });
    }
    catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
};
// Handle shutdown gracefully
process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully');
    // Close server and database connections
    process.exit(0);
});
process.on('SIGINT', () => {
    console.log('SIGINT received, shutting down gracefully');
    // Close server and database connections
    process.exit(0);
});
// Start the server
startServer();
