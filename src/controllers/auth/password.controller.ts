import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { signupSchema } from '../../utils/validation.js';
import { getJwtSecret, RESET_TOKEN_EXPIRES_IN, MAX_PASSWORD_RESET_REQUESTS, PASSWORD_RESET_WINDOW } from '../../config/jwt.js';
import { AuthRequest, ForgotPasswordBody, ResetPasswordBody, ChangePasswordBody } from './types.js';

export const forgotPassword = async (req: Request<{}, {}, ForgotPasswordBody>, res: Response) => {
  try {
    const { email } = req.body;

    if (!email || !email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      return res.status(400).json({ message: 'Invalid email address' });
    }

    // TODO: Replace with actual database query
    const user = {
      id: 'user-id',
      email: 'user@example.com',
      passwordResetAttempts: [] as number[]
    };

    if (!user) {
      return res.status(200).json({
        message: 'If your email is registered, you will receive password reset instructions'
      });
    }

    const now = Date.now();
    const recentAttempts = user.passwordResetAttempts.filter(
      timestamp => now - timestamp < PASSWORD_RESET_WINDOW
    );

    if (recentAttempts.length >= MAX_PASSWORD_RESET_REQUESTS) {
      return res.status(429).json({
        message: 'Too many reset attempts. Please try again later.',
        retryAfter: new Date(recentAttempts[0] + PASSWORD_RESET_WINDOW).toISOString()
      });
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
      return res.status(500).json({ message: 'Failed to send reset email' });
    }
    
    res.status(200).json({
      message: 'If your email is registered, you will receive password reset instructions'
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const resetPassword = async (req: Request<{}, {}, ResetPasswordBody>, res: Response) => {
  try {
    const { token, newPassword } = req.body;
    
    // TODO: Implementation will be added later
    
    res.status(200).json({ message: 'Password reset successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const changePassword = async (req: Request<{}, {}, ChangePasswordBody>, res: Response) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const authHeader = req.headers.authorization;
    const secret = await getJwtSecret();

    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Missing or invalid token' });
    }

    const token = authHeader.split(' ')[1];
    let userId: string;

    try {
      const decoded = jwt.verify(token, secret) as { userId: string };
      userId = decoded.userId;
    } catch (jwtError) {
      return res.status(401).json({ message: 'Invalid or expired token' });
    }

    // Validate new password format
    try {
      signupSchema.shape.password.parse(newPassword);
    } catch (error) {
      return res.status(400).json({
        message: 'Invalid password format',
        details: 'Password must be at least 8 characters, contain uppercase, number, and special character'
      });
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
      return res.status(401).json({ message: 'Current password is incorrect' });
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
      throw new Error('Failed to update password');
    }
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};