/**
 * API Metadata repository that describes all endpoints
 * This serves as the source of truth for API documentation and self-documenting errors
 */
import { Request } from 'express';

// Define API metadata types
interface ApiParameter {
  name: string;
  type: string;
  description: string;
  required: boolean;
}

interface ApiResponse {
  description: string;
  example?: any;
}

interface ApiEndpointMethod {
  description: string;
  auth_required: boolean;
  body_parameters?: ApiParameter[];
  query_parameters?: ApiParameter[];
  path_parameters?: ApiParameter[];
  required_headers?: string[];
  responses: {
    [statusCode: string]: ApiResponse;
  };
}

interface ApiEndpoint {
  [method: string]: ApiEndpointMethod;
}

interface ApiDefinitions {
  [path: string]: ApiEndpoint;
}

// API definitions
export const apiDefinitions: ApiDefinitions = {
  "/api/auth/login": {
    "POST": {
      "description": "Authenticate a user and receive JWT tokens",
      "auth_required": false,
      "body_parameters": [
        { "name": "email", "type": "string", "description": "User email", "required": true },
        { "name": "password", "type": "string", "description": "User password", "required": true }
      ],
      "responses": {
        "200": {
          "description": "Successfully authenticated",
          "example": {
            "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
            "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
          }
        },
        "400": {
          "description": "Validation error or invalid credentials"
        },
        "401": {
          "description": "Account locked or invalid login method"
        }
      }
    }
  },
  "/api/auth/signup": {
    "POST": {
      "description": "Register a new user account",
      "auth_required": false,
      "body_parameters": [
        { "name": "email", "type": "string", "description": "User email", "required": true },
        { "name": "password", "type": "string", "description": "User password", "required": true },
        { "name": "name", "type": "string", "description": "User's full name", "required": true }
      ],
      "responses": {
        "201": {
          "description": "Account created successfully",
          "example": {
            "id": "123e4567-e89b-12d3-a456-426614174000",
            "email": "user@example.com",
            "name": "John Doe",
            "email_verified": false
          }
        },
        "400": {
          "description": "Validation error or email already in use"
        }
      }
    }
  },
  "/api/auth/me": {
    "GET": {
      "description": "Get the current authenticated user's profile",
      "auth_required": true,
      "required_headers": [
        "Authorization"
      ],
      "responses": {
        "200": {
          "description": "User profile",
          "example": {
            "id": "123e4567-e89b-12d3-a456-426614174000",
            "email": "user@example.com",
            "name": "John Doe",
            "email_verified": true
          }
        },
        "401": {
          "description": "Unauthorized - invalid or expired token"
        }
      }
    }
  },
  "/api/auth/verify-email": {
    "POST": {
      "description": "Verify a user's email address using a verification token",
      "auth_required": false,
      "body_parameters": [
        { "name": "token", "type": "string", "description": "Email verification token", "required": true }
      ],
      "responses": {
        "200": {
          "description": "Email verified successfully"
        },
        "400": {
          "description": "Invalid or expired verification token"
        }
      }
    }
  },
  "/api/auth/logout": {
    "POST": {
      "description": "Logout the current user by invalidating their refresh token",
      "auth_required": true,
      "body_parameters": [
        { "name": "refreshToken", "type": "string", "description": "Refresh token to invalidate", "required": true }
      ],
      "responses": {
        "200": {
          "description": "Successfully logged out"
        },
        "401": {
          "description": "Invalid refresh token"
        }
      }
    }
  },
  "/api/auth/refresh": {
    "POST": {
      "description": "Get a new access token using a refresh token",
      "auth_required": false,
      "body_parameters": [
        { "name": "refreshToken", "type": "string", "description": "Refresh token", "required": true }
      ],
      "responses": {
        "200": {
          "description": "New access token",
          "example": {
            "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
          }
        },
        "401": {
          "description": "Invalid or expired refresh token"
        }
      }
    }
  },
  "/api/v1/auth/refresh": {
    "POST": {
      "description": "Get a new access token using a refresh token (v1 API)",
      "auth_required": false,
      "body_parameters": [
        { "name": "refreshToken", "type": "string", "description": "Refresh token", "required": true }
      ],
      "responses": {
        "200": {
          "description": "New access token",
          "example": {
            "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
          }
        },
        "401": {
          "description": "Invalid or expired refresh token"
        }
      }
    }
  },
  "/api/auth/revoke-all-sessions": {
    "POST": {
      "description": "Revoke all active sessions for the current user",
      "auth_required": true,
      "required_headers": [
        "Authorization"
      ],
      "responses": {
        "200": {
          "description": "All sessions revoked successfully"
        },
        "401": {
          "description": "Unauthorized - invalid or expired token"
        }
      }
    }
  },
  "/api/auth/forgot-password": {
    "POST": {
      "description": "Request a password reset link",
      "auth_required": false,
      "body_parameters": [
        { "name": "email", "type": "string", "description": "User email", "required": true }
      ],
      "responses": {
        "200": {
          "description": "Password reset email sent"
        }
      }
    }
  },
  "/api/auth/reset-password": {
    "POST": {
      "description": "Reset password using a reset token",
      "auth_required": false,
      "body_parameters": [
        { "name": "token", "type": "string", "description": "Password reset token", "required": true },
        { "name": "password", "type": "string", "description": "New password", "required": true }
      ],
      "responses": {
        "200": {
          "description": "Password reset successfully"
        },
        "400": {
          "description": "Invalid or expired reset token"
        }
      }
    }
  },
  "/api/auth/change-password": {
    "POST": {
      "description": "Change password for authenticated user",
      "auth_required": true,
      "required_headers": [
        "Authorization"
      ],
      "body_parameters": [
        { "name": "currentPassword", "type": "string", "description": "Current password", "required": true },
        { "name": "newPassword", "type": "string", "description": "New password", "required": true }
      ],
      "responses": {
        "200": {
          "description": "Password changed successfully"
        },
        "400": {
          "description": "Invalid current password"
        },
        "401": {
          "description": "Unauthorized - invalid or expired token"
        }
      }
    }
  },
  "/api/auth/google/login": {
    "POST": {
      "description": "Get Google OAuth login URL",
      "auth_required": false,
      "responses": {
        "200": {
          "description": "Google OAuth URL",
          "example": {
            "url": "https://accounts.google.com/o/oauth2/v2/auth?..."
          }
        }
      }
    }
  },
  "/api/auth/google/callback": {
    "GET": {
      "description": "Handle Google OAuth callback",
      "auth_required": false,
      "query_parameters": [
        { "name": "code", "type": "string", "description": "OAuth authorization code", "required": true },
        { "name": "state", "type": "string", "description": "OAuth state parameter", "required": true }
      ],
      "responses": {
        "200": {
          "description": "Successfully authenticated with Google",
          "example": {
            "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
            "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
          }
        },
        "400": {
          "description": "Invalid OAuth callback parameters"
        }
      }
    }
  }
};

/**
 * Get metadata for a specific endpoint and method
 */
export function getEndpointMetadata(path: string, method: string) {
  // Normalize the path and method
  const normalizedPath = path.replace(/\/$/, '');
  const normalizedMethod = method.toUpperCase();
  
  // Find the matching endpoint key
  const endpointKey = Object.keys(apiDefinitions).find(key => 
    normalizedPath === key || normalizedPath.match(new RegExp(`^${key.replace(/\//g, '\\/').replace(/\{[^}]+\}/g, '[^/]+')}$`))
  );
  
  if (endpointKey && apiDefinitions[endpointKey][normalizedMethod]) {
    return {
      path: endpointKey,
      method: normalizedMethod,
      ...apiDefinitions[endpointKey][normalizedMethod]
    };
  }
  
  return null;
}

/**
 * Find related endpoints based on a path
 */
export function findRelatedEndpoints(path: string) {
  const segments = path.split('/').filter(Boolean);
  const relatedEndpoints = [];
  
  // First, try to find exact matches
  for (const key of Object.keys(apiDefinitions)) {
    if (key === path) {
      relatedEndpoints.push({
        path: key,
        methods: Object.keys(apiDefinitions[key]),
        description: apiDefinitions[key][Object.keys(apiDefinitions[key])[0]].description.split('.')[0]
      });
    }
  }
  
  // Then, find endpoints with similar path segments
  if (relatedEndpoints.length < 5 && segments.length > 0) {
    for (const key of Object.keys(apiDefinitions)) {
      if (relatedEndpoints.some(e => e.path === key)) continue;
      
      const keySegments = key.split('/').filter(Boolean);
      const commonSegments = segments.filter(s => keySegments.includes(s));
      
      if (commonSegments.length > 0) {
        relatedEndpoints.push({
          path: key,
          methods: Object.keys(apiDefinitions[key]),
          description: apiDefinitions[key][Object.keys(apiDefinitions[key])[0]].description.split('.')[0]
        });
      }
    }
  }
  
  // If still not enough, add some default endpoints
  if (relatedEndpoints.length < 3) {
    const defaultEndpoints = ['/api/auth/login', '/api/auth/signup', '/api/auth/profile'];
    
    for (const key of defaultEndpoints) {
      if (apiDefinitions[key] && !relatedEndpoints.some(e => e.path === key)) {
        relatedEndpoints.push({
          path: key,
          methods: Object.keys(apiDefinitions[key]),
          description: apiDefinitions[key][Object.keys(apiDefinitions[key])[0]].description.split('.')[0]
        });
      }
    }
  }
  
  return relatedEndpoints.slice(0, 5);
}

/**
 * Get all available endpoints
 */
export function getAllEndpoints() {
  return Object.keys(apiDefinitions).map(path => ({
    path,
    methods: Object.keys(apiDefinitions[path]),
    description: apiDefinitions[path][Object.keys(apiDefinitions[path])[0]].description.split('.')[0]
  }));
} 