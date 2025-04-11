# Authentication Service

This service provides authentication, user management, and authorization for the NIFYA platform. It's built with Node.js, Express, TypeScript, and PostgreSQL.

## Service Overview

The Authentication Service is responsible for:
- User signup and login
- Session management with JWT tokens
- Password management and recovery
- OAuth 2.0 integration (Google)
- User profile management
- Email verification

## Architecture

The service follows a clean domain-driven design with clear separation of concerns:

```
Authentication-Service/
├── src/
│   ├── api/             # API routes definition
│   │   ├── controllers/ # Request handlers
│   │   ├── errors/      # Error handling
│   │   ├── models/      # Data models and repositories
│   │   └── validation/  # Input validation schemas
│   ├── config/          # Configuration
│   ├── core/            # Core utilities
│   ├── database/        # Database connection
│   ├── interfaces/      # External interface adapters
│   ├── middleware/      # Express middleware
│   ├── utils/           # Utility functions
│   └── index.ts         # Application entry point
└── supabase/            # Database schema
```

## Key Features

### Unified Authentication Layer

The Authentication Service provides a single source of truth for all authentication-related functionality:

- **Centralized Routes**: All routes are defined in `api/routes.ts`
- **Consistent Controllers**: Controllers in `auth/controllers/` handle all authentication logic
- **Unified Error Handling**: Error factory in `auth/errors/factory.js` provides standardized errors
- **Type Safety**: Types in `auth/models/types.ts` ensure consistency across the service

### Error Handling

The service implements a robust error handling system:

- **Standardized Error Responses**: All errors follow a consistent format
- **Self-Documenting Errors**: Errors include context about related endpoints and documentation
- **Machine-Readable Error Codes**: Each error has a unique code for programmatic handling
- **Type-Safe Error Creation**: Error factory ensures consistent error format

Example error response:

```json
{
  "code": "EMAIL_EXISTS",
  "message": "This email is already registered",
  "status": 400,
  "timestamp": "2023-12-05T14:22:15Z",
  "help": {
    "endpoint_info": {
      "description": "Register a new user account",
      "auth_required": false,
      "method": "POST"
    },
    "related_endpoints": [
      {
        "path": "/api/auth/login",
        "methods": ["POST"],
        "description": "Login with existing account"
      }
    ],
    "documentation_url": "https://docs.nifya.app/api/auth/signup"
  }
}
```

### API Endpoints

#### Authentication

- `POST /api/auth/signup` - Register a new user
- `POST /api/auth/login` - Authenticate user and get tokens
- `POST /api/auth/logout` - Invalidate current session
- `GET /api/auth/me` - Get current user profile

#### Session Management

- `POST /api/auth/refresh` - Refresh access token
- `POST /api/auth/revoke-all-sessions` - Logout from all devices
- `GET /api/auth/session` - Validate current session and get user data

#### Password Management

- `POST /api/auth/forgot-password` - Request password reset
- `POST /api/auth/reset-password` - Reset password with token
- `POST /api/auth/change-password` - Change password when logged in

#### OAuth Integration

- `GET /api/auth/google/login` - Initiate Google OAuth login
- `GET /api/auth/google/callback` - Handle Google OAuth callback

#### System Endpoints

- `GET /health` - Check service health
- `GET /api-explorer` - API documentation and exploration

### Security Features

- **JWT Authentication**: Secure token-based authentication
- **Rate Limiting**: Protection against brute force attacks
- **Password Hashing**: Secure password storage with bcrypt
- **CSRF Protection**: Protection against cross-site request forgery
- **Input Validation**: Comprehensive validation of all inputs
- **Error Sanitization**: Prevention of information leakage in errors
- **Secure Session Management**: Token rotation and validation

## Database Schema

The service uses PostgreSQL with the following core tables:

- `users` - User accounts and profiles
- `refresh_tokens` - JWT refresh token management
- `password_reset_tokens` - Password reset token storage

## Installation and Development

### Prerequisites

- Node.js 18 or higher
- PostgreSQL database
- npm or yarn

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

### Environment Variables

```bash
PORT=3000                    # Server port
JWT_SECRET=your-secret-key   # JWT signing key
JWT_EXPIRES_IN=15m           # JWT token expiration time

# Database Configuration
DB_HOST=localhost
DB_USER=postgres
DB_NAME=nifya_auth
DB_PORT=5432
DB_PASSWORD=password

# Google OAuth
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_REDIRECT_URI=http://localhost:3000/api/auth/google/callback
```

### Build and Deployment

Build the project:
```bash
npm run build
```

Run in production:
```bash
npm start
```

## Contributing

To contribute to the Authentication Service:

1. Follow the established architecture and patterns
2. Ensure comprehensive test coverage for new features
3. Maintain type safety with TypeScript
4. Use the error factory for all error responses
5. Update documentation for new endpoints or features

## Internal Architecture

### Controllers

Controllers handle HTTP requests and responses. They:
- Parse request data
- Validate inputs
- Call appropriate services
- Format responses
- Handle errors

### Models

Models define data structures and database interactions:
- `types.ts` - TypeScript interfaces for data structures
- `user.repository.ts` - Database operations for users

### Validation

Validation schemas ensure data integrity:
- Request validation
- Parameter validation
- Security validation

### Error Handling

The error handling system provides:
- Consistent error format
- Type-safe error creation
- Context-aware error responses
- Self-documenting error messages