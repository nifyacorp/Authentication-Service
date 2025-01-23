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

# Database Configuration
DB_HOST=your-db-host
DB_USER=your-db-user
DB_NAME=your-db-name
DB_PORT=5432

# Google OAuth
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_REDIRECT_URI=your-redirect-uri
```

## Security Features

- CORS protection
- Rate limiting
- Account lockout
- CSRF protection
- Secure session management
- Row Level Security (RLS)
- Event-driven architecture

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

## API Health Check

#### `GET /health` ✅
- **Purpose**: Check API and database health
- **Returns**: Status OK

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

All tables implement Row Level Security (RLS) for data protection.