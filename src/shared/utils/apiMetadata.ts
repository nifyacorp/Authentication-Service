/**
 * API Metadata repository that describes all endpoints
 * This serves as the source of truth for API documentation and self-documenting errors
 */
export const apiDefinitions = {
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
        { "name": "Authorization", "description": "Bearer token" }
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
  "/api/auth/revoke-all-sessions": {
    "POST": {
      "description": "Revoke all active sessions for the current user",
      "auth_required": true,
      "required_headers": [
        { "name": "Authorization", "description": "Bearer token" }
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
        { "name": "Authorization", "description": "Bearer token" }
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
  // Normalize path to handle parameter matching
  const endpointKey = Object.keys(apiDefinitions).find(key => {
    // Convert path params pattern (:id) to regex pattern ([^/]+)
    const pattern = key.replace(/:[^/]+/g, '[^/]+');
    return path.match(new RegExp(`^${pattern}$`));
  });
  
  if (endpointKey && apiDefinitions[endpointKey][method]) {
    return {
      path: endpointKey,
      method,
      ...apiDefinitions[endpointKey][method]
    };
  }
  
  return null;
}

/**
 * Find related endpoints based on resource path
 */
export function findRelatedEndpoints(path: string) {
  // Extract the resource type from the path
  const parts = path.split('/');
  const resource = parts.length > 2 ? parts[2] : ''; // e.g., "auth" from "/api/auth/login"
  
  // Find all endpoints related to this resource
  return Object.keys(apiDefinitions)
    .filter(key => key.includes(`/${resource}`))
    .map(key => ({
      path: key,
      methods: Object.keys(apiDefinitions[key])
    }));
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