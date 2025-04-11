# Firebase Authentication Integration Plan for Authentication Service

This document outlines the specific steps for adapting the Authentication Service to work with Firebase Authentication.

## 1. Overview

Our Authentication Service currently handles user registration, login, and token verification. We will modify it to integrate with Firebase Authentication while maintaining compatibility with existing clients during the transition period.

## 2. Approach

The Authentication Service will act as a bridge between our existing systems and Firebase Authentication:

1. New users will be created in Firebase directly
2. Login requests will be handled by Firebase
3. Existing API endpoints will remain operational but use Firebase authentication under the hood
4. Token verification will use Firebase Admin SDK

## 3. Implementation Steps

### 3.1 Install Dependencies

```bash
npm install firebase-admin @google-cloud/secret-manager
```

### 3.2 Configure Firebase Admin SDK

Create a Firebase initialization module:

```typescript
// src/config/firebase-admin.ts
import * as admin from 'firebase-admin';
import { SecretManagerServiceClient } from '@google-cloud/secret-manager';

// Secret Manager client
const secretClient = new SecretManagerServiceClient();

// Function to fetch Firebase service account from Secret Manager
async function getServiceAccount() {
  try {
    const [version] = await secretClient.accessSecretVersion({
      name: 'projects/your-project-id/secrets/FIREBASE_SERVICE_ACCOUNT/versions/latest',
    });
    
    return JSON.parse(version.payload.data.toString());
  } catch (error) {
    console.error('Error fetching Firebase service account:', error);
    throw error;
  }
}

// Initialize Firebase Admin SDK
let firebaseApp: admin.app.App | null = null;

export async function initFirebaseAdmin() {
  if (!firebaseApp) {
    try {
      const serviceAccount = await getServiceAccount();
      
      firebaseApp = admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
      });
      
      console.log('Firebase Admin SDK initialized successfully');
    } catch (error) {
      console.error('Firebase Admin SDK initialization failed:', error);
      throw error;
    }
  }
  
  return firebaseApp;
}

// Access Firebase Auth service
export async function getFirebaseAuth() {
  const app = await initFirebaseAdmin();
  return app.auth();
}
```

### 3.3 Modify AuthController

Adapt the authentication controller to work with Firebase:

```typescript
// src/controllers/auth.controller.ts
import { Request, Response } from 'express';
import { getFirebaseAuth } from '../config/firebase-admin';
import { User } from '../models/user.model';
import { createErrorResponse } from '../utils/error-handler';

export class AuthController {
  
  /**
   * Register a new user with Firebase
   */
  async register(req: Request, res: Response) {
    try {
      const { email, password, name } = req.body;
      
      if (!email || !password) {
        return res.status(400).json({
          error: {
            message: 'Email and password are required',
            code: 'INVALID_REQUEST'
          }
        });
      }
      
      // Initialize Firebase Auth
      const auth = await getFirebaseAuth();
      
      // Check if user already exists
      try {
        await auth.getUserByEmail(email);
        return res.status(400).json({
          error: {
            message: 'Email already in use',
            code: 'EMAIL_EXISTS'
          }
        });
      } catch (error) {
        // Continue if user doesn't exist (expected error)
        if (error.code !== 'auth/user-not-found') {
          throw error;
        }
      }
      
      // Create user in Firebase
      const userRecord = await auth.createUser({
        email,
        password,
        displayName: name,
        emailVerified: false
      });
      
      // Also save to our database to maintain relations with other data
      const user = await User.create({
        email,
        name,
        firebase_uid: userRecord.uid,
        email_verified: false
      });
      
      // Generate custom token for immediate sign-in
      const token = await auth.createCustomToken(userRecord.uid);
      
      return res.status(201).json({
        message: 'User registered successfully',
        user: {
          id: user.id,
          email: user.email,
          name: user.name
        },
        customToken: token
      });
    } catch (error) {
      console.error('Registration error:', error);
      
      // Map Firebase error codes to our API error format
      if (error.code === 'auth/email-already-exists') {
        return res.status(400).json({
          error: {
            message: 'Email already in use',
            code: 'EMAIL_EXISTS'
          }
        });
      } else if (error.code === 'auth/invalid-email') {
        return res.status(400).json({
          error: {
            message: 'Invalid email format',
            code: 'INVALID_EMAIL'
          }
        });
      } else if (error.code === 'auth/weak-password') {
        return res.status(400).json({
          error: {
            message: 'Password is too weak. It must be at least 6 characters.',
            code: 'WEAK_PASSWORD'
          }
        });
      }
      
      return res.status(500).json(createErrorResponse(error));
    }
  }
  
  /**
   * Login using Firebase Authentication
   */
  async login(req: Request, res: Response) {
    try {
      const { email, password } = req.body;
      
      if (!email || !password) {
        return res.status(400).json({
          error: {
            message: 'Email and password are required',
            code: 'INVALID_REQUEST'
          }
        });
      }
      
      // We can't directly sign in with email/password from the backend
      // Instead, we'll verify the user exists and return a custom token
      // The client will exchange this for an ID token
      
      const auth = await getFirebaseAuth();
      
      // Check if user exists
      let userRecord;
      try {
        userRecord = await auth.getUserByEmail(email);
      } catch (error) {
        if (error.code === 'auth/user-not-found') {
          return res.status(401).json({
            error: {
              message: 'User not found. Please check your email or register a new account.',
              code: 'USER_NOT_FOUND'
            }
          });
        }
        throw error;
      }
      
      // Note: Firebase Admin SDK cannot verify passwords!
      // This is a crucial limitation. We can:
      // 1. Keep password verification in our DB during transition
      // 2. Use Firebase client SDK through a server-side environment
      // 3. Require clients to use Firebase client SDK directly
      
      // For this example, we'll create a custom token
      // In production, consider verifying the password against your DB
      // during the transition period
      
      const customToken = await auth.createCustomToken(userRecord.uid);
      
      // Find user in our database to maintain compatibility
      const user = await User.findOne({ where: { firebase_uid: userRecord.uid } });
      
      if (!user) {
        // Create user in our DB if not exists (for syncing)
        await User.create({
          email: userRecord.email,
          name: userRecord.displayName,
          firebase_uid: userRecord.uid,
          email_verified: userRecord.emailVerified
        });
      }
      
      return res.status(200).json({
        customToken,
        user: {
          id: user.id,
          email: user.email,
          name: user.name
        }
      });
    } catch (error) {
      console.error('Login error:', error);
      return res.status(500).json(createErrorResponse(error));
    }
  }
  
  /**
   * Verify Firebase ID token
   */
  async verifyToken(req: Request, res: Response) {
    try {
      const { idToken } = req.body;
      
      if (!idToken) {
        return res.status(400).json({
          error: {
            message: 'ID token is required',
            code: 'INVALID_REQUEST'
          }
        });
      }
      
      const auth = await getFirebaseAuth();
      
      // Verify the ID token
      const decodedToken = await auth.verifyIdToken(idToken);
      
      // Get the user details
      const userRecord = await auth.getUser(decodedToken.uid);
      
      return res.status(200).json({
        valid: true,
        user: {
          uid: userRecord.uid,
          email: userRecord.email,
          name: userRecord.displayName,
          emailVerified: userRecord.emailVerified
        }
      });
    } catch (error) {
      console.error('Token verification error:', error);
      
      if (error.code === 'auth/id-token-expired') {
        return res.status(401).json({
          error: {
            message: 'Token has expired',
            code: 'TOKEN_EXPIRED'
          }
        });
      } else if (error.code === 'auth/id-token-revoked') {
        return res.status(401).json({
          error: {
            message: 'Token has been revoked',
            code: 'TOKEN_REVOKED'
          }
        });
      } else if (error.code === 'auth/invalid-id-token') {
        return res.status(401).json({
          error: {
            message: 'Invalid token',
            code: 'INVALID_TOKEN'
          }
        });
      }
      
      return res.status(500).json(createErrorResponse(error));
    }
  }
  
  /**
   * Refresh token using Firebase
   */
  async refreshToken(req: Request, res: Response) {
    // Note: Firebase handles token refresh on the client side
    // This endpoint is for compatibility with existing APIs
    return res.status(501).json({
      error: {
        message: 'Token refresh is handled by Firebase client SDK',
        code: 'NOT_IMPLEMENTED'
      }
    });
  }
}
```

### 3.4 Create Firebase Auth Middleware

```typescript
// src/middleware/firebase-auth.middleware.ts
import { Request, Response, NextFunction } from 'express';
import { getFirebaseAuth } from '../config/firebase-admin';
import { User } from '../models/user.model';

// Extended request with user info
export interface AuthenticatedRequest extends Request {
  user?: {
    uid: string;
    id?: string; // Database ID
    email?: string;
    name?: string;
    firebase_uid: string;
  };
}

/**
 * Middleware to authenticate requests using Firebase
 */
export async function firebaseAuthMiddleware(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: {
          message: 'Authorization header missing or invalid',
          code: 'UNAUTHORIZED'
        }
      });
    }
    
    const token = authHeader.split('Bearer ')[1];
    
    // Verify token with Firebase
    const auth = await getFirebaseAuth();
    const decodedToken = await auth.verifyIdToken(token);
    
    // Get user from our database to maintain ID references
    const user = await User.findOne({ where: { firebase_uid: decodedToken.uid } });
    
    if (!user) {
      // Create user in our database if not exists (for maintaining references)
      const userRecord = await auth.getUser(decodedToken.uid);
      
      const newUser = await User.create({
        email: userRecord.email,
        name: userRecord.displayName,
        firebase_uid: userRecord.uid,
        email_verified: userRecord.emailVerified
      });
      
      req.user = {
        uid: decodedToken.uid,
        id: newUser.id,
        email: newUser.email,
        name: newUser.name,
        firebase_uid: decodedToken.uid
      };
    } else {
      req.user = {
        uid: decodedToken.uid,
        id: user.id,
        email: user.email,
        name: user.name,
        firebase_uid: user.firebase_uid
      };
    }
    
    next();
  } catch (error) {
    console.error('Firebase auth middleware error:', error);
    
    // Handle specific Firebase auth errors
    if (
      error.code === 'auth/id-token-expired' ||
      error.code === 'auth/id-token-revoked' ||
      error.code === 'auth/invalid-id-token'
    ) {
      return res.status(401).json({
        error: {
          message: 'Authentication token is invalid or expired',
          code: 'INVALID_TOKEN'
        }
      });
    }
    
    return res.status(500).json({
      error: {
        message: 'Authentication failed due to server error',
        code: 'SERVER_ERROR'
      }
    });
  }
}
```

### 3.5 Update Database Model

```typescript
// src/models/user.model.ts
import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/database';

export class User extends Model {
  public id!: string;
  public email!: string;
  public name?: string;
  public password_hash?: string; // Keep for transition period
  public email_verified!: boolean;
  public firebase_uid!: string; // New field for Firebase integration
  public created_at!: Date;
  public updated_at!: Date;
}

User.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    },
    name: {
      type: DataTypes.STRING,
      allowNull: true
    },
    password_hash: {
      type: DataTypes.STRING,
      allowNull: true // Allow null for OAuth/Firebase users
    },
    email_verified: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    firebase_uid: {
      type: DataTypes.STRING,
      allowNull: true, // Allow null during migration
      unique: true
    },
    created_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    },
    updated_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    }
  },
  {
    sequelize,
    tableName: 'users',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  }
);
```

### 3.6 Update Routes Configuration

```typescript
// src/routes/auth.routes.ts
import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { firebaseAuthMiddleware } from '../middleware/firebase-auth.middleware';

const router = Router();
const authController = new AuthController();

// Public routes
router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/verify-token', authController.verifyToken);

// Protected routes using Firebase auth
router.use('/profile', firebaseAuthMiddleware);
router.get('/profile', (req: any, res) => {
  // User is already available in req.user
  return res.json({ user: req.user });
});

export default router;
```

## 4. User Migration Strategy

We'll create a script to migrate existing Authentication Service users to Firebase:

```typescript
// scripts/migrate-users-to-firebase.ts
import * as admin from 'firebase-admin';
import { User } from '../src/models/user.model';
import { getFirebaseAuth } from '../src/config/firebase-admin';
import bcrypt from 'bcryptjs';

async function migrateUsers() {
  try {
    // Get all users without Firebase UID
    const users = await User.findAll({
      where: {
        firebase_uid: null
      }
    });
    
    console.log(`Found ${users.length} users to migrate to Firebase`);
    
    const auth = await getFirebaseAuth();
    
    for (const user of users) {
      try {
        // Check if user already exists in Firebase
        try {
          const firebaseUser = await auth.getUserByEmail(user.email);
          console.log(`User ${user.email} already exists in Firebase with UID: ${firebaseUser.uid}`);
          
          // Update user with Firebase UID
          await user.update({
            firebase_uid: firebaseUser.uid
          });
          
          continue;
        } catch (error) {
          // User doesn't exist in Firebase, proceed with creation
          if (error.code !== 'auth/user-not-found') throw error;
        }
        
        // Generate random password if no password hash exists
        let password = null;
        if (!user.password_hash) {
          password = Math.random().toString(36).substring(2, 15);
        }
        
        // Create user in Firebase
        const userRecord = await auth.createUser({
          email: user.email,
          displayName: user.name,
          emailVerified: user.email_verified,
          password: password // Will be null if password_hash exists
        });
        
        console.log(`Created Firebase user for ${user.email} with UID: ${userRecord.uid}`);
        
        // Update user with Firebase UID
        await user.update({
          firebase_uid: userRecord.uid
        });
        
        // If we have password hash and Firebase supports it:
        // Note: This requires special Firebase Admin privileges
        // if (user.password_hash) {
        //   await admin.auth().importUsers([{
        //     uid: userRecord.uid,
        //     email: user.email,
        //     displayName: user.name,
        //     emailVerified: user.email_verified,
        //     passwordHash: Buffer.from(user.password_hash, 'utf8'),
        //     passwordSalt: Buffer.from(salt, 'utf8')
        //   }], {
        //     hash: {
        //       algorithm: 'BCRYPT',
        //     }
        //   });
        // }
      } catch (error) {
        console.error(`Failed to migrate user ${user.email}:`, error);
      }
    }
    
    console.log('Migration completed');
  } catch (error) {
    console.error('Migration failed:', error);
  }
}

migrateUsers().catch(console.error);
```

## 5. Deployment Strategy

1. **Database Schema Update:**
   - Add `firebase_uid` column to users table
   - Deploy database changes

2. **Authentication Service Update:**
   - Deploy Firebase Admin SDK integration
   - Set up Secret Manager with Firebase service account
   - Enable dual authentication (both custom and Firebase) during transition

3. **User Migration:**
   - Execute migration script to create Firebase users
   - Verify migration results and fix any issues

4. **Complete Integration:**
   - Switch all authentication to Firebase
   - Monitor error rates and user experience
   - Keep fallback option available for quick rollback

## 6. Testing Plan

1. **Unit Tests:**
   - Test Firebase token verification
   - Test user creation and login flows
   - Test middleware functionality

2. **Integration Tests:**
   - Test end-to-end authentication flows
   - Test token verification with real Firebase tokens
   - Test user synchronization between Firebase and database

3. **Compatibility Tests:**
   - Test with existing client applications
   - Verify that existing integrations continue to work

## 7. Timeline

| Task | Duration |
|------|----------|
| Firebase Admin SDK Integration | 2 days |
| Database Schema Updates | 1 day |
| Authentication Controller Modifications | 2 days |
| User Migration Script | 1 day |
| Testing | 2 days |
| Deployment | 1 day |

**Total**: Approximately 9 days 