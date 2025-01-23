# Authentication API Documentation

This API provides a complete authentication system with various endpoints for user management, authentication, and OAuth integration.

## Status Icons
- ❌ Not Implemented
- ✅ Working
- ⚡ Partially Implemented (needs database integration)

## Authentication Endpoints

### User Registration and Authentication

#### `POST /api/auth/signup` ⚡
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

#### `POST /api/auth/login` ⚡
- **Purpose**: Authenticate user and get tokens
- **Body**: 
  ```json
  {
    "email": "string",
    "password": "string"
  }
  ```
- **Returns**: Access token and refresh token

#### `POST /api/auth/logout` ⚡
- **Purpose**: Invalidate current session
- **Headers**: `Authorization: Bearer <token>`
- **Returns**: 200 OK

### Session Management

#### `GET /api/auth/me` ⚡
- **Purpose**: Get current user profile
- **Headers**: `Authorization: Bearer <token>`
- **Returns**: User profile data

#### `POST /api/auth/refresh` ⚡
- **Purpose**: Refresh access token
- **Body**: 
  ```json
  {
    "refreshToken": "string"
  }
  ```
- **Returns**: New access token

#### `POST /api/auth/revoke-all-sessions` ⚡
- **Purpose**: Logout from all devices
- **Headers**: `Authorization: Bearer <token>`
- **Returns**: 200 OK

### Password Management

#### `POST /api/auth/forgot-password` ⚡
- **Purpose**: Initiate password reset
- **Body**: 
  ```json
  {
    "email": "string"
  }
  ```
- **Returns**: 200 OK with reset instructions

#### `POST /api/auth/reset-password` ⚡
- **Purpose**: Reset password using token
- **Body**: 
  ```json
  {
    "token": "string",
    "newPassword": "string"
  }
  ```
- **Returns**: 200 OK

#### `POST /api/auth/change-password` ⚡
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

### Email Verification

#### `POST /api/auth/verify-email` ⚡
- **Purpose**: Verify email address
- **Body**: 
  ```json
  {
    "token": "string"
  }
  ```
- **Returns**: 200 OK

### OAuth Integration

#### `POST /api/auth/google/login` ⚡
- **Purpose**: Initiate Google OAuth login
- **Returns**: Google authorization URL with CSRF protection
- **Security**: Implements state token validation

#### `GET /api/auth/google/callback` ⚡
- **Purpose**: Handle Google OAuth callback
- **Query Parameters**:
  ```typescript
  {
    code: string;    // Authorization code from Google
    state: string;   // CSRF protection token
  }
  ```
- **Returns**: Access token and user data
- **Features**:
  - CSRF protection via state token
  - Handles new and returning users
  - Verifies email status
  - Stores Google profile info
- **Returns**: Google authorization URL

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
- **Purpose**: Check API health
- **Returns**: Status OK

## Development

### Prerequisites
- Node.js 18 or higher
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
