import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { signupSchema } from '../../utils/validation.js';
import { getJwtSecret, RESET_TOKEN_EXPIRES_IN, MAX_PASSWORD_RESET_REQUESTS, PASSWORD_RESET_WINDOW } from '../../config/jwt.js';
import { AuthRequest, ForgotPasswordBody, ResetPasswordBody, ChangePasswordBody } from './types.js';
import { errorBuilders } from '../../shared/errors/ErrorResponseBuilder.js';

export const forgotPassword = async (req: Request<{}, {}, ForgotPasswordBody>, res: Response, next: NextFunction) => {
  try {
    const { email } = req.body;

    if (!email || !email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      return next(errorBuilders.badRequest(req, 'Invalid email address'));
    }

    // TODO: Replace with actual database query
    const user = {
      id: 'user-id',
      email: 'user@example.com',
      passwordResetAttempts: [] as number[]
    };

    if (!user) {
      // Even if the user doesn't exist, we return a success message for security
      return res.status(200).json({
        message: 'If your email is registered, you will receive password reset instructions'
      });
    }

    const now = Date.now();
    const recentAttempts = user.passwordResetAttempts.filter(
      timestamp => now - timestamp < PASSWORD_RESET_WINDOW
    );

    if (recentAttempts.length >= MAX_PASSWORD_RESET_REQUESTS) {
      return next(errorBuilders.tooManyRequests(req, 'Too many reset attempts. Please try again later.', {
        retryAfter: new Date(recentAttempts[0] + PASSWORD_RESET_WINDOW).toISOString()
      }));
    }

    const secret = await getJwtSecret();
    const resetToken = jwt.sign(
      { 
        userId: user.id,
        type: 'password_reset'
      },
      secret,
      { expiresIn: RESET_TOKEN_EXPIRES_IN }
    );

    try {
      // TODO: Implement email sending
      console.log(`Password reset email sent to: ${email}`);
    } catch (emailError) {
      console.error('Failed to send password reset email:', emailError);
      return next(errorBuilders.serverError(req, emailError instanceof Error ? emailError : new Error('Failed to send reset email')));
    }
    
    res.status(200).json({
      message: 'If your email is registered, you will receive password reset instructions'
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    return next(errorBuilders.serverError(req, error instanceof Error ? error : new Error('Internal server error')));
  }
};

export const resetPassword = async (req: Request<{}, {}, ResetPasswordBody>, res: Response, next: NextFunction) => {
  try {
    const { token, newPassword } = req.body;
    
    // TODO: Implementation will be added later
    
    res.status(200).json({ message: 'Password reset successfully' });
  } catch (error) {
    return next(errorBuilders.serverError(req, error instanceof Error ? error : new Error('Internal server error')));
  }
};

export const changePassword = async (req: Request<{}, {}, ChangePasswordBody>, res: Response, next: NextFunction) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const authHeader = req.headers.authorization;
    const secret = await getJwtSecret();

    if (!authHeader?.startsWith('Bearer ')) {
      return next(errorBuilders.unauthorized(req, 'Missing or invalid token'));
    }

    const token = authHeader.split(' ')[1];
    let userId: string;

    try {
      const decoded = jwt.verify(token, secret) as { userId: string };
      userId = decoded.userId;
    } catch (jwtError) {
      return next(errorBuilders.unauthorized(req, 'Invalid or expired token'));
    }

    // Validate new password format
    try {
      signupSchema.shape.password.parse(newPassword);
    } catch (error) {
      return next(errorBuilders.badRequest(req, 'Invalid password format', {
        details: 'Password must be at least 8 characters, contain uppercase, number, and special character'
      }));
    }

    // TODO: Replace with actual database query
    const user = {
      id: userId,
      email: 'user@example.com',
      password: await bcrypt.hash('CurrentPass123!', 10)
    };

    // Verify current password
    const isValidPassword = await bcrypt.compare(currentPassword, user.password);
    if (!isValidPassword) {
      return next(errorBuilders.unauthorized(req, 'Current password is incorrect'));
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    try {
      // TODO: Database operations:
      // 1. Update user's password
      // await db.user.update({ 
      //   where: { id: userId },
      //   data: { password: hashedPassword }
      // });

      // 2. Invalidate all refresh tokens
      // await db.refreshToken.deleteMany({
      //   where: { userId }
      // });

      // 3. Log security event
      console.log(`Password changed successfully for user: ${userId}`);

      // 4. Send confirmation email
      try {
        // await sendEmail({
        //   to: user.email,
        //   subject: 'Password Changed Successfully',
        //   template: 'password-changed',
        //   context: {
        //     name: user.name,
        //     timestamp: new Date().toISOString()
        //   }
        // });
      } catch (emailError) {
        // Log but don't fail the request
        console.error('Failed to send password change confirmation email:', emailError);
      }

      res.json({ 
        message: 'Password changed successfully',
        requireRelogin: true
      });
    } catch (dbError) {
      console.error('Database error during password change:', dbError);
      return next(errorBuilders.serverError(req, dbError instanceof Error ? dbError : new Error('Failed to update password')));
    }
  } catch (error) {
    console.error('Change password error:', error);
    return next(errorBuilders.serverError(req, error instanceof Error ? error : new Error('Internal server error')));
  }
};