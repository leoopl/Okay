import * as crypto from 'crypto';
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { Request, Response } from 'express';
import { JwtService } from '@nestjs/jwt';
import { RefreshToken } from '../entities/refresh-token.entity';
import { User } from '../../../modules/user/entities/user.entity';
import { AuditService } from '../../audit/audit.service';
import { AuditAction } from '../../audit/entities/audit-log.entity';
import { SecureTokenService } from './secure-token.service';
import { CsrfMiddleware } from 'src/common/middleware/csrf.middleware';
import { UserService } from 'src/modules/user/user.service';

export interface TokenRefreshResult {
  success: boolean;
  accessToken?: string;
  refreshToken?: string;
  sessionId?: string;
  csrfToken?: string;
  expiresIn?: number;
  error?: string;
  requiresReauth?: boolean;
}

@Injectable()
export class TokenRefreshService {
  private readonly logger = new Logger(TokenRefreshService.name);
  private readonly refreshMutex = new Map<
    string,
    Promise<TokenRefreshResult>
  >();

  constructor(
    @InjectRepository(RefreshToken)
    private refreshTokenRepository: Repository<RefreshToken>,
    private userService: UserService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private auditService: AuditService,
    private secureTokenService: SecureTokenService,
    private csrfMiddleware: CsrfMiddleware,
  ) {}

  /**
   * Refresh tokens with comprehensive security checks
   */
  async refreshTokens(
    req: Request,
    res: Response,
  ): Promise<TokenRefreshResult> {
    const refreshToken = this.secureTokenService.extractRefreshToken(req);
    const sessionId = req.cookies['session-id'];
    const ipAddress = this.getIpAddress(req);
    const userAgent = req.headers['user-agent'] || 'unknown';

    if (!refreshToken) {
      return {
        success: false,
        error: 'No refresh token provided',
        requiresReauth: true,
      };
    }

    if (!sessionId) {
      return {
        success: false,
        error: 'No session identifier',
        requiresReauth: true,
      };
    }

    // Prevent concurrent refresh attempts for same token
    const mutexKey = `${refreshToken}-${sessionId}`;
    if (this.refreshMutex.has(mutexKey)) {
      return this.refreshMutex.get(mutexKey)!;
    }

    const refreshPromise = this.performTokenRefresh(
      refreshToken,
      sessionId,
      ipAddress,
      userAgent,
      req,
      res,
    );

    this.refreshMutex.set(mutexKey, refreshPromise);

    try {
      return await refreshPromise;
    } finally {
      this.refreshMutex.delete(mutexKey);
    }
  }

  /**
   * Perform the actual token refresh with security validations
   */
  private async performTokenRefresh(
    refreshToken: string,
    sessionId: string,
    ipAddress: string,
    userAgent: string,
    req: Request,
    res: Response,
  ): Promise<TokenRefreshResult> {
    try {
      // Find and validate refresh token
      const tokenEntity = await this.refreshTokenRepository.findOne({
        where: { token: refreshToken, revoked: false },
      });

      if (!tokenEntity) {
        this.logger.warn(`Invalid refresh token attempt from ${ipAddress}`);
        await this.auditService.logAction({
          userId: 'unknown',
          action: AuditAction.FAILED_LOGIN,
          resource: 'auth',
          details: {
            reason: 'invalid_refresh_token',
            ipAddress,
            userAgent,
          },
        });

        return {
          success: false,
          error: 'Invalid refresh token',
          requiresReauth: true,
        };
      }

      // Check token expiration
      if (new Date() > tokenEntity.expiresAt) {
        this.logger.warn(
          `Expired refresh token used by user ${tokenEntity.userId}`,
        );

        tokenEntity.revoked = true;
        tokenEntity.revokedByIp = ipAddress;
        await this.refreshTokenRepository.save(tokenEntity);

        return {
          success: false,
          error: 'Refresh token expired',
          requiresReauth: true,
        };
      }

      // Get user data for token generation
      const userTokenData = await this.userService.getUserForTokenGeneration(
        tokenEntity.userId,
      );

      if (!userTokenData) {
        this.logger.error(
          `User not found for refresh token: ${tokenEntity.userId}`,
        );
        return {
          success: false,
          error: 'User not found',
          requiresReauth: true,
        };
      }

      const { user } = userTokenData;

      // Security checks
      const securityIssues = await this.performSecurityChecks(
        tokenEntity,
        ipAddress,
        userAgent,
      );

      if (securityIssues.length > 0) {
        this.logger.warn(
          `Security issues during token refresh for user ${user.id}: ${securityIssues.join(', ')}`,
        );

        if (
          securityIssues.some(
            (issue) =>
              issue.includes('suspicious') || issue.includes('location'),
          )
        ) {
          await this.revokeUserTokens(user.id, ipAddress, 'security_concern');
          return {
            success: false,
            error: 'Security validation failed',
            requiresReauth: true,
          };
        }
      }

      // Revoke old refresh token (token rotation)
      tokenEntity.revoked = true;
      tokenEntity.revokedByIp = ipAddress;
      tokenEntity.replacedByToken = 'pending';
      await this.refreshTokenRepository.save(tokenEntity);

      // Generate new tokens
      const accessToken = await this.generateAccessToken(userTokenData);
      const newRefreshToken = await this.generateRefreshToken(
        user.id,
        ipAddress,
        userAgent,
      );

      // Update old token with reference to new one
      tokenEntity.replacedByToken = newRefreshToken;
      await this.refreshTokenRepository.save(tokenEntity);

      // Generate new session ID and CSRF token
      const newSessionId = this.secureTokenService.setSecureAuthCookies(
        res,
        accessToken,
        newRefreshToken,
        this.getAccessTokenExpiration(),
      );

      const csrfToken = this.csrfMiddleware.generateSecureToken(
        newSessionId,
        res,
      );

      // Audit successful refresh
      await this.auditService.logAction({
        userId: user.id,
        action: AuditAction.LOGIN,
        resource: 'auth',
        details: {
          method: 'token_refresh',
          ipAddress,
          userAgent,
          securityIssues:
            securityIssues.length > 0 ? securityIssues : undefined,
        },
      });

      return {
        success: true,
        accessToken,
        refreshToken: newRefreshToken,
        sessionId: newSessionId,
        csrfToken,
        expiresIn: this.getAccessTokenExpiration(),
      };
    } catch (error) {
      this.logger.error(`Token refresh error: ${error.message}`, error.stack);
      return {
        success: false,
        error: 'Token refresh failed',
        requiresReauth: false,
      };
    }
  }

  /**
   * Perform comprehensive security checks during token refresh
   */
  private async performSecurityChecks(
    tokenEntity: RefreshToken,
    currentIp: string,
    currentUserAgent: string,
  ): Promise<string[]> {
    const issues: string[] = [];

    // Check IP address consistency
    if (tokenEntity.createdByIp && tokenEntity.createdByIp !== currentIp) {
      issues.push('IP address changed');

      // Additional check for suspicious IP changes
      if (await this.isSuspiciousIpChange(tokenEntity.createdByIp, currentIp)) {
        issues.push('suspicious location change');
      }
    }

    // Check user agent consistency (basic check)
    if (tokenEntity.userAgent && tokenEntity.userAgent !== currentUserAgent) {
      issues.push('User agent changed');
    }

    // Check for rapid token usage patterns
    const recentTokens = await this.refreshTokenRepository.count({
      where: {
        userId: tokenEntity.userId,
        createdAt: new Date(Date.now() - 60 * 60 * 1000), // Last hour
        revoked: true,
      },
    });

    if (recentTokens > 5) {
      issues.push('high token rotation frequency');
    }

    return issues;
  }

  /**
   * Check if IP change is suspicious (implement geo-location logic)
   */
  private async isSuspiciousIpChange(
    oldIp: string,
    newIp: string,
  ): Promise<boolean> {
    // This is a placeholder - implement actual geo-location checking
    // You could use services like MaxMind GeoIP2 or similar

    // For now, return false for same private networks
    const isOldPrivate = this.isPrivateIp(oldIp);
    const isNewPrivate = this.isPrivateIp(newIp);

    // If both are private IPs, likely same network
    return !(isOldPrivate && isNewPrivate);
  }

  /**
   * Check if IP is in private range
   */
  private isPrivateIp(ip: string): boolean {
    const privateRanges = [
      /^10\./,
      /^172\.(1[6-9]|2[0-9]|3[0-1])\./,
      /^192\.168\./,
      /^127\./,
      /^::1$/,
      /^fc00:/,
    ];

    return privateRanges.some((range) => range.test(ip));
  }

  /**
   * Generate new access token with all claims
   */
  private async generateAccessToken(userTokenData: {
    user: User;
    roles: string[];
    permissions: string[];
  }): Promise<string> {
    const { user, roles, permissions } = userTokenData;

    const payload = {
      sub: user.id,
      email: user.email,
      roles,
      permissions,
      jti: crypto.randomUUID(),
    };

    return this.jwtService.signAsync(payload, {
      secret: this.configService.get<string>('JWT_SECRET'),
      expiresIn: this.configService.get<string>('JWT_ACCESS_EXPIRATION'),
      audience: this.configService.get<string>('JWT_AUDIENCE'),
      issuer: this.configService.get<string>('JWT_ISSUER'),
    });
  }

  /**
   * Generate new refresh token
   */
  private async generateRefreshToken(
    userId: string,
    ipAddress: string,
    userAgent: string,
  ): Promise<string> {
    const tokenValue = crypto.randomBytes(64).toString('hex');

    const refreshToken = this.refreshTokenRepository.create({
      userId,
      token: tokenValue,
      expiresAt: new Date(Date.now() + this.getRefreshTokenExpiration()),
      createdByIp: ipAddress,
      userAgent,
    });

    await this.refreshTokenRepository.save(refreshToken);
    return tokenValue;
  }

  /**
   * Revoke all refresh tokens for a user
   */
  private async revokeUserTokens(
    userId: string,
    ipAddress: string,
    reason: string,
  ): Promise<void> {
    await this.refreshTokenRepository.update(
      { userId, revoked: false },
      { revoked: true, revokedByIp: ipAddress },
    );

    await this.auditService.logAction({
      userId,
      action: AuditAction.LOGOUT,
      resource: 'auth',
      details: { reason, revokedBy: ipAddress },
    });
  }

  private getAccessTokenExpiration(): number {
    const expiration = this.configService.get<string>(
      'JWT_ACCESS_EXPIRATION',
      '15m',
    );
    return this.parseTimeToSeconds(expiration);
  }

  private getRefreshTokenExpiration(): number {
    const expiration = this.configService.get<string>(
      'JWT_REFRESH_EXPIRATION',
      '7d',
    );
    return this.parseTimeToMs(expiration);
  }

  private parseTimeToSeconds(time: string): number {
    const unit = time.slice(-1);
    const value = parseInt(time.slice(0, -1), 10);

    switch (unit) {
      case 's':
        return value;
      case 'm':
        return value * 60;
      case 'h':
        return value * 60 * 60;
      case 'd':
        return value * 24 * 60 * 60;
      default:
        return parseInt(time, 10);
    }
  }

  private parseTimeToMs(time: string): number {
    return this.parseTimeToSeconds(time) * 1000;
  }

  private getIpAddress(req: Request): string {
    const forwarded = req.headers['x-forwarded-for'];
    if (forwarded) {
      return Array.isArray(forwarded)
        ? forwarded[0]
        : forwarded.split(',')[0].trim();
    }
    return req.ip || 'unknown';
  }
}
