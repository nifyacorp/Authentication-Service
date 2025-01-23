# Authentication API Documentation

This API provides a complete authentication system with various endpoints for user management, authentication, and OAuth integration. The API is built with Express.js, TypeScript, and PostgreSQL.

## Status Icons
- ❌ Not Implemented
- ✅ Working
- ⚠️ Partially Implemented

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
- **Returns**: User data and authentication token
- **Features**:
  - Password validation (min 8 chars, uppercase, number, special char)
  - Name validation (2-50 chars, letters and spaces only)
  - Email uniqueness check
  - Password hashing with bcrypt

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

#### `POST /api/auth/logout` ✅
- **Purpose**: Invalidate current session
- **Headers**: `Authorization: Bearer <token>`
- **Returns**: 200 OK
- **Features**:
  - Token validation
  - Revokes all refresh tokens

### Session Management

#### `GET /api/auth/me` ✅
- **Purpose**: Get current user profile
- **Headers**: `Authorization: Bearer <token>`
- **Returns**: User profile data
- **Features**:
  - Token validation
  - Returns user preferences and profile info

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
- **Returns**: 200 OK
- **Features**:
  - Token validation
  - Revokes all refresh tokens for the user
  - Returns revocation timestamp

### Password Management

#### `POST /api/auth/forgot-password` ⚠️
- **Purpose**: Initiate password reset
- **Body**: 
  ```json
  {
    "email": "string"
  }
  ```
- **Returns**: 200 OK
- **Features**:
  - Rate limiting (3 requests per hour)
  - Email sending (to be implemented)

#### `POST /api/auth/reset-password` ⚠️
- **Purpose**: Reset password using token
- **Body**: 
  ```json
  {
    "token": "string",
    "newPassword": "string"
  }
  ```
- **Returns**: 200 OK

#### `POST /api/auth/change-password` ✅
- **Purpose**: Change password while logged in
- **Headers**: `Authorization: Bearer <token>`
- **Body**: 
  ```json
  {
    "currentPassword": "string",
    "newPassword": "string"
  }
  ```
- **Returns**: 200 OK
- **Features**:
  - Current password verification
  - Password validation
  - Session invalidation

### Email Verification

#### `POST /api/auth/verify-email` ⚠️
- **Purpose**: Verify email address
- **Body**: 
  ```json
  {
    "token": "string"
  }
  ```
- **Returns**: 200 OK
- **Note**: Token generation implemented, email sending pending

### OAuth Integration

#### `POST /api/auth/google/login` ✅
- **Purpose**: Initiate Google OAuth login
- **Returns**: Google authorization URL with CSRF protection
- **Security**: Implements state token validation
- **Features**:
  - CSRF protection
  - State token management
  - Configurable scopes

#### `GET /api/auth/google/callback` ⚠️
- **Purpose**: Handle Google OAuth callback
- **Query Parameters**:
  ```typescript
  {
    code: string;    // Authorization code from Google
    state: string;   // CSRF protection token
  }
  ```
- **Returns**: Access token and user data
- **Note**: Token validation implemented, database integration pending

## Environment Variables

```bash
PORT=3000                    # Server port
JWT_SECRET=your-secret-key   # JWT signing key
GOOGLE_CLIENT_ID=           # Google OAuth client ID
GOOGLE_CLIENT_SECRET=       # Google OAuth client secret
GOOGLE_REDIRECT_URI=        # OAuth callback URL
```

## Health Check

#### `GET /health` ✅
- **Purpose**: Check API health and database connection
- **Purpose**: Check API health
- **Returns**: Status OK

## Development

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

### Build
```bash
npm run build
```

### Production
```bash
npm start
```

To run the server:

```bash
npm run dev
```
