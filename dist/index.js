import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { authRouter, v1AuthRouter } from './routes/auth.js';
import { initializePool } from './config/database.js';
import { initializeOAuthConfig } from './config/oauth.js';
import { apiDocumenter } from './interfaces/http/middleware/apiDocumenter.js';
import { errorHandler } from './interfaces/http/middleware/errorHandler.js';
import { apiExplorerRouter } from './interfaces/http/routes/apiExplorer.routes.js';
import { v4 as uuidv4 } from 'uuid';
import { errorBuilders } from './shared/errors/ErrorResponseBuilder.js';
const app = express();
const port = parseInt(process.env.PORT || '8080', 10); // Convert to number
// Use trusted proxies - this is important for Cloud Run behind a load balancer
app.set('trust proxy', true);
// CORS configuration
const corsOptions = {
    origin: (origin, callback) => {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin)
            return callback(null, true);
        // Check if the origin is allowed
        const allowedDomains = [
            // Netlify domains
            '.netlify.app',
            // Local development
            'localhost',
            '127.0.0.1',
            // Cloud Run domains
            '.run.app',
            // Specifically allow the main page domain
            'main-page-415554190254.us-central1.run.app'
        ];
        // Check if origin matches any allowed domain
        const isAllowed = allowedDomains.some(domain => {
            return domain.startsWith('.')
                ? origin.endsWith(domain)
                : origin.includes(domain);
        });
        if (isAllowed) {
            return callback(null, true);
        }
        // Log blocked origin for debugging
        console.log(`CORS blocked origin: ${origin}`);
        // Block other origins
        callback(new Error('Not allowed by CORS'), false);
    },
    methods: ['GET', 'POST', 'OPTIONS', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-User-Id', 'X-Request-Id'],
    exposedHeaders: ['X-Request-Id'],
    credentials: true,
    maxAge: 86400 // 24 hours
};
// Middleware
app.use(cors(corsOptions));
app.use(express.json());
// Handle preflight requests
app.options('*', cors(corsOptions));
// Add request ID middleware
app.use((req, res, next) => {
    req.headers['x-request-id'] = req.headers['x-request-id'] || uuidv4();
    next();
});
// Method validation middleware
app.use((req, res, next) => {
    const allowedMethods = ['GET', 'POST', 'OPTIONS'];
    if (!allowedMethods.includes(req.method)) {
        return res.status(405).json({
            message: 'Method Not Allowed',
            allowedMethods
        });
    }
    next();
});
// Rate limiting middleware
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // 10 login attempts per IP in the window
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: true, // Don't count successful logins against the limit
    handler: (req, res, next) => {
        const { statusCode, body } = errorBuilders.tooManyRequests(req, 'Too many login attempts. Please try again later.', {
            retryAfter: Math.ceil(15 * 60), // in seconds
            windowSize: '15 minutes'
        });
        return res.status(statusCode).json(body);
    }
});
// Apply stricter rate limit to authentication endpoints
app.use('/api/auth/login', loginLimiter);
app.use('/api/auth/signup', loginLimiter);
app.use('/api/auth/forgot-password', loginLimiter);
// General API rate limiter
const apiLimiter = rateLimit({
    windowMs: 5 * 60 * 1000, // 5 minutes
    max: 100, // 100 requests per IP in the window
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res, next) => {
        const { statusCode, body } = errorBuilders.tooManyRequests(req, 'Too many requests. Please slow down.', {
            retryAfter: Math.ceil(5 * 60), // in seconds
            windowSize: '5 minutes'
        });
        return res.status(statusCode).json(body);
    }
});
// Apply general rate limit to all API routes
app.use('/api', apiLimiter);
// Add API documenter middleware
app.use(apiDocumenter);
// Routes
app.use('/api/auth', authRouter);
app.use('/api/v1/auth', v1AuthRouter);
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
