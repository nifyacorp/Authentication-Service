# Authentication Service

This service provides a complete authentication system with various endpoints for user management, authentication, and OAuth integration. The service is built with Express.js, TypeScript, PostgreSQL, and Google Cloud services.

## Features

- User authentication with JWT tokens
- Session management with refresh tokens
- Google OAuth integration
- Password management and recovery
- Account security features (lockout, rate limiting)
- Event publishing for user creation
- Database-backed token storage
- Row Level Security (RLS) for data protection

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
- **Headers**: `Authorization: Bearer <token>`
- **Returns**: 200 OK
- **Features**:
  - Token validation
  - Revokes all refresh tokens
  - Secure session termination

### Session Management

#### `POST /api/auth/refresh` ✅
- **Purpose**: Refresh access token
- **Body**: 
  ```json
  {
    "refreshToken": "string"
  }
  ```
- **Returns**: New access and refresh tokens
- **Features**:
  - Token validation and expiration check
  - Old token revocation
  - Database-backed token storage

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
  }
  ```
- **Returns**: Access token and user data
- **Features**:
  - CSRF validation
  - Token generation
  - Profile data sync

## Environment Variables

```bash
PORT=3000                    # Server port
JWT_SECRET=your-secret-key   # JWT signing key
JWT_EXPIRES_IN=1h            # JWT token expiration time
REFRESH_TOKEN_EXPIRES_IN=7d  # Refresh token expiration

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

# PubSub Configuration
PUBSUB_TOPIC_USER_EVENTS=user-events
GOOGLE_CLOUD_PROJECT=your-project-id

# Email Notifications
ENABLE_EMAIL_NOTIFICATIONS=true
EMAIL_SERVICE_URL=http://email-notification:8080
```

## Security Features

- **CORS Protection**: Configured headers to prevent cross-origin attacks
- **Rate Limiting**: Protection against brute force and DDoS attacks
- **Account Lockout**: Temporary account freeze after multiple failed attempts
- **CSRF Protection**: Token-based protection for state-changing operations
- **Secure Session Management**: JWT with short expiration and refresh token rotation
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