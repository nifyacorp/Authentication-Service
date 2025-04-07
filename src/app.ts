import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import session from 'express-session';
import { errorHandler, requestLogger, standardRateLimiter } from './interfaces/middlewares';
import { initRoutes } from './interfaces/routes';

// Controllers
import { AuthController, HealthController } from './interfaces/controllers';

// Services
import { UserServiceImpl, AuthenticationServiceImpl } from './core/services/implementations';

// Infrastructure
import {
  DatabaseClient,
  getDatabaseConfig,
  initializeDatabase,
  PostgresUserRepository,
  PostgresTokenRepository,
  PostgresPasswordResetRepository,
  PostgresEmailVerificationRepository
} from './infrastructure/database';
import { JwtTokenService, NodemailerEmailService, SecretManagerService } from './infrastructure/services';
import { GoogleOAuthService, getOAuthConfig } from './infrastructure/oauth';

/**
 * Application class for the Authentication Service
 */
export class App {
  public app: Application;
  public port: number;
  private dbClient: DatabaseClient;

  constructor(port: number) {
    this.app = express();
    this.port = port;
    
    // Get database config
    const dbConfig = getDatabaseConfig();
    
    // Initialize database client
    this.dbClient = DatabaseClient.getInstance(dbConfig.connectionString);
    
    this.configureMiddleware();
    this.configureRoutes();
  }

  /**
   * Configure application middleware
   */
  private configureMiddleware(): void {
    // Basic middleware
    this.app.use(helmet());
    this.app.use(compression());
    this.app.use(cors({
      origin: process.env.CORS_ORIGINS?.split(',') || '*',
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
      credentials: true
    }));
    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: true }));
    
    // Session middleware (for OAuth)
    this.app.use(session({
      secret: process.env.SESSION_SECRET || 'session-secret',
      resave: false,
      saveUninitialized: false,
      cookie: {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        maxAge: 10 * 60 * 1000 // 10 minutes
      }
    }));
    
    // Custom middleware
    this.app.use(requestLogger);
    this.app.use(standardRateLimiter);
  }

  /**
   * Configure routes with dependency injection
   */
  private configureRoutes(): void {
    // Repositories
    const userRepository = new PostgresUserRepository(this.dbClient);
    const tokenRepository = new PostgresTokenRepository(this.dbClient);
    const passwordResetRepository = new PostgresPasswordResetRepository(this.dbClient);
    const emailVerificationRepository = new PostgresEmailVerificationRepository(this.dbClient);
    
    // Get configuration for services
    const jwtSecret = process.env.JWT_SECRET || 'jwt-secret';
    const emailConfig = {
      host: process.env.SMTP_HOST || 'smtp.example.com',
      port: parseInt(process.env.SMTP_PORT || '587', 10),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER || 'user',
        pass: process.env.SMTP_PASSWORD || 'password'
      }
    };
    const appUrl = process.env.APP_URL || 'http://localhost:3000';
    const fromEmail = process.env.FROM_EMAIL || 'noreply@example.com';
    const projectId = process.env.GCP_PROJECT_ID || 'project-id';
    
    // Google OAuth config
    const oauthConfig = getOAuthConfig();
    
    // Services
    const tokenService = new JwtTokenService(
      jwtSecret,
      tokenRepository
    );
    
    const emailService = new NodemailerEmailService(
      emailConfig,
      fromEmail,
      appUrl
    );
    
    const googleOAuthService = new GoogleOAuthService(
      oauthConfig.google.clientId,
      oauthConfig.google.clientSecret,
      oauthConfig.google.redirectUri
    );
    
    // Core services
    const userService = new UserServiceImpl(
      userRepository,
      passwordResetRepository,
      emailVerificationRepository,
      tokenService,
      emailService,
      process.env.REQUIRE_EMAIL_VERIFICATION !== 'false'
    );
    
    const authService = new AuthenticationServiceImpl(
      userService,
      userRepository,
      tokenRepository,
      tokenService,
      googleOAuthService,
      process.env.REQUIRE_EMAIL_VERIFICATION !== 'false'
    );
    
    // Controllers
    const authController = new AuthController(authService, userService);
    const healthController = new HealthController(
      this.dbClient,
      process.env.npm_package_version || '1.0.0'
    );
    
    // Initialize routes
    const router = initRoutes(authController, authService, healthController);
    
    // Register routes
    this.app.use('/api/v1', router);
    
    // Error handler (must be registered last)
    this.app.use(errorHandler);
  }

  /**
   * Initialize the database schema
   */
  public async initializeDatabase(): Promise<void> {
    await initializeDatabase(this.dbClient);
  }

  /**
   * Start the application
   */
  public async start(): Promise<void> {
    try {
      // Initialize database
      await this.initializeDatabase();
      
      // Start server
      this.app.listen(this.port, () => {
        console.log(`Authentication Service running on port ${this.port}`);
      });
    } catch (error) {
      console.error('Failed to start application:', error);
      process.exit(1);
    }
  }
}