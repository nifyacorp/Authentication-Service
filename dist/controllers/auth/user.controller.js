"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyEmail = exports.getCurrentUser = exports.signup = exports.login = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const jwt_js_1 = require("../../config/jwt.js");
const validation_js_1 = require("../../utils/validation.js");
const jwt_js_2 = require("../../utils/jwt.js");
const zod_1 = require("zod");
const index_js_1 = require("../../models/index.js");
const ErrorResponseBuilder_js_1 = require("../../shared/errors/ErrorResponseBuilder.js");
const login = async (req, res, next) => {
    try {
        console.log('Processing login request');
        const { email, password } = req.body;
        try {
            validation_js_1.loginSchema.parse({ email, password });
        }
        catch (error) {
            if (error instanceof zod_1.z.ZodError) {
                console.log('Login validation failed:', error.errors);
                // Use the error builder for validation errors
                return next(error);
            }
        }
        // Get user from database
        const user = await index_js_1.queries.getUserByEmail(email);
        if (!user) {
            console.log('Login attempt with non-existent email:', email);
            const { statusCode, body } = ErrorResponseBuilder_js_1.errorBuilders.unauthorized(req, 'Invalid credentials');
            return res.status(statusCode).json(body);
        }
        // Check if account is locked
        if (user.locked_until && new Date(user.locked_until) > new Date()) {
            console.log(`Account locked for user ${user.id} until ${user.locked_until}`);
            const { statusCode, body } = ErrorResponseBuilder_js_1.errorBuilders.accountLocked(req, user.locked_until.toISOString());
            return res.status(statusCode).json(body);
        }
        // Verify password
        if (!user.password_hash) {
            console.log(`User ${user.id} has no password (OAuth account)`);
            const { statusCode, body } = ErrorResponseBuilder_js_1.errorBuilders.invalidLoginMethod(req);
            return res.status(statusCode).json(body);
        }
        const isValidPassword = await bcryptjs_1.default.compare(password, user.password_hash);
        if (!isValidPassword) {
            const loginAttempts = (user.login_attempts || 0) + 1;
            let lockUntil;
            if (loginAttempts >= jwt_js_1.MAX_LOGIN_ATTEMPTS) {
                lockUntil = new Date(Date.now() + jwt_js_1.LOCK_TIME);
                console.log(`Locking account for user ${user.id} until ${lockUntil}`);
            }
            // Update login attempts and lock status
            await index_js_1.queries.updateLoginAttempts(user.id, loginAttempts, lockUntil);
            if (lockUntil) {
                const { statusCode, body } = ErrorResponseBuilder_js_1.errorBuilders.accountLocked(req, lockUntil.toISOString());
                return res.status(statusCode).json(body);
            }
            console.log(`Failed login attempt for email: ${email}`);
            const { statusCode, body } = ErrorResponseBuilder_js_1.errorBuilders.badRequest(req, 'Invalid credentials', {
                attemptsRemaining: jwt_js_1.MAX_LOGIN_ATTEMPTS - loginAttempts
            });
            return res.status(statusCode).json(body);
        }
        // Reset login attempts on successful login
        if (user.login_attempts > 0) {
            await index_js_1.queries.updateLoginAttempts(user.id, 0, undefined);
        }
        const [accessToken, refreshToken] = await Promise.all([
            (0, jwt_js_2.generateAccessToken)(user.id, user.email, user.name, user.email_verified),
            (0, jwt_js_2.generateRefreshToken)(user.id, user.email)
        ]);
        // Store refresh token
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7); // 7 days from now
        await index_js_1.queries.createRefreshToken(user.id, refreshToken, expiresAt);
        console.log(`Successful login for user: ${user.id}`);
        res.json({
            accessToken,
            refreshToken,
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                email_verified: user.email_verified
            }
        });
    }
    catch (error) {
        console.error('Login error:', error);
        next(error);
    }
};
exports.login = login;
const signup = async (req, res, next) => {
    try {
        console.log('Processing signup request');
        const { email, password, name } = req.body;
        try {
            validation_js_1.signupSchema.parse({ email, password, name });
        }
        catch (error) {
            if (error instanceof zod_1.z.ZodError) {
                console.log('Validation failed:', error.errors);
                return next(error);
            }
        }
        // Check if email exists
        const existingUser = await index_js_1.queries.getUserByEmail(email);
        if (existingUser) {
            console.log('Email already exists:', email);
            const { statusCode, body } = ErrorResponseBuilder_js_1.errorBuilders.badRequest(req, 'Email already exists');
            return res.status(statusCode).json(body);
        }
        console.log('Creating new user with email:', email);
        // Hash password
        const salt = await bcryptjs_1.default.genSalt(10);
        const hashedPassword = await bcryptjs_1.default.hash(password, salt);
        // Create user in database
        const user = await index_js_1.queries.createUser(email, hashedPassword, name);
        console.log('User created successfully:', user.id);
        // Return success response
        res.status(201).json({
            message: 'User created successfully',
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                email_verified: user.email_verified
            }
        });
    }
    catch (error) {
        console.error('Signup error:', error);
        next(error);
    }
};
exports.signup = signup;
const getCurrentUser = async (req, res, next) => {
    try {
        console.log('Processing get current user request');
        const authHeader = req.headers.authorization;
        if (!authHeader?.startsWith('Bearer ')) {
            console.log('Missing or invalid authorization header');
            return next(ErrorResponseBuilder_js_1.errorBuilders.unauthorized(req, 'Missing or invalid token'));
        }
        const token = authHeader.split(' ')[1];
        try {
            const secret = await (0, jwt_js_1.getJwtSecret)();
            const decoded = jsonwebtoken_1.default.verify(token, secret);
            // Verify token type
            if (decoded.type !== 'access') {
                console.log('Invalid token type for profile access');
                return next(ErrorResponseBuilder_js_1.errorBuilders.unauthorized(req, 'Invalid token type'));
            }
            // Get user from database
            const user = await index_js_1.queries.getUserById(decoded.sub);
            if (!user) {
                console.log('User not found:', decoded.sub);
                return next(ErrorResponseBuilder_js_1.errorBuilders.notFound(req, 'User not found'));
            }
            console.log(`Profile retrieved for user: ${decoded.sub}`);
            // Transform database user to UserProfile format
            const userProfile = {
                id: user.id,
                email: user.email,
                name: user.name,
                createdAt: user.created_at.toISOString(),
                emailVerified: user.email_verified,
                preferences: {
                    theme: 'light', // Default preferences
                    language: 'en',
                    notifications: true
                }
            };
            res.json(userProfile);
        }
        catch (jwtError) {
            console.log('JWT verification failed:', jwtError);
            return next(ErrorResponseBuilder_js_1.errorBuilders.unauthorized(req, 'Invalid or expired token'));
        }
    }
    catch (error) {
        console.error('Get current user error:', error);
        return next(ErrorResponseBuilder_js_1.errorBuilders.serverError(req, error instanceof Error ? error : new Error('Internal server error')));
    }
};
exports.getCurrentUser = getCurrentUser;
const verifyEmail = async (req, res, next) => {
    try {
        const { token } = req.body;
        if (!token) {
            return next(ErrorResponseBuilder_js_1.errorBuilders.badRequest(req, 'Verification token is required'));
        }
        try {
            const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET || 'default_secret');
            // Validate token type
            if (decoded.type !== 'email_verification') {
                return next(ErrorResponseBuilder_js_1.errorBuilders.badRequest(req, 'Invalid verification token'));
            }
            // TODO: Replace with actual database query
            const user = {
                id: decoded.userId,
                email: decoded.email,
                emailVerified: false
            };
            if (!user) {
                return next(ErrorResponseBuilder_js_1.errorBuilders.badRequest(req, 'Invalid verification token'));
            }
            if (user.emailVerified) {
                return next(ErrorResponseBuilder_js_1.errorBuilders.badRequest(req, 'Email already verified'));
            }
            try {
                // TODO: Database operations:
                // await db.user.update({
                //   where: { id: decoded.userId },
                //   data: { emailVerified: true }
                // });
                // Log verification
                console.log(`Email verified for user: ${decoded.userId}`);
                // Send confirmation email
                try {
                    // await sendEmail({
                    //   to: decoded.email,
                    //   subject: 'Email Verification Successful',
                    //   template: 'email-verified',
                    //   context: {
                    //     email: decoded.email,
                    //     verifiedAt: new Date().toISOString()
                    //   }
                    // });
                }
                catch (emailError) {
                    // Log but don't fail the request
                    console.error('Failed to send verification confirmation email:', emailError);
                }
                res.json({
                    message: 'Email verified successfully',
                    email: decoded.email
                });
            }
            catch (dbError) {
                console.error('Database error during email verification:', dbError);
                return next(ErrorResponseBuilder_js_1.errorBuilders.serverError(req, dbError instanceof Error ? dbError : new Error('Failed to verify email')));
            }
        }
        catch (jwtError) {
            return next(ErrorResponseBuilder_js_1.errorBuilders.unauthorized(req, 'Invalid or expired verification token'));
        }
    }
    catch (error) {
        console.error('Email verification error:', error);
        return next(ErrorResponseBuilder_js_1.errorBuilders.serverError(req, error instanceof Error ? error : new Error('Internal server error')));
    }
};
exports.verifyEmail = verifyEmail;
//# sourceMappingURL=user.controller.js.map