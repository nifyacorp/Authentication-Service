# API Resilience Components for Authentication Service

This document explains the API resilience components implemented in the NIFYA Authentication Service to provide self-documenting APIs and helpful error responses.

## Overview

The API resilience system provides:

1. **Self-documenting APIs**: Every endpoint provides detailed documentation about its parameters, responses, and usage.
2. **Helpful Error Messages**: Error responses include not just what went wrong, but how to fix it.
3. **API Discovery**: Clients can discover available endpoints and their capabilities.
4. **Better Debugging**: Error responses include context-specific help.

## Components

### 1. API Metadata Repository

Located at `src/shared/utils/apiMetadata.ts`, this is the central source of truth for API documentation. It includes:

- Detailed endpoint definitions
- Required parameters and headers
- Response examples
- Helper functions to find endpoints

### 2. Error Response Builder

Located at `src/shared/errors/ErrorResponseBuilder.ts`, this builds standardized, self-documenting error responses by:

- Creating consistent error structures
- Adding endpoint-specific documentation
- Including related endpoints
- Providing example requests

### 3. API Documenter Middleware

Located at `src/interfaces/http/middleware/apiDocumenter.ts`, this middleware:

- Validates incoming requests against API metadata
- Checks required parameters
- Validates parameter formats (e.g., UUID)
- Provides helpful validation errors

### 4. Error Handler Middleware

Located at `src/interfaces/http/middleware/errorHandler.ts`, this global error handler:

- Transforms all errors into standardized responses
- Handles various error types consistently
- Adds self-documenting information to errors

### 5. API Explorer Service

Located at `src/core/apiExplorer/service.ts`, this service:

- Provides health check information
- Lists all available endpoints
- Returns detailed documentation for specific endpoints

### 6. API Explorer Routes

Located at `src/interfaces/http/routes/apiExplorer.routes.ts`, these routes:

- Expose API health information at `/api/health`
- List all endpoints at `/api/explorer`
- Provide endpoint-specific documentation at `/api/explorer/:path`

## Usage Examples

### 1. Getting API Health

```
GET /api/health
```

Response:
```json
{
  "status": "healthy",
  "version": "1.0.0",
  "environment": "development",
  "uptime": "3d 2h 15m 30s",
  "api": {
    "base_url": "https://api.nifya.app",
    "documentation_url": "https://docs.nifya.app/api/auth",
    "endpoints_count": 12,
    "endpoint_groups": [
      { "name": "Authentication", "base_path": "/api/auth" },
      { "name": "User Management", "base_path": "/api/auth/me" },
      { "name": "Session Management", "base_path": "/api/auth/refresh" }
    ]
  }
}
```

### 2. Discovering Available Endpoints

```
GET /api/explorer
```

Response:
```json
{
  "endpoints": [
    {
      "path": "/api/auth/login",
      "methods": ["POST"],
      "description": "Authenticate a user and receive JWT tokens"
    },
    {
      "path": "/api/auth/signup",
      "methods": ["POST"],
      "description": "Register a new user account"
    }
  ],
  "count": 2,
  "documentation_url": "https://docs.nifya.app/api/auth"
}
```

### 3. Getting Documentation for a Specific Endpoint

```
GET /api/explorer/login?method=POST
```

Response:
```json
{
  "documentation": {
    "path": "/api/auth/login",
    "method": "POST",
    "description": "Authenticate a user and receive JWT tokens",
    "auth_required": false,
    "body_parameters": [
      { "name": "email", "type": "string", "description": "User email", "required": true },
      { "name": "password", "type": "string", "description": "User password", "required": true }
    ]
  },
  "related_endpoints": [
    {
      "path": "/api/auth/signup",
      "methods": ["POST"]
    },
    {
      "path": "/api/auth/refresh",
      "methods": ["POST"]
    }
  ]
}
```

### 4. Helpful Error Response

When sending an invalid request, like missing required parameters:

```
POST /api/auth/login
```

Response:
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "The request contains invalid parameters.",
    "request_id": "550e8400-e29b-41d4-a716-446655440000",
    "timestamp": "2023-04-01T12:34:56.789Z",
    "details": {
      "email": "Missing required body parameter: email",
      "password": "Missing required body parameter: password"
    },
    "help": {
      "endpoint_info": {
        "description": "Authenticate a user and receive JWT tokens",
        "auth_required": false,
        "method": "POST"
      },
      "required_parameters": [
        { "name": "email", "type": "string", "description": "User email" },
        { "name": "password", "type": "string", "description": "User password" }
      ],
      "related_endpoints": [
        {
          "path": "/api/auth/signup",
          "methods": ["POST"]
        }
      ],
      "documentation_url": "https://docs.nifya.app/api/auth/login"
    }
  }
}
```

## Integration with Controllers

The error handling components are designed to work with the existing controller structure. Controllers can use the error builders to create standardized error responses:

```typescript
import { errorBuilders } from '../../shared/errors/ErrorResponseBuilder.js';

export const login = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Validation and authentication logic
    
    if (!user) {
      const { statusCode, body } = errorBuilders.unauthorized(req, 'Invalid credentials');
      return res.status(statusCode).json(body);
    }
    
    // Success case
    return res.json({ accessToken, refreshToken });
  } catch (error) {
    next(error); // Pass to error handler middleware
  }
};
```

## Conclusion

By implementing these API resilience components, the Authentication Service now provides a more robust and developer-friendly API experience. When errors occur, clients receive clear guidance on how to fix issues, what endpoints are available, and how to use them correctly. 