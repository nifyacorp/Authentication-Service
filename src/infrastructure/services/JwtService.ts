import { sign, verify } from 'jsonwebtoken';
import { TokenService } from '../../core/services/TokenService';
import { JwtPayload, TokenType } from '../../core/entities/Token';
import { 
  AppError, 
  createTokenExpiredError,
  createTokenInvalidError,
  createInternalError 
} from '../../core/errors/AppError';
import { TokenRepository } from '../../core/repositories/TokenRepository';

/**
 * Service for JWT token operations
 */
export class JwtTokenService implements TokenService {
  constructor(
    private readonly secret: string,
    private readonly tokenRepository: TokenRepository,
    private readonly accessTokenExpiresIn: string = '15m',
    private readonly refreshTokenExpiresIn: string = '7d',
    private readonly verificationTokenExpiresIn: string = '24h',
    private readonly passwordResetTokenExpiresIn: string = '1h'
  ) {}

  /**
   * Generate an access token
   */
  public generateAccessToken(userId: string, email: string): string {
    const payload: Omit<JwtPayload, 'iat' | 'exp'> = {
      sub: userId,
      email,
      type: TokenType.ACCESS
    };

    return sign(payload, this.secret, { expiresIn: this.accessTokenExpiresIn });
  }

  /**
   * Generate a refresh token
   */
  public async generateRefreshToken(userId: string, email: string): Promise<string> {
    const payload: Omit<JwtPayload, 'iat' | 'exp'> = {
      sub: userId,
      email,
      type: TokenType.REFRESH,
      jti: crypto.randomUUID() // Add a unique token identifier
    };

    const token = sign(payload, this.secret, { expiresIn: this.refreshTokenExpiresIn });
    
    // Store the refresh token in the database
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days from now
    
    await this.tokenRepository.createRefreshToken(userId, token, expiresAt);
    
    return token;
  }

  /**
   * Generate a verification token
   */
  public generateVerificationToken(userId: string, email: string): string {
    const payload: Omit<JwtPayload, 'iat' | 'exp'> = {
      sub: userId,
      email,
      type: TokenType.EMAIL_VERIFICATION
    };

    return sign(payload, this.secret, { expiresIn: this.verificationTokenExpiresIn });
  }

  /**
   * Generate a password reset token
   */
  public generatePasswordResetToken(userId: string, email: string): string {
    const payload: Omit<JwtPayload, 'iat' | 'exp'> = {
      sub: userId,
      email,
      type: TokenType.PASSWORD_RESET
    };

    return sign(payload, this.secret, { expiresIn: this.passwordResetTokenExpiresIn });
  }

  /**
   * Verify and decode a token
   */
  public async verifyToken(token: string, type: TokenType): Promise<JwtPayload> {
    try {
      // Verify the token signature and expiration
      const decoded = verify(token, this.secret) as JwtPayload;
      
      // Verify the token type
      if (decoded.type !== type) {
        throw createTokenInvalidError('Invalid token type');
      }

      // Additional checks for refresh tokens
      if (type === TokenType.REFRESH) {
        // Check if token exists in database and is not revoked
        const storedToken = await this.tokenRepository.findRefreshToken(token);
        
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
      }
      
      return decoded;
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      
      if (error.name === 'TokenExpiredError') {
        throw createTokenExpiredError();
      }
      
      if (error.name === 'JsonWebTokenError') {
        throw createTokenInvalidError(error.message);
      }
      
      throw createInternalError('Error verifying token', { error });
    }
  }

  /**
   * Delete expired tokens from the database
   */
  public async cleanupExpiredTokens(): Promise<void> {
    try {
      const count = await this.tokenRepository.deleteExpiredTokens();
      console.log(`Deleted ${count} expired tokens`);
    } catch (error) {
      console.error('Error cleaning up expired tokens:', error);
      throw createInternalError('Failed to clean up expired tokens', { error });
    }
  }
}