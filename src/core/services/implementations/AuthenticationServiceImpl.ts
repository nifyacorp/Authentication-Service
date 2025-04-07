import { AuthenticationService } from '../AuthenticationService';
import { User } from '../../entities/User';
import { JwtPayload, TokenType } from '../../entities/Token';
import { UserRepository } from '../../repositories/UserRepository';
import { TokenRepository } from '../../repositories/TokenRepository';
import { TokenService } from '../TokenService';
import { UserService } from '../UserService';
import { GoogleOAuthService } from '../../../infrastructure/oauth/GoogleOAuthService';
import { 
  AppError, 
  createInvalidCredentialsError, 
  createAccountLockedError, 
  createEmailNotVerifiedError,
  createTokenExpiredError,
  createTokenInvalidError
} from '../../errors/AppError';

/**
 * Implementation of the AuthenticationService
 */
export class AuthenticationServiceImpl implements AuthenticationService {
  private readonly MAX_LOGIN_ATTEMPTS = 5;
  private readonly ACCOUNT_LOCK_DURATION_MINUTES = 30;

  constructor(
    private readonly userService: UserService,
    private readonly userRepository: UserRepository,
    private readonly tokenRepository: TokenRepository,
    private readonly tokenService: TokenService,
    private readonly googleOAuthService: GoogleOAuthService,
    private readonly requireEmailVerification: boolean = true
  ) {}

  /**
   * Authenticate a user with email and password
   */
  public async login(email: string, password: string): Promise<{
    user: User;
    accessToken: string;
    refreshToken: string;
  }> {
    // Find user by email
    const user = await this.userRepository.findByEmail(email);
    if (!user) {
      throw createInvalidCredentialsError();
    }

    // Check if account is locked
    await this.checkAccountLock(user);

    // Verify password
    const isPasswordValid = await this.verifyPassword(password, user.password_hash);
    if (!isPasswordValid) {
      // Increment login attempts on failed login
      await this.handleFailedLogin(user);
      throw createInvalidCredentialsError();
    }

    // Check email verification if required
    if (this.requireEmailVerification && !user.is_email_verified) {
      throw createEmailNotVerifiedError();
    }

    // Reset login attempts on successful login
    await this.userRepository.resetLoginAttempts(user.id);

    // Generate tokens
    const accessToken = this.tokenService.generateAccessToken(user.id, user.email);
    const refreshToken = await this.tokenService.generateRefreshToken(user.id, user.email);

    return {
      user,
      accessToken,
      refreshToken
    };
  }

  /**
   * Refresh an access token using a refresh token
   */
  public async refreshToken(refreshToken: string): Promise<{
    accessToken: string;
    refreshToken: string;
  }> {
    try {
      // Verify the refresh token
      const payload = await this.tokenService.verifyToken(refreshToken, TokenType.REFRESH);
      
      // Find the refresh token in the database
      const storedToken = await this.tokenRepository.findRefreshToken(refreshToken);
      
      if (!storedToken) {
        throw createTokenInvalidError('Refresh token not found');
      }
      
      if (storedToken.is_revoked) {
        throw createTokenInvalidError('Refresh token has been revoked');
      }
      
      // Check if token is expired in the database
      if (new Date(storedToken.expires_at) < new Date()) {
        throw createTokenExpiredError('Refresh token has expired');
      }
      
      // Revoke the old refresh token (token rotation for security)
      await this.tokenRepository.revokeRefreshToken(refreshToken);
      
      // Get the user to ensure they still exist
      const user = await this.userService.getUserById(payload.sub);
      
      // Generate new tokens
      const newAccessToken = this.tokenService.generateAccessToken(user.id, user.email);
      const newRefreshToken = await this.tokenService.generateRefreshToken(user.id, user.email);
      
      return {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken
      };
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw createTokenInvalidError('Invalid refresh token');
    }
  }

  /**
   * Logout a user by revoking their refresh token
   */
  public async logout(refreshToken: string): Promise<void> {
    await this.tokenRepository.revokeRefreshToken(refreshToken);
  }

  /**
   * Revoke all refresh tokens for a user
   */
  public async revokeAllSessions(userId: string): Promise<void> {
    await this.tokenRepository.revokeAllUserTokens(userId);
  }

  /**
   * Verify an access token
   */
  public async verifyAccessToken(token: string): Promise<JwtPayload> {
    return this.tokenService.verifyToken(token, TokenType.ACCESS);
  }

  /**
   * Get Google OAuth authorization URL
   */
  public getGoogleAuthUrl(state: string): string {
    return this.googleOAuthService.generateAuthUrl(state);
  }

  /**
   * Handle Google OAuth authentication
   */
  public async handleGoogleAuth(code: string): Promise<{
    user: User;
    accessToken: string;
    refreshToken: string;
    isNewUser: boolean;
  }> {
    try {
      // Exchange code for tokens
      const { access_token } = await this.googleOAuthService.getTokens(code);
      
      // Get user profile from Google
      const googleProfile = await this.googleOAuthService.getUserProfile(access_token);
      
      if (!googleProfile.email || !googleProfile.verified_email) {
        throw createInvalidCredentialsError('Google account must have a verified email');
      }
      
      // Check if user already exists
      let user = await this.userRepository.findByEmail(googleProfile.email);
      let isNewUser = false;
      
      if (!user) {
        // Create new user
        isNewUser = true;
        
        // Generate a random password (user won't need it for OAuth login)
        const randomPassword = Math.random().toString(36).slice(-10);
        
        user = await this.userService.createUser({
          email: googleProfile.email,
          password: randomPassword,
          name: googleProfile.name || null
        });
        
        // Set email as verified since Google already verified it
        await this.userRepository.markEmailAsVerified(user.id);
        
        // Refetch user to get updated data
        user = await this.userService.getUserById(user.id);
      }
      
      // Generate tokens
      const accessToken = this.tokenService.generateAccessToken(user.id, user.email);
      const refreshToken = await this.tokenService.generateRefreshToken(user.id, user.email);
      
      return {
        user,
        accessToken,
        refreshToken,
        isNewUser
      };
    } catch (error) {
      console.error('Google OAuth error:', error);
      if (error instanceof AppError) {
        throw error;
      }
      throw createInvalidCredentialsError('Failed to authenticate with Google');
    }
  }

  /**
   * Verify a password against its hash
   */
  private async verifyPassword(password: string, hash: string): Promise<boolean> {
    const bcrypt = require('bcryptjs');
    return bcrypt.compare(password, hash);
  }

  /**
   * Check if an account is locked and throw an error if it is
   */
  private async checkAccountLock(user: User): Promise<void> {
    if (user.locked_until && new Date(user.locked_until) > new Date()) {
      const lockTimeRemaining = Math.ceil(
        (new Date(user.locked_until).getTime() - new Date().getTime()) / 60000
      );
      throw createAccountLockedError(
        `Account is locked. Try again in ${lockTimeRemaining} minutes.`
      );
    }
  }

  /**
   * Handle a failed login attempt
   */
  private async handleFailedLogin(user: User): Promise<void> {
    await this.userRepository.incrementLoginAttempts(user.id);
    
    // If max attempts reached, lock the account
    if (user.login_attempts + 1 >= this.MAX_LOGIN_ATTEMPTS) {
      const lockUntil = new Date();
      lockUntil.setMinutes(lockUntil.getMinutes() + this.ACCOUNT_LOCK_DURATION_MINUTES);
      await this.userRepository.lockAccount(user.id, lockUntil);
    }
  }
}