# Authentication Service Unification Plan

## Current Issues Identified

The Authentication Service has duplicate implementations across multiple directories:

- Routes defined in both `src/api/routes.ts` and `src/routes/auth.ts`
- Controllers split between `src/auth/controllers/` and `src/controllers/auth/`
- Models defined in both `src/models/index.ts` and `src/auth/models/`
- Validation logic in both `src/utils/validation.ts` and `src/auth/validation/`

## Unified Structure 

```
/Authentication-Service
  /src
    /api
      routes.ts                  # Main route definitions (single source of truth)
    /auth
      /controllers               # All auth controllers
        index.ts                 # Export all controllers
        user.controller.ts       # User authentication
        oauth.controller.ts      # OAuth functionality
        password.controller.ts   # Password management
        session.controller.ts    # Session management
      /models                    # Database models and repositories
        index.ts                 # Export all models
        types.ts                 # Type definitions
        user.repository.ts       # User database operations
      /validation                # Input validation
        index.ts                 # Export all validation
        schemas.ts               # Validation schemas
        middleware.ts            # Validation middleware
      /errors                    # Error handling
        index.ts                 # Export all errors
        factory.ts               # Error factory functions
    /middleware                  # Middleware components
      auth.middleware.ts         # Authentication middleware
    /utils                       # Utility functions
      jwt.ts                     # JWT utilities
    /config                      # Configuration
      database.ts                # Database configuration
      jwt.ts                     # JWT configuration
    app.ts                       # Main application setup
    server.ts                    # Server entry point
```

## Summary of Changes

1. Consolidate routes into `src/api/routes.ts`
2. Move all controllers to `src/auth/controllers/`
3. Move all models to `src/auth/models/` 
4. Move all validation to `src/auth/validation/`
5. Remove redundant files:
   - `src/routes/auth.ts`
   - `src/routes/auth.modified.ts`
   - `src/controllers/auth/` (after moving controllers)
   - `src/utils/validation.ts`
   - `src/models/index.ts` (after migration)

## Special Cases to Preserve

1. Test account middleware from `src/routes/auth.ts`
2. V1 API endpoints for backward compatibility
3. Debug endpoints for development environments
4. Rate limiting functionality 