# Authentication Service

This service provides a complete authentication system with various endpoints for user management, authentication, and OAuth integration. The service is built with Express.js, TypeScript, PostgreSQL, and Google Cloud services.

## Recent Updates (Architectural Rebuild)

The Authentication Service has undergone a major architectural rebuild to enhance maintainability, scalability, and security:

### Domain-Driven Design Architecture
- **Clean Architecture**: Strict separation of concerns with core, infrastructure, and interfaces layers
- **Dependency Inversion**: Business logic depends on abstractions, not concrete implementations
- **Repository Pattern**: Data access abstracted for better testing and flexibility
- **Service Layer**: Business logic encapsulated in dedicated service classes

### Enhanced Security Features
- **Robust Error Handling**: Consistent error responses with appropriate status codes
- **Advanced Rate Limiting**: Tiered protection against brute force attacks
- **Account Lockout**: Temporary account freeze after multiple failed attempts
- **Token Rotation**: Enhanced security with refresh token rotation
- **Email Verification**: Complete email verification flow

### API Improvements
- **Standardized Responses**: Consistent API response format across all endpoints
- **OpenAPI/Swagger**: Comprehensive API documentation
- **Validation**: Schema-based input validation with helpful error messages
- **Type Safety**: Improved TypeScript typing throughout the application

### OAuth Enhancements
- **Complete Google Integration**: Secure Google OAuth2 authentication flow
- **State Management**: Enhanced CSRF protection for OAuth flows
- **Profile Synchronization**: User profile synchronization with OAuth providers

### Monitoring and Observability
- **Health Checks**: Comprehensive health check endpoints
- **Structured Logging**: Enhanced logging for better debugging
- **Error Tracking**: Improved error tracking and reporting

## Architecture Overview

The Authentication Service follows a Domain-Driven Design (DDD) architecture with clear separation of concerns:

### Core Layer
- **Entities**: Domain models representing business objects (User, Token, etc.)
- **Repositories**: Interfaces defining data access methods
- **Services**: Interfaces for business logic
- **Errors**: Domain-specific error definitions

### Infrastructure Layer
- **Database**: Implementation of repository interfaces
- **Services**: External service integrations
- **OAuth**: OAuth provider implementations

### Interfaces Layer
- **Controllers**: Request handlers for API endpoints
- **Routes**: URL routing definitions
- **Middlewares**: Request preprocessing (validation, authentication, etc.)
- **Validators**: Input validation schemas

## Features

- User authentication with JWT tokens
- Session management with refresh tokens
- Google OAuth integration
- Password management and recovery
- Email verification
- Account security features (lockout, rate limiting)
- Robust error handling
- Database-backed token storage

## API Endpoints

### Authentication
- `POST /api/v1/auth/login`: Authenticate and get tokens
- `POST /api/v1/auth/signup`: Register a new user
- `POST /api/v1/auth/token`: Refresh access token
- `POST /api/v1/auth/logout`: Invalidate current session
- `POST /api/v1/auth/sessions/revoke`: Revoke all sessions

### User Management
- `GET /api/v1/auth/me`: Get current user profile
- `POST /api/v1/auth/password/change`: Change password (authenticated)
- `POST /api/v1/auth/password/reset-request`: Request password reset
- `POST /api/v1/auth/password/reset`: Reset password with token

### Email Verification
- `POST /api/v1/auth/email/verify`: Verify email with token
- `POST /api/v1/auth/email/verification-request`: Request verification email

### OAuth
- `GET /api/v1/auth/google`: Initiate Google OAuth flow
- `GET /api/v1/auth/google/callback`: Handle Google OAuth callback

### Health
- `GET /api/v1/health`: Basic health check
- `GET /api/v1/health/detailed`: Detailed health status

## Environment Variables

See `.env.example` for a complete list of environment variables needed to run the service.

## Development

### Prerequisites
- Node.js 18 or higher
- PostgreSQL database

### Setup
1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Set up environment variables (copy `.env.example` to `.env`)
4. Start development server:
   ```bash
   npm run dev
   ```

### Build
```bash
npm run build
```

### Production
```bash
npm start
```

## Directory Structure

```
src/
├── core/                # Domain models and interfaces
│   ├── entities/        # Business entities
│   ├── repositories/    # Repository interfaces
│   ├── services/        # Service interfaces
│   └── errors/          # Error definitions
├── infrastructure/      # Implementation of interfaces
│   ├── database/        # Database access
│   ├── services/        # Service implementations
│   └── oauth/           # OAuth implementations
├── interfaces/          # User interface layer
│   ├── controllers/     # Request handlers
│   ├── routes/          # URL routing
│   ├── middlewares/     # HTTP middlewares
│   └── validators/      # Input validation
├── app.ts               # Application setup
└── index.ts             # Entry point
```

## Security Features

- **JWT Tokens**: Short-lived access tokens with refresh capability
- **Password Hashing**: Secure password storage with bcrypt
- **Rate Limiting**: Protection against brute force attacks
- **Input Validation**: Schema-based validation for all inputs
- **CORS Protection**: Configured headers to prevent cross-origin attacks
- **Account Lockout**: Temporary account freeze after multiple failed attempts
- **Email Verification**: Email address verification process
- **Token Rotation**: Enhanced security with refresh token rotation

## Contributing

Contributions to the Authentication Service are welcome. Please ensure:

1. All tests pass before submitting PR
2. New features include appropriate tests
3. Documentation is updated
4. Code follows established patterns