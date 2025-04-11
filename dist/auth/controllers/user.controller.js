import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { getJwtSecret, MAX_LOGIN_ATTEMPTS, LOCK_TIME } from '../../config/jwt.js';
import { generateAccessToken, generateRefreshToken } from '../../utils/jwt.js';
import { queries } from '../models/index.js';
import { formatErrorResponse } from '../errors/factory.js';
/**
 * User signup controller
 */
export const signup = async (req, res, next) => {
    try {
        console.log('Processing signup request');
        const { email, password } = req.body;
        // Check if email exists
        const existingUser = await queries.getUserByEmail(email);
        if (existingUser) {
            console.log('Email already exists:', email);
            const errorResponse = formatErrorResponse(req, 'Email already exists');
            return res.status(errorResponse.status).json({ error: errorResponse });
        }
        console.log('Creating new user with email:', email);
        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        // Create user in database
        const user = await queries.createUser(email, hashedPassword);
        console.log('User created successfully:', user.id);
        // Return success response
        res.status(201).json({
            message: 'User created successfully',
            user: {
                id: user.id,
                email: user.email,
                email_verified: user.email_verified
            }
        });
    }
    catch (error) {
        console.error('Signup error:', error);
        const errorResponse = formatErrorResponse(req, error);
        res.status(errorResponse.status).json({ error: errorResponse });
    }
};
/**
 * User login controller
 */
export const login = async (req, res, next) => {
    try {
        console.log('Processing login request');
        const { email, password } = req.body;
        console.log(`🔍 DEBUG [LOGIN]: Processing login request for email: ${email}`);
        // Get user from database
        console.log(`🔍 DEBUG [LOGIN]: About to query database for user`);
        const user = await queries.getUserByEmail(email);
        console.log(`🔍 DEBUG [LOGIN]: Database query completed`);
        if (!user) {
            console.log(`🔍 DEBUG [LOGIN]: No user found with email: ${email}`);
            console.log('Login attempt with non-existent email:', email);
            const errorResponse = formatErrorResponse(req, 'User not found. Please check your email or register a new account.');
            return res.status(404).json({ error: errorResponse });
        }
        console.log(`🔍 DEBUG [LOGIN]: User found with ID: ${user.id}`);
        // Additional verification to catch any phantom users
        if (email === 'ratonxi@gmail.com') {
            console.log(`🔍 DEBUG [LOGIN]: Special tracking for ratonxi@gmail.com`);
            console.log(`🔍 DEBUG [LOGIN]: User object exists: ${!!user}`);
            console.log(`🔍 DEBUG [LOGIN]: User ID: ${user.id}`);
            console.log(`🔍 DEBUG [LOGIN]: User email verified: ${user.email_verified}`);
        }
        // Check if account is locked
        if (user.locked_until && new Date(user.locked_until) > new Date()) {
            console.log(`Account locked for user ${user.id} until ${user.locked_until}`);
            const errorResponse = formatErrorResponse(req, `Account locked until ${user.locked_until.toISOString()}`);
            return res.status(errorResponse.status).json({ error: errorResponse });
        }
        // Verify password
        if (!user.password_hash) {
            console.log(`User ${user.id} has no password (OAuth account)`);
            const errorResponse = formatErrorResponse(req, 'Invalid login method');
            return res.status(errorResponse.status).json({ error: errorResponse });
        }
        console.log(`🔍 DEBUG [LOGIN]: About to verify password`);
        const isValidPassword = await bcrypt.compare(password, user.password_hash);
        console.log(`🔍 DEBUG [LOGIN]: Password verification result: ${isValidPassword}`);
        if (!isValidPassword) {
            const loginAttempts = (user.login_attempts || 0) + 1;
            let lockUntil;
            if (loginAttempts >= MAX_LOGIN_ATTEMPTS) {
                lockUntil = new Date(Date.now() + LOCK_TIME);
                console.log(`Locking account for user ${user.id} until ${lockUntil}`);
            }
            // Update login attempts and lock status
            await queries.updateLoginAttempts(user.id, loginAttempts, lockUntil);
            if (lockUntil) {
                const errorResponse = formatErrorResponse(req, `Account locked until ${lockUntil.toISOString()}`);
                return res.status(errorResponse.status).json({ error: errorResponse });
            }
            console.log(`Failed login attempt for email: ${email}`);
            const errorResponse = formatErrorResponse(req, 'Invalid credentials');
            return res.status(errorResponse.status).json({ error: errorResponse });
        }
        // Reset login attempts on successful login
        if (user.login_attempts > 0) {
            await queries.updateLoginAttempts(user.id, 0, undefined);
        }
        // Generate tokens
        console.log(`🔍 DEBUG [LOGIN]: Generating tokens for user: ${user.id}`);
        const [accessToken, refreshToken] = await Promise.all([
            generateAccessToken(user.id, user.email, user.email_verified),
            generateRefreshToken(user.id)
        ]);
        // Store refresh token
        console.log(`🔍 DEBUG [LOGIN]: About to store refresh token in database`);
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7); // 7 days from now
        try {
            await queries.createRefreshToken(user.id, refreshToken, expiresAt);
            console.log(`🔍 DEBUG [LOGIN]: Refresh token stored successfully`);
        }
        catch (error) {
            console.log(`🔍 DEBUG [LOGIN]: Error storing refresh token: ${error instanceof Error ? error.message : String(error)}`);
        }
        console.log(`Successful login for user: ${user.id}`);
        // Construct the response
        const response = {
            accessToken,
            refreshToken,
            user: {
                id: user.id,
                email: user.email,
                email_verified: user.email_verified
            }
        };
        console.log(`🔍 DEBUG [LOGIN]: Login successful, sending response`);
        res.json(response);
    }
    catch (error) {
        console.error('Login error:', error);
        const errorResponse = formatErrorResponse(req, error);
        res.status(errorResponse.status).json({ error: errorResponse });
    }
};
/**
 * Get current user profile
 */
export const getCurrentUser = async (req, res, next) => {
    try {
        // User ID comes from auth middleware
        if (!req.user?.id) {
            const errorResponse = formatErrorResponse(req, 'User ID not found in request');
            return res.status(errorResponse.status).json({ error: errorResponse });
        }
        const user = await queries.getUserById(req.user.id);
        if (!user) {
            const errorResponse = formatErrorResponse(req, 'User not found');
            return res.status(errorResponse.status).json({ error: errorResponse });
        }
        // Transform database user to UserProfile format
        const userProfile = {
            id: user.id,
            email: user.email,
            createdAt: user.created_at.toISOString(),
            emailVerified: user.email_verified,
            pictureUrl: user.picture_url
        };
        res.json(userProfile);
    }
    catch (error) {
        console.error('Get current user error:', error);
        const errorResponse = formatErrorResponse(req, error);
        res.status(errorResponse.status).json({ error: errorResponse });
    }
};
export const verifyEmail = async (req, res, next) => {
    try {
        const { token } = req.body;
        if (!token) {
            const errorResponse = formatErrorResponse(req, 'Verification token is required');
            return res.status(errorResponse.status).json({ error: errorResponse });
        }
        try {
            const secret = await getJwtSecret();
            const decoded = jwt.verify(token, secret);
            // Validate token type
            if (decoded.type !== 'email_verification') {
                const errorResponse = formatErrorResponse(req, 'Invalid verification token');
                return res.status(errorResponse.status).json({ error: errorResponse });
            }
            // TODO: Replace with actual database query
            const user = await queries.getUserById(decoded.userId);
            if (!user) {
                const errorResponse = formatErrorResponse(req, 'Invalid verification token');
                return res.status(errorResponse.status).json({ error: errorResponse });
            }
            if (user.email_verified) {
                const errorResponse = formatErrorResponse(req, 'Email already verified');
                return res.status(errorResponse.status).json({ error: errorResponse });
            }
            // TODO: Update user email_verified status in database
            // Log verification
            console.log(`Email verified for user: ${decoded.userId}`);
            res.json({
                message: 'Email verified successfully',
                email: decoded.email
            });
        }
        catch (jwtError) {
            const errorResponse = formatErrorResponse(req, 'Invalid or expired verification token');
            return res.status(errorResponse.status).json({ error: errorResponse });
        }
    }
    catch (error) {
        console.error('Email verification error:', error);
        const errorResponse = formatErrorResponse(req, error);
        res.status(errorResponse.status).json({ error: errorResponse });
    }
};
