import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as crypto from 'crypto';
import { Response, Request } from 'express';
import { UserService } from '../../../modules/user/user.service';
import { RefreshToken } from '../entities/refresh-token.entity';
import { TokenBlacklist } from '../entities/token-blacklist.entity';
import { User } from '../../../modules/user/entities/user.entity';
import { AuditService } from '../../audit/audit.service';
import { AuditAction } from '../../audit/entities/audit-log.entity';
import { SecureTokenService } from './secure-token.service'; // NEW IMPORT

export interface TokenPayload {
  sub: string;
  email: string;
  roles: string[];
  permissions?: string[];
  scopes?: string[];
  jti?: string;
  aud?: string;
  iss?: string;
  exp?: number;
}

@Injectable()
export class TokenService {
  clearRefreshTokenCookie(res: Response<any, Record<string, any>>) {
    throw new Error('Method not implemented.');
  }
  private readonly logger = new Logger(TokenService.name);
  private readonly accessTokenExpiration: string;
  private readonly refreshTokenExpiration: string;
  private readonly jwtSecret: string;

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly userService: UserService,
    private readonly auditService: AuditService,
    private readonly secureTokenService: SecureTokenService, // NEW DEPENDENCY
    @InjectRepository(RefreshToken)
    private readonly refreshTokenRepository: Repository<RefreshToken>,
    @InjectRepository(TokenBlacklist)
    private readonly tokenBlacklistRepository: Repository<TokenBlacklist>,
  ) {
    this.accessTokenExpiration = configService.get<string>(
      'JWT_ACCESS_EXPIRATION',
    );
    this.refreshTokenExpiration = configService.get<string>(
      'JWT_REFRESH_EXPIRATION',
    );
    this.jwtSecret = configService.get<string>('JWT_SECRET');
  }

  /**
   * Generate JWT access token (unchanged)
   */
  async generateAccessToken(user: User): Promise<string> {
    const tokenId = crypto.randomUUID();
    const roles = user.roles?.map((role) => role.name) || [];

    const permissions = new Set<string>();
    user.roles?.forEach((role) => {
      role.permissions?.forEach((permission) => {
        permissions.add(permission.name);
      });
    });

    const payload: TokenPayload = {
      sub: user.id,
      email: user.email,
      roles,
      permissions: Array.from(permissions),
      jti: tokenId,
    };

    return this.jwtService.signAsync(payload, {
      secret: this.jwtSecret,
      expiresIn: this.accessTokenExpiration,
      audience: this.configService.get<string>('JWT_AUDIENCE'),
      issuer: this.configService.get<string>('JWT_ISSUER'),
    });
  }

  /**
   * Generate refresh token and store it in the database (unchanged)
   */
  async generateRefreshToken(
    userId: string,
    ip: string,
    userAgent: string,
  ): Promise<string> {
    const tokenValue = crypto.randomBytes(64).toString('hex');

    const refreshToken = this.refreshTokenRepository.create({
      userId,
      token: tokenValue,
      expiresAt: new Date(
        Date.now() + this.parseTimeToMs(this.refreshTokenExpiration),
      ),
      createdByIp: ip,
      userAgent: userAgent,
    });

    await this.refreshTokenRepository.save(refreshToken);
    return tokenValue;
  }

  /**
   * Set authentication cookies using secure service (UPDATED)
   */
  setAuthCookies(
    response: Response,
    accessToken: string,
    refreshToken: string,
    expiresIn: number,
    csrfToken?: string,
  ): string {
    return this.secureTokenService.setSecureAuthCookies(
      response,
      accessToken,
      refreshToken,
      expiresIn,
      csrfToken,
    );
  }

  /**
   * Extract access token from secure cookie (UPDATED)
   */
  extractAccessToken(request: Request): string | null {
    return this.secureTokenService.extractAccessToken(request);
  }

  /**
   * Extract refresh token from secure cookie (UPDATED)
   */
  extractRefreshToken(request: Request): string | null {
    return this.secureTokenService.extractRefreshToken(request);
  }

  /**
   * Clear authentication cookies (UPDATED)
   */
  clearAuthCookies(response: Response): void {
    this.secureTokenService.clearAuthCookies(response);
  }

  /**
   * Verify access token (unchanged)
   */
  async verifyAccessToken(token: string): Promise<TokenPayload> {
    try {
      const payload = await this.jwtService.verifyAsync<TokenPayload>(token, {
        secret: this.jwtSecret,
      });

      const isBlacklisted = await this.isTokenBlacklisted(payload.jti);
      if (isBlacklisted) {
        throw new Error('Token has been revoked');
      }

      return payload;
    } catch (error) {
      this.logger.error(`Token verification failed: ${error.message}`);
      throw new Error('Invalid token');
    }
  }

  /**
   * Validate and rotate refresh token
   */
  async rotateRefreshToken(
    oldToken: string,
    ip: string,
    userAgent: string,
  ): Promise<{ user: User; accessToken: string; refreshToken: string }> {
    const refreshTokenEntity = await this.refreshTokenRepository.findOne({
      where: { token: oldToken, revoked: false },
    });

    if (!refreshTokenEntity) {
      throw new Error('Invalid refresh token');
    }

    if (new Date() > refreshTokenEntity.expiresAt) {
      throw new Error('Refresh token expired');
    }

    // Get the user
    const user = await this.userService.findOne(refreshTokenEntity.userId);

    // Revoke the old token
    refreshTokenEntity.revoked = true;
    refreshTokenEntity.revokedByIp = ip;
    refreshTokenEntity.replacedByToken = 'Pending generation';
    await this.refreshTokenRepository.save(refreshTokenEntity);

    // Generate new tokens
    const accessToken = await this.generateAccessToken(user);
    const newRefreshToken = await this.generateRefreshToken(
      user.id,
      ip,
      userAgent,
    );

    // Update the old token with reference to the new one
    refreshTokenEntity.replacedByToken = newRefreshToken;
    await this.refreshTokenRepository.save(refreshTokenEntity);

    // Audit the token rotation
    await this.auditService.logAction({
      userId: user.id,
      action: AuditAction.LOGIN, // Using login action for token refresh
      resource: 'auth',
      details: {
        method: 'token_refresh',
        ip,
        userAgent,
      },
    });

    return { user, accessToken, refreshToken: newRefreshToken };
  }

  /**
   * Revoke user's refresh tokens
   */
  async revokeUserRefreshTokens(userId: string, ip: string): Promise<void> {
    const tokens = await this.refreshTokenRepository.find({
      where: { userId, revoked: false },
    });

    for (const token of tokens) {
      token.revoked = true;
      token.revokedByIp = ip;
      await this.refreshTokenRepository.save(token);
    }

    // Audit the token revocation
    await this.auditService.logAction({
      userId,
      action: AuditAction.LOGOUT,
      resource: 'auth',
      details: {
        method: 'token_revocation',
        ip,
      },
    });
  }

  /**
   * Add a JWT token to the blacklist
   */
  async blacklistToken(jti: string, expiresAt: Date): Promise<void> {
    const blacklistedToken = this.tokenBlacklistRepository.create({
      jti,
      expiresAt,
    });

    await this.tokenBlacklistRepository.save(blacklistedToken);
  }

  /**
   * Check if a token is blacklisted
   */
  async isTokenBlacklisted(jti: string): Promise<boolean> {
    if (!jti) return false;

    const blacklistedToken = await this.tokenBlacklistRepository.findOne({
      where: { jti },
    });

    return !!blacklistedToken;
  }

  /**
   * Clean up expired tokens
   * Should be run on a schedule
   */
  async cleanupExpiredTokens(): Promise<void> {
    const now = new Date();

    // Clean up expired refresh tokens
    await this.refreshTokenRepository
      .createQueryBuilder()
      .delete()
      .where('expiresAt < :now', { now })
      .execute();

    // Clean up expired blacklisted tokens
    await this.tokenBlacklistRepository
      .createQueryBuilder()
      .delete()
      .where('expiresAt < :now', { now })
      .execute();
  }

  /**
   * Helper to parse time string to milliseconds
   */
  private parseTimeToMs(time: string): number {
    const unit = time.slice(-1);
    const value = parseInt(time.slice(0, -1), 10);

    switch (unit) {
      case 's':
        return value * 1000;
      case 'm':
        return value * 60 * 1000;
      case 'h':
        return value * 60 * 60 * 1000;
      case 'd':
        return value * 24 * 60 * 60 * 1000;
      default:
        return parseInt(time, 10);
    }
  }
}
