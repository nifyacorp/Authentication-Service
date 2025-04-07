import { EmailService } from '../../core/services/EmailService';
import { EmailSendParams } from '../../core/entities/Email';
import { createInternalError } from '../../core/errors/AppError';
import nodemailer from 'nodemailer';

/**
 * Implementation of EmailService using Nodemailer
 */
export class NodemailerEmailService implements EmailService {
  private transporter: nodemailer.Transporter;
  private readonly fromEmail: string;
  private readonly appUrl: string;

  constructor(smtpConfig: nodemailer.TransportOptions, fromEmail: string, appUrl: string) {
    this.transporter = nodemailer.createTransport(smtpConfig);
    this.fromEmail = fromEmail;
    this.appUrl = appUrl;
  }

  /**
   * Send an email
   */
  public async sendEmail(params: EmailSendParams): Promise<void> {
    try {
      await this.transporter.sendMail({
        from: this.fromEmail,
        to: params.to,
        subject: params.subject,
        html: params.body
      });
    } catch (error) {
      console.error('Error sending email:', error);
      throw createInternalError('Failed to send email', { error });
    }
  }

  /**
   * Send a verification email
   */
  public async sendVerificationEmail(email: string, verificationToken: string, name?: string): Promise<void> {
    const verificationLink = `${this.appUrl}/verify-email?token=${verificationToken}`;
    const greeting = name ? `Hello ${name}` : 'Hello';
    
    await this.sendEmail({
      to: email,
      subject: 'Verify Your Email',
      body: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Email Verification</h2>
          <p>${greeting},</p>
          <p>Thank you for signing up! Please verify your email address by clicking the button below:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${verificationLink}" style="background-color: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; font-weight: bold;">
              Verify Email
            </a>
          </div>
          <p>If the button doesn't work, you can also copy and paste the following link into your browser:</p>
          <p><a href="${verificationLink}">${verificationLink}</a></p>
          <p>This link will expire in 24 hours.</p>
          <p>If you didn't sign up for an account, you can safely ignore this email.</p>
          <p>Best regards,<br>The NIFYA Team</p>
        </div>
      `
    });
  }

  /**
   * Send a password reset email
   */
  public async sendPasswordResetEmail(email: string, resetToken: string, name?: string): Promise<void> {
    const resetLink = `${this.appUrl}/reset-password?token=${resetToken}`;
    const greeting = name ? `Hello ${name}` : 'Hello';
    
    await this.sendEmail({
      to: email,
      subject: 'Reset Your Password',
      body: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Password Reset</h2>
          <p>${greeting},</p>
          <p>We received a request to reset your password. Click the button below to create a new password:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetLink}" style="background-color: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; font-weight: bold;">
              Reset Password
            </a>
          </div>
          <p>If the button doesn't work, you can also copy and paste the following link into your browser:</p>
          <p><a href="${resetLink}">${resetLink}</a></p>
          <p>This link will expire in 1 hour.</p>
          <p>If you didn't request a password reset, you can safely ignore this email.</p>
          <p>Best regards,<br>The NIFYA Team</p>
        </div>
      `
    });
  }

  /**
   * Send a welcome email
   */
  public async sendWelcomeEmail(email: string, name?: string): Promise<void> {
    const greeting = name ? `Hello ${name}` : 'Hello';
    const loginLink = `${this.appUrl}/login`;
    
    await this.sendEmail({
      to: email,
      subject: 'Welcome to NIFYA!',
      body: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Welcome to NIFYA</h2>
          <p>${greeting},</p>
          <p>Thank you for creating an account with us! We're excited to have you on board.</p>
          <p>With your NIFYA account, you can:</p>
          <ul>
            <li>Create and manage subscriptions to legal information</li>
            <li>Receive timely notifications about important updates</li>
            <li>Customize your notification preferences</li>
          </ul>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${loginLink}" style="background-color: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; font-weight: bold;">
              Visit Your Account
            </a>
          </div>
          <p>If you have any questions or need assistance, please don't hesitate to contact our support team.</p>
          <p>Best regards,<br>The NIFYA Team</p>
        </div>
      `
    });
  }

  /**
   * Send an account activity notification email
   */
  public async sendAccountActivityEmail(email: string, activity: string, name?: string): Promise<void> {
    const greeting = name ? `Hello ${name}` : 'Hello';
    
    await this.sendEmail({
      to: email,
      subject: 'Account Activity Alert',
      body: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Account Activity Alert</h2>
          <p>${greeting},</p>
          <p>We noticed the following activity on your account:</p>
          <div style="background-color: #f8f8f8; padding: 15px; border-left: 4px solid #4CAF50; margin: 20px 0;">
            ${activity}
          </div>
          <p>If you did not perform this action, please contact our support team immediately and consider changing your password.</p>
          <p>Best regards,<br>The NIFYA Team</p>
        </div>
      `
    });
  }
}