# Authentication Service

This service provides a complete authentication system with various endpoints for user management, authentication, and OAuth integration. The service is built with Express.js, TypeScript, PostgreSQL, and Google Cloud services.

## Recent Updates

The Authentication Service has received significant enhancements for improved reliability, security, and interoperability:

### Rate Limiting Protection (New)
- **Enhanced Security**: Advanced rate limiting to protect against brute force attacks
- **Tiered Approach**: Stricter limits (10 reqs/15min) on sensitive endpoints like login and signup
- **General Protection**: Standard rate limits (100 reqs/5min) on all API routes
- **Smart Response Handling**: Rate limit responses include helpful retry information

### OAuth2 Improvements (New)
- **Robust Error Handling**: Better error detection and validation for Google OAuth flows
- **Parameter Validation**: Strict validation of all OAuth callback parameters
- **Security Enhancement**: Improved state token validation for CSRF protection
- **Fallback Mechanisms**: Graceful handling of edge cases in OAuth responses

### API Resilience Protocol
- **Standardized Error Handling**: Consistent error responses across all endpoints
- **Self-Documenting API**: Error responses include context about the request and helpful documentation
- **Type-Safety**: Improved TypeScript typing for better development experience
- **Client Experience**: Enhanced error messages make debugging and integration easier

### Session Management Enhancements (New)
- **Improved Logout Flow**: Enhanced token validation during logout
- **Better Token Refresh**: More robust refresh token validation and error handling
- **User-Friendly Responses**: Improved responses with additional useful metadata

These updates make the Authentication Service more robust, secure, and developer-friendly.

## Features

- User authentication with JWT tokens
- Session management with refresh tokens
- Google OAuth integration
- Password management and recovery
- Account security features (lockout, rate limiting)
- Event publishing for user creation
- Database-backed token storage
- Row Level Security (RLS) for data protection
- Self-documenting API with standardized error responses

## Integration with NIFYA Ecosystem

The Authentication Service is a critical component of the NIFYA platform, providing identity management for all microservices:

- **Frontend**: Provides JWT tokens for authenticated sessions and handles user login/registration flows
- **Backend API**: Validates authentication tokens for protected routes
- **Notification Worker**: Uses user identity for sending personalized notifications
- **Subscription Worker**: Associates subscriptions with authenticated users
- **BOE Parser**: User identity is used to filter relevant documents
- **Email Notification Service**: Securely delivers messages to verified users

### Communication Flow

```
┌─────────────┐     Auth      ┌─────────────┐
│   Frontend  │◄────Flow─────►│   Auth      │
└─────────────┘               │   Service   │
       ▲                      └─────────────┘
       │                             ▲
       │                             │
       ▼                             ▼
┌─────────────┐    Validation  ┌─────────────┐
│  Backend    │◄───────────────┤  PubSub     │
│  API        │                │  Events     │
└─────────────┘                └─────────────┘
       ▲                             ▲
       │                             │
       ▼                             │
┌─────────────┐                      │
│ Microservice│                      │
│ Ecosystem   │◄─────────────────────┘
└─────────────┘
```

## Status Icons
- ✅ Implemented and Working
- ⚠️ Partially Implemented
- ❌ Not Implemented

## Authentication Endpoints

### User Registration and Authentication

#### `POST /api/auth/signup` ✅
- **Purpose**: Register a new user
- **Body**: 
  ```json
  {
    "email": "string",
    "password": "string",
    "name": "string"
  }
  ```
- **Returns**: User data and authentication tokens
- **Features**:
  - Password validation (min 8 chars, uppercase, number, special char)
  - Name validation (2-50 chars, letters and spaces only)
  - Email uniqueness check
  - Password hashing with bcrypt
  - Event publishing for user creation
  - Automatic email verification

#### `POST /api/auth/login` ✅
- **Purpose**: Authenticate user and get tokens
- **Body**: 
  ```json
  {
    "email": "string",
    "password": "string"
  }
  ```
- **Returns**: User data, access token, and refresh token
- **Features**:
  - Account lockout after 5 failed attempts
  - Password verification with bcrypt
  - Login attempt tracking
  - Automatic lock release after 15 minutes

#### `POST /api/auth/logout` ✅
- **Purpose**: Invalidate current session
- **Body**: 
  ```json
  {
    "refreshToken": "string"
  }
  ```
- **Returns**: 200 OK with timestamp
  ```json
  {
    "message": "Logged out successfully",
    "timestamp": "2025-03-26T11:59:37.059Z"
  }
  ```
- **Features**:
  - Token validation
  - Specific refresh token revocation
  - Secure session termination
  - Idempotent operation (safe to retry)

### Session Management

#### `POST /api/auth/refresh` ✅
- **Purpose**: Refresh access token
- **Body**: 
  ```json
  {
    "refreshToken": "string"
  }
  ```
- **Returns**: New access and refresh tokens with user data
  ```json
  {
    "accessToken": "string",
    "refreshToken": "string",
    "expiresIn": 900,
    "user": {
      "id": "string",
      "email": "string",
      "name": "string",
      "email_verified": boolean
    }
  }
  ```
- **Features**:
  - Enhanced token validation with format checks
  - Expiration verification
  - Old token revocation
  - Database-backed token storage
  - Includes token expiration information
  - Returns user data for client-side context refresh

#### `POST /api/auth/revoke-all-sessions` ✅
- **Purpose**: Logout from all devices
- **Headers**: `Authorization: Bearer <token>`
- **Returns**: 200 OK with revocation timestamp
- **Features**:
  - Token validation
  - Complete session termination
  - Audit timestamp

### OAuth Integration

#### `POST /api/auth/google/login` ✅
- **Purpose**: Initiate Google OAuth login
- **Returns**: Google authorization URL
- **Security**: 
  - CSRF protection with state tokens
  - Configurable scopes
  - Secure state management

#### `GET /api/auth/google/callback` ✅
- **Purpose**: Handle Google OAuth callback
- **Query Parameters**:
  ```typescript
  {
    code: string;    // Authorization code
    state: string;   // CSRF token
    nonce?: string;  // Optional nonce for additional security
  }
  ```
- **Returns**: Access token, refresh token, and user data
  ```json
  {
    "user": {
      "id": "string",
      "email": "string",
      "name": "string",
      "picture": "string",
      "firstLogin": boolean
    },
    "accessToken": "string",
    "refreshToken": "string"
  }
  ```
- **Features**:
  - Enhanced parameter validation
  - Comprehensive error messages
  - CSRF protection with state token validation
  - Support for nonce verification
  - Automatic user creation or profile update
  - Profile data synchronization with Google account
  - Error handling for OAuth flow failures
  - Type validation for all parameters

## Environment Variables

```bash
PORT=3000                    # Server port
JWT_SECRET=your-secret-key   # JWT signing key
JWT_EXPIRES_IN=15m           # JWT token expiration time (15 minutes)
REFRESH_TOKEN_EXPIRES_IN=7d  # Refresh token expiration

# Rate Limiting Configuration
RATE_LIMIT_GENERAL_MAX=100   # Maximum requests for general endpoints
RATE_LIMIT_GENERAL_WINDOW=5  # Window in minutes for general endpoints
RATE_LIMIT_AUTH_MAX=10       # Maximum requests for auth endpoints
RATE_LIMIT_AUTH_WINDOW=15    # Window in minutes for auth endpoints

# Database Configuration
DB_HOST=your-db-host
DB_USER=your-db-user
DB_NAME=your-db-name
DB_PORT=5432
DB_PASSWORD=your-db-password

# Google OAuth
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_REDIRECT_URI=your-redirect-uri
GOOGLE_OAUTH_STATE_TTL=600   # State token time-to-live in seconds

# PubSub Configuration
PUBSUB_TOPIC_USER_EVENTS=user-events
GOOGLE_CLOUD_PROJECT=your-project-id

# Email Notifications
ENABLE_EMAIL_NOTIFICATIONS=true
EMAIL_SERVICE_URL=http://email-notification:8080

# Security Configuration
CORS_ALLOWED_ORIGINS=netlify.app,localhost  # Comma-separated allowed origins
ACCOUNT_LOCKOUT_ATTEMPTS=5                  # Failed attempts before lockout
ACCOUNT_LOCKOUT_DURATION=15                 # Lockout duration in minutes
```

## Security Features

- **CORS Protection**: Configured headers to prevent cross-origin attacks
- **Advanced Rate Limiting**: 
  - Tiered protection against brute force and DDoS attacks
  - Strict limits on sensitive endpoints (10 reqs/15min for login/signup)
  - General API protection (100 reqs/5min) for all routes
  - Informative responses with retry-after headers
  - IP-based tracking with secure expiration
- **Account Lockout**: Temporary account freeze after multiple failed attempts
- **CSRF Protection**: Token-based protection for state-changing operations
- **Secure Session Management**: 
  - JWT with short expiration and refresh token rotation
  - Enhanced logout flow with token validation
  - Improved refresh token validation
- **Row Level Security (RLS)**: Database-level access controls
- **Event-driven Architecture**: Decoupled processing for security events
- **Password Security**:
  - Bcrypt hashing with appropriate work factor
  - Complexity requirements
  - No password storage in plain text
  - Secure password reset mechanism
- **Token Management**:
  - Short-lived access tokens
  - Rotation on suspicious activity
  - Database backed for revocation
  - Secure storage recommendations for clients
- **API Resilience**:
  - Standardized error handling across all endpoints
  - Self-documenting error responses with helpful context
  - Consistent error format for better client integration
  - Error classification by type for intelligent handling
- **OAuth2 Security**:
  - Strict parameter validation
  - Enhanced state token protection
  - Detailed error handling
  - Secure token exchange

## API Resilience Components

The Authentication Service implements a comprehensive API resilience protocol to enhance error handling and improve the developer experience. This includes:

### Error Response Builder

Located at `src/shared/errors/ErrorResponseBuilder.ts`, this component:
- Creates standardized error responses across all endpoints
- Includes contextual information about the request
- Provides self-documenting error messages
- Enhances debugging with detailed error context

### API Metadata Repository

Located at `src/shared/utils/apiMetadata.ts`, this serves as:
- A central source of truth for API documentation
- A reference for endpoint validation
- A provider of helpful context in error messages
- A foundation for API discovery and documentation

### Error Handlers

Controllers have been updated to use standard error builders:
- Consistent error handling patterns across endpoints
- Type-safe error construction
- Helpful context in error responses
- Improved client experience with predictable error formats

Example error response:
```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Authentication required to access this resource.",
    "request_id": "12345-abcde",
    "timestamp": "2023-08-15T12:34:56Z",
    "help": {
      "endpoint_info": {
        "description": "Authenticate and get JWT tokens",
        "auth_required": false,
        "method": "POST"
      },
      "related_endpoints": [
        {
          "path": "/api/auth/signup",
          "methods": ["POST"],
          "description": "Register a new user account"
        }
      ],
      "documentation_url": "https://docs.nifya.app/api/auth/login",
      "required_parameters": [
        {
          "name": "email",
          "type": "string",
          "description": "User email address"
        },
        {
          "name": "password",
          "type": "string",
          "description": "User password"
        }
      ]
    }
  }
}
```

### Common Error Types

The service includes builders for common error types:
- `badRequest` - 400 status code for invalid inputs
- `unauthorized` - 401 status code for authentication failures
- `forbidden` - 403 status code for permission issues
- `notFound` - 404 status code for missing resources
- `tooManyRequests` - 429 status code for rate limiting
- `serverError` - 500 status code for internal errors
- `validationError` - 400 status code for input validation failures
- `accountLocked` - 401 status code with lock expiry details
- `invalidToken` - 400 status code for token issues
- `invalidLoginMethod` - 401 status code for method mismatches

### Controller Updates

The following controller files have been updated to use error builders:

#### User Controller (`src/controllers/auth/user.controller.ts`)
- `login`: Enhanced with better error handling for invalid credentials, account lockouts, and validation errors
- `signup`: Now uses standardized validation errors and improved response for email conflicts
- `getCurrentUser`: Includes helpful error messages for authentication and user lookup issues
- `verifyEmail`: Provides better error context for token verification and email status

#### Password Controller (`src/controllers/auth/password.controller.ts`)
- `forgotPassword`: Enhanced with rate limiting error responses and validation messages
- `resetPassword`: Improved error handling for token verification and password validation
- `changePassword`: Better error context for authentication, validation, and password update issues

#### Session Controller (`src/controllers/auth/session.controller.ts`)
- `logout`: Now provides clear authentication errors and session termination status
- `refreshToken`: Better error messages for invalid or expired tokens
- `revokeAllSessions`: Improved error handling for permission and user validation

#### OAuth Controller (`src/controllers/auth/oauth.controller.ts`)
- `getGoogleAuthUrl`: Enhanced error handling for OAuth configuration
- `handleGoogleCallback`: Better error messages for OAuth callback validation and token exchange

These updates ensure consistent error handling across all authentication endpoints while improving the developer experience with self-documenting errors.

### Technical Implementation

The API resilience implementation uses several TypeScript patterns:

- **Interface-First Design**: All API metadata and error responses follow well-defined interfaces
- **Error Builder Pattern**: Factory functions create standardized error responses
- **Middleware Integration**: Error handling is integrated into Express middleware pipeline
- **Type Guards**: Runtime checking ensures error objects maintain their shape
- **Contextual Responses**: Errors include the full context of what went wrong and how to fix it

Key files:
- `ErrorResponseBuilder.ts`: Core error response generation
- `apiMetadata.ts`: API documentation and metadata
- `apiDocumenter.ts`: Middleware for request validation
- `errorHandler.ts`: Global error handling middleware

Stack:
- TypeScript 4.9+
- Express.js middleware
- Zod for validation
- JWT for authentication

## Development

### Prerequisites
- Node.js 18 or higher
- PostgreSQL database
- Google Cloud project with:
  - Secret Manager
  - Pub/Sub
  - Cloud SQL

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

## Deployment

### Docker Deployment
The service includes a Dockerfile for containerized deployment:

```bash
# Build the Docker image
docker build -t nifya-auth-service .

# Run container with environment variables
docker run -p 3000:3000 --env-file .env nifya-auth-service
```

### Google Cloud Run Deployment
For serverless deployment on Google Cloud:

```bash
# Build the container
gcloud builds submit --tag gcr.io/PROJECT_ID/nifya-auth-service

# Deploy to Cloud Run
gcloud run deploy nifya-auth-service \
  --image gcr.io/PROJECT_ID/nifya-auth-service \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars="JWT_SECRET=SECRET_FROM_SECRET_MANAGER,..."
```

### Kubernetes Deployment
For orchestrated deployment:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: auth-service
spec:
  replicas: 2
  selector:
    matchLabels:
      app: auth-service
  template:
    metadata:
      labels:
        app: auth-service
    spec:
      containers:
      - name: auth-service
        image: gcr.io/PROJECT_ID/nifya-auth-service:latest
        ports:
        - containerPort: 3000
        envFrom:
        - secretRef:
            name: auth-service-secrets
```

## API Health Check

#### `GET /health` ✅
- **Purpose**: Check API and database health
- **Returns**: Status OK with detailed service health:
  ```json
  {
    "status": "healthy",
    "version": "1.0.0",
    "uptime": "10d 2h 30m",
    "databaseConnection": "connected",
    "pubsubConnection": "connected",
    "memoryUsage": {
      "rss": "120MB",
      "heapTotal": "80MB",
      "heapUsed": "65MB"
    }
  }
  ```

## Monitoring and Metrics

The service exports the following metrics for monitoring:

- **Authentication Metrics**:
  - Login success/failure rates
  - Token refresh rates
  - Token revocation events
  - User registration rate
  
- **Security Metrics**:
  - Failed login attempts
  - Account lockouts
  - Suspicious activity detection
  - Rate limit triggers

- **Performance Metrics**:
  - Response times for critical endpoints
  - Database query performance
  - Token validation speed
  - Error rates

## Event Publishing

The service publishes events to Google Cloud Pub/Sub for:
- User creation
- Profile updates
- Security events

Event format example:
```json
{
  "id": "user-id",
  "email": "user@example.com",
  "name": "User Name",
  "createdAt": "2025-01-23T23:32:28.266Z",
  "emailVerified": true
}
```

## Database Schema

The service uses PostgreSQL with the following main tables:
- `users`: User accounts and profiles
- `refresh_tokens`: JWT refresh token management
- `password_reset_requests`: Password recovery
- `login_attempts`: Tracking failed logins for security
- `security_events`: Audit log of security-related actions

All tables implement Row Level Security (RLS) for data protection.

## Troubleshooting

### Common Issues

1. **Token Validation Failures**
   - Check clock synchronization between services
   - Verify JWT_SECRET is consistent across environments
   - Ensure token hasn't been revoked

2. **Database Connection Issues**
   - Check connection string and credentials
   - Verify network connectivity
   - Check PostgreSQL server is running
   - Verify connection pool settings

3. **OAuth Integration Problems**
   - Validate redirect URI configuration
   - Check Google API credentials
   - Verify scopes are properly configured
   - Check CORS settings if using browser redirects

## Contributing

Contributions to the Authentication Service are welcome. Please ensure:

1. All tests pass before submitting PR
2. New features include appropriate tests
3. Documentation is updated
4. Code follows established patterns

## License

This project is proprietary software owned by NIFYA.