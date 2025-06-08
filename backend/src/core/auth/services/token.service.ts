import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan, MoreThan } from 'typeorm';
import { RefreshToken } from '../entities/refresh-token.entity';
import { JwtPayload } from '../interfaces/jwt-payload.interface';
import { TokenUtil } from '../utils/token.util';
import { UserService } from '../../../modules/user/user.service';
import { EncryptionService } from '../../../common/encryption/encryption.service';
import { DeviceInfo } from '../interfaces/device-info.interface';

/**
 * Service for managing JWT access tokens and refresh tokens
 */
@Injectable()
export class TokenService {
  private readonly logger = new Logger(TokenService.name);

  constructor(
    @InjectRepository(RefreshToken)
    private readonly refreshTokenRepository: Repository<RefreshToken>,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly userService: UserService,
    private readonly encryptionService: EncryptionService,
  ) {}

  /**
   * Generate JWT access token
   */
  async generateAccessToken(payload: JwtPayload): Promise<string> {
    return this.jwtService.sign(payload);
  }

  /**
   * Generate and store refresh token
   */
  async generateRefreshToken(
    userId: string,
    deviceFingerprint: string,
    deviceInfo: DeviceInfo,
  ): Promise<RefreshToken> {
    try {
      // Generate secure refresh token
      const token = TokenUtil.generateSecureToken(64);

      // Calculate expiration
      const expiresIn = this.configService.get<string>(
        'JWT_REFRESH_EXPIRATION',
        '7d',
      );
      const expiresAt = TokenUtil.calculateExpiration(expiresIn);

      // Encrypt token for storage
      const encryptedData = this.encryptionService.encrypt(token);

      // Create refresh token entity
      const refreshToken = this.refreshTokenRepository.create({
        token,
        encryptedToken: JSON.stringify(encryptedData),
        userId,
        deviceFingerprint,
        deviceInfo: JSON.stringify(deviceInfo),
        ipAddress: deviceInfo.ip,
        userAgent: deviceInfo.userAgent,
        expiresAt,
      });

      // Save to database
      await this.refreshTokenRepository.save(refreshToken);

      // Clean up expired tokens for this user
      await this.cleanupExpiredTokens(userId);

      return refreshToken;
    } catch (error) {
      this.logger.error(
        `Error generating refresh token: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Validate and rotate refresh token
   */
  async rotateRefreshToken(
    token: string,
    deviceInfo: DeviceInfo,
  ): Promise<{ user: any; newRefreshToken: RefreshToken }> {
    try {
      // Find the refresh token
      const existingToken = await this.refreshTokenRepository.findOne({
        where: { token },
        relations: ['user'],
      });

      if (!existingToken) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      // Validate token
      if (!existingToken.isValid()) {
        // Check if token was already used (potential token reuse attack)
        if (existingToken.revoked && existingToken.replacedByToken) {
          this.logger.warn(
            `Attempted reuse of revoked token for user ${existingToken.userId}`,
          );

          // Revoke all tokens for this user as a security measure
          await this.revokeAllUserTokens(
            existingToken.userId,
            'token_reuse_detected',
          );
        }

        throw new UnauthorizedException('Invalid refresh token');
      }

      // Verify device fingerprint matches (optional stricter security)
      if (existingToken.deviceFingerprint !== deviceInfo.fingerprint) {
        this.logger.warn(
          `Device fingerprint mismatch for user ${existingToken.userId}`,
        );
        // You can choose to reject or allow with additional verification
      }

      // Get full user data
      const user = await this.userService.findOne(existingToken.userId);

      // Generate new refresh token
      const newRefreshToken = await this.generateRefreshToken(
        existingToken.userId,
        existingToken.deviceFingerprint,
        deviceInfo,
      );

      // Revoke old token and link to new one
      existingToken.revoke('token_rotation');
      existingToken.replacedByToken = newRefreshToken.token;
      await this.refreshTokenRepository.save(existingToken);

      return { user, newRefreshToken };
    } catch (error) {
      this.logger.error(
        `Error rotating refresh token: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Revoke a specific refresh token
   */
  async revokeRefreshToken(token: string, reason: string): Promise<void> {
    const refreshToken = await this.refreshTokenRepository.findOne({
      where: { token },
    });

    if (refreshToken && !refreshToken.revoked) {
      refreshToken.revoke(reason);
      await this.refreshTokenRepository.save(refreshToken);
    }
  }

  /**
   * Revoke refresh token by ID
   */
  async revokeRefreshTokenById(tokenId: string, reason: string): Promise<void> {
    const refreshToken = await this.refreshTokenRepository.findOne({
      where: { id: tokenId },
    });

    if (refreshToken && !refreshToken.revoked) {
      refreshToken.revoke(reason);
      await this.refreshTokenRepository.save(refreshToken);
    }
  }

  /**
   * Revoke all refresh tokens for a user
   */
  async revokeAllUserTokens(userId: string, reason: string): Promise<void> {
    await this.refreshTokenRepository.update(
      { userId, revoked: false },
      {
        revoked: true,
        revokedAt: new Date(),
        revokedReason: reason,
      },
    );
  }

  /**
   * Clean up expired tokens
   */
  async cleanupExpiredTokens(userId?: string): Promise<void> {
    try {
      const whereCondition: any = {
        expiresAt: LessThan(new Date()),
      };

      if (userId) {
        whereCondition.userId = userId;
      }

      const result = await this.refreshTokenRepository.delete(whereCondition);

      if (result.affected && result.affected > 0) {
        this.logger.debug(`Cleaned up ${result.affected} expired tokens`);
      }
    } catch (error) {
      this.logger.error(
        `Error cleaning up expired tokens: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Get active refresh tokens for user
   */
  async getUserActiveTokens(userId: string): Promise<RefreshToken[]> {
    return this.refreshTokenRepository.find({
      where: {
        userId,
        revoked: false,
        expiresAt: MoreThan(new Date()),
      },
      order: {
        createdAt: 'DESC',
      },
    });
  }

  /**
   * Verify JWT access token
   */
  async verifyAccessToken(token: string): Promise<JwtPayload> {
    try {
      return this.jwtService.verify<JwtPayload>(token);
    } catch (error) {
      throw new UnauthorizedException('Invalid access token');
    }
  }

  /**
   * Generate CSRF token
   */
  generateCsrfToken(): string {
    return TokenUtil.generateSecureToken(32);
  }

  /**
   * Get access token expiration in seconds
   */
  getAccessTokenExpiresIn(): number {
    const expiration = this.configService.get<string>(
      'JWT_ACCESS_EXPIRATION',
      '15m',
    );
    return TokenUtil.parseExpirationToSeconds(expiration);
  }

  /**
   * Check if user has reached device limit
   */
  async checkDeviceLimit(userId: string): Promise<boolean> {
    const maxSessions = this.configService.get<number>(
      'MAX_SESSIONS_PER_USER',
      5,
    );

    const activeTokens = await this.refreshTokenRepository.count({
      where: {
        userId,
        revoked: false,
        expiresAt: LessThan(new Date()),
      },
    });

    return activeTokens >= maxSessions;
  }

  /**
   * Revoke oldest session if device limit reached
   */
  async revokeOldestSessionIfNeeded(userId: string): Promise<void> {
    const hasReachedLimit = await this.checkDeviceLimit(userId);

    if (hasReachedLimit) {
      // Find oldest active token
      const oldestToken = await this.refreshTokenRepository.findOne({
        where: {
          userId,
          revoked: false,
        },
        order: {
          createdAt: 'ASC',
        },
      });

      if (oldestToken) {
        await this.revokeRefreshToken(
          oldestToken.token,
          'device_limit_reached',
        );
      }
    }
  }
}
