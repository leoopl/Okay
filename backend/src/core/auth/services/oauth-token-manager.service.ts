import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { OAuthTokenEncryptionService } from './oauth-token-encryption.service';
import { AuditService } from '../../audit/audit.service';
import { AuditAction } from '../../audit/entities/audit-log.entity';
import { Cron, CronExpression } from '@nestjs/schedule';
import { OAuthToken } from '../entities/oauth-token.entity';

/**
 * Service for managing OAuth tokens with encryption
 */
@Injectable()
export class OAuthTokenManagerService {
  private readonly logger = new Logger(OAuthTokenManagerService.name);

  constructor(
    @InjectRepository(OAuthToken)
    private readonly tokenRepository: Repository<OAuthToken>,
    private readonly tokenEncryption: OAuthTokenEncryptionService,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Stores encrypted OAuth tokens
   */
  async storeOAuthTokens(
    userId: string,
    provider: string,
    accessToken: string,
    refreshToken?: string,
    expiresIn?: number,
    scope?: string,
  ): Promise<OAuthToken> {
    try {
      // Revoke existing tokens for this user and provider
      await this.revokeUserTokens(userId, provider, 'new_token_issued');

      // Encrypt tokens
      const encryptedTokens = await this.tokenEncryption.encryptOAuthTokens(
        accessToken,
        refreshToken,
        expiresIn,
      );

      // Create token hash for validation
      const tokenHash = this.tokenEncryption.createTokenHash(accessToken);

      // Create and save token entity
      const tokenEntity = this.tokenRepository.create({
        userId,
        provider,
        encryptedAccessToken: encryptedTokens.accessToken,
        encryptedRefreshToken: encryptedTokens.refreshToken,
        tokenHash,
        expiresAt: encryptedTokens.expiresAt,
        keyId: encryptedTokens.keyId,
        scope,
      });

      const savedToken = await this.tokenRepository.save(tokenEntity);

      // Audit token storage
      await this.auditService.logAction({
        userId,
        action: AuditAction.CREATE,
        resource: 'oauth_token',
        resourceId: savedToken.id,
        details: {
          provider,
          scope,
          expiresAt: encryptedTokens.expiresAt,
        },
      });

      this.logger.log(
        `Stored encrypted OAuth tokens for user ${userId}, provider ${provider}`,
      );
      return savedToken;
    } catch (error) {
      this.logger.error(
        `Failed to store OAuth tokens: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Retrieves and decrypts OAuth tokens for a user
   */
  async getUserTokens(
    userId: string,
    provider: string,
  ): Promise<OAuthToken | null> {
    try {
      const tokenEntity = await this.tokenRepository.findOne({
        where: {
          userId,
          provider,
          revoked: false,
        },
        order: { createdAt: 'DESC' },
      });

      if (!tokenEntity) {
        return null;
      }

      // Check if token is valid
      if (!tokenEntity.isValid()) {
        this.logger.warn(
          `Found invalid OAuth token for user ${userId}, provider ${provider}`,
        );
        return null;
      }

      return tokenEntity;
    } catch (error) {
      this.logger.error(
        `Failed to retrieve OAuth tokens: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Decrypts stored OAuth tokens
   */
  async decryptUserTokens(userId: string, provider: string): Promise<any> {
    const tokenEntity = await this.getUserTokens(userId, provider);

    if (!tokenEntity) {
      throw new NotFoundException(
        `No valid OAuth tokens found for user ${userId}, provider ${provider}`,
      );
    }

    try {
      const encryptedTokens = {
        accessToken: tokenEntity.encryptedAccessToken,
        refreshToken: tokenEntity.encryptedRefreshToken,
        expiresAt: tokenEntity.expiresAt,
        encryptedAt: tokenEntity.createdAt,
        keyId: tokenEntity.keyId,
      };

      const decryptedTokens =
        await this.tokenEncryption.decryptOAuthTokens(encryptedTokens);

      // Audit token access
      await this.auditService.logAction({
        userId,
        action: AuditAction.READ,
        resource: 'oauth_token',
        resourceId: tokenEntity.id,
        details: {
          provider,
          isValid: decryptedTokens.isValid,
        },
      });

      return decryptedTokens;
    } catch (error) {
      this.logger.error(
        `Failed to decrypt OAuth tokens: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Revokes OAuth tokens for a user and provider
   */
  async revokeUserTokens(
    userId: string,
    provider: string,
    reason?: string,
  ): Promise<void> {
    try {
      const tokens = await this.tokenRepository.find({
        where: {
          userId,
          provider,
          revoked: false,
        },
      });

      for (const token of tokens) {
        token.revoke(reason);
        await this.tokenRepository.save(token);

        // Audit token revocation
        await this.auditService.logAction({
          userId,
          action: AuditAction.DELETE,
          resource: 'oauth_token',
          resourceId: token.id,
          details: {
            provider,
            reason,
            revokedAt: token.revokedAt,
          },
        });
      }

      this.logger.log(
        `Revoked ${tokens.length} OAuth tokens for user ${userId}, provider ${provider}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to revoke OAuth tokens: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Validates stored token hash against provided token
   */
  async validateTokenHash(
    userId: string,
    provider: string,
    token: string,
  ): Promise<boolean> {
    try {
      const tokenEntity = await this.getUserTokens(userId, provider);

      if (!tokenEntity) {
        return false;
      }

      return this.tokenEncryption.validateTokenHash(
        token,
        tokenEntity.tokenHash,
      );
    } catch (error) {
      this.logger.error(`Failed to validate token hash: ${error.message}`);
      return false;
    }
  }

  /**
   * Cleans up expired and revoked tokens (runs daily)
   */
  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async cleanupExpiredTokens(): Promise<void> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - 7); // Keep revoked tokens for 7 days

      // Delete expired tokens
      const expiredResult = await this.tokenRepository.delete({
        expiresAt: LessThan(new Date()),
      });

      // Delete old revoked tokens
      const revokedResult = await this.tokenRepository.delete({
        revoked: true,
        revokedAt: LessThan(cutoffDate),
      });

      this.logger.log(
        `Cleaned up ${expiredResult.affected} expired and ${revokedResult.affected} old revoked OAuth tokens`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to cleanup OAuth tokens: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Gets token statistics for monitoring
   */
  async getTokenStatistics(): Promise<any> {
    try {
      const total = await this.tokenRepository.count();
      const active = await this.tokenRepository.count({
        where: { revoked: false, expiresAt: LessThan(new Date()) },
      });
      const expired = await this.tokenRepository.count({
        where: { expiresAt: LessThan(new Date()) },
      });
      const revoked = await this.tokenRepository.count({
        where: { revoked: true },
      });

      const providerStats = await this.tokenRepository
        .createQueryBuilder('token')
        .select('token.provider', 'provider')
        .addSelect('COUNT(*)', 'count')
        .where('token.revoked = false')
        .groupBy('token.provider')
        .getRawMany();

      return {
        total,
        active,
        expired,
        revoked,
        byProvider: providerStats.reduce((acc, stat) => {
          acc[stat.provider] = parseInt(stat.count);
          return acc;
        }, {}),
      };
    } catch (error) {
      this.logger.error(
        `Failed to get token statistics: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }
}
