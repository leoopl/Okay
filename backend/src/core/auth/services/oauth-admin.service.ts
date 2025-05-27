import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../../modules/user/entities/user.entity';
import { AuditLog, AuditAction } from '../../audit/entities/audit-log.entity';
import { UserService } from '../../../modules/user/user.service';
import { GoogleOAuthService } from './google-oauth.service';
import { MoreThan, Not } from 'typeorm';

export interface OAuthHealthCheck {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: Date;
  checks: {
    configuration: boolean;
    database: boolean;
    providers: Record<string, boolean>;
  };
  version: string;
}

export interface OAuthUsageStats {
  totalUsers: number;
  oauthUsers: number;
  providerBreakdown: Record<string, number>;
  newUsersLast30Days: number;
  loginAttemptsLast30Days: number;
  successRate: number;
}

/**
 * Service for OAuth administration and testing
 */
@Injectable()
export class OAuthAdminService {
  private readonly logger = new Logger(OAuthAdminService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly userService: UserService,
    private readonly googleOAuthService: GoogleOAuthService,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(AuditLog)
    private readonly auditRepository: Repository<AuditLog>,
  ) {}

  /**
   * Performs comprehensive OAuth system health check
   */
  async performSystemHealthCheck(): Promise<OAuthHealthCheck> {
    const checks = {
      configuration: await this.checkConfiguration(),
      database: await this.checkDatabase(),
      providers: await this.checkProviders(),
    };

    const allHealthy = Object.values(checks).every((check) =>
      typeof check === 'boolean' ? check : Object.values(check).every(Boolean),
    );

    return {
      status: allHealthy ? 'healthy' : 'degraded',
      timestamp: new Date(),
      checks,
      version: '1.0.0',
    };
  }

  /**
   * Gets OAuth configuration status
   */
  async getConfigurationStatus() {
    return {
      providers: {
        google: {
          enabled: !!this.configService.get('GOOGLE_CLIENT_ID'),
          clientId: this.maskClientId(
            this.configService.get('GOOGLE_CLIENT_ID'),
          ),
          callbackUrl: this.configService.get('GOOGLE_CALLBACK_URL'),
        },
      },
      security: {
        secureCookies: this.configService.get('SECURE_COOKIES'),
        csrfProtection: true,
        rateLimit: {
          enabled: true,
          limit: this.configService.get('OAUTH_THROTTLE_LIMIT', 5),
          windowMs: this.configService.get('OAUTH_THROTTLE_TTL', 300) * 1000,
        },
      },
    };
  }

  /**
   * Gets OAuth usage statistics
   */
  async getUsageStatistics(
    days: number = 30,
    provider?: string,
  ): Promise<OAuthUsageStats> {
    const dateThreshold = new Date();
    dateThreshold.setDate(dateThreshold.getDate() - days);

    // Total users
    const totalUsers = await this.userRepository.count();

    // OAuth users query
    const oauthQuery = this.userRepository
      .createQueryBuilder('user')
      .where('user.googleId IS NOT NULL OR user.auth0Id IS NOT NULL');

    if (provider === 'google') {
      oauthQuery.andWhere('user.googleId IS NOT NULL');
    } else if (provider === 'auth0') {
      oauthQuery.andWhere('user.auth0Id IS NOT NULL');
    }

    const oauthUsers = await oauthQuery.getCount();

    // Provider breakdown
    const googleUsers = await this.userRepository.count({
      where: { googleId: Not(null as any) },
    });
    const auth0Users = await this.userRepository.count({
      where: { auth0Id: Not(null as any) },
    });

    // New users in the last N days
    const newUsersLast30Days = await this.userRepository.count({
      where: {
        createdAt: MoreThan(dateThreshold as any),
      },
    });

    // Login attempts from audit logs
    const loginAttempts = await this.auditRepository.count({
      where: {
        action: AuditAction.LOGIN,
        timestamp: MoreThan(dateThreshold as any),
      },
    });

    const failedAttempts = await this.auditRepository.count({
      where: {
        action: AuditAction.FAILED_LOGIN,
        timestamp: MoreThan(dateThreshold as any),
      },
    });

    const successRate =
      loginAttempts > 0
        ? ((loginAttempts - failedAttempts) / loginAttempts) * 100
        : 0;

    return {
      totalUsers,
      oauthUsers,
      providerBreakdown: {
        google: googleUsers,
        auth0: auth0Users,
      },
      newUsersLast30Days,
      loginAttemptsLast30Days: loginAttempts,
      successRate: Math.round(successRate * 100) / 100,
    };
  }

  /**
   * Gets OAuth audit logs
   */
  async getAuditLogs(options: {
    limit: number;
    offset: number;
    userId?: string;
    provider?: string;
  }) {
    const query = this.auditRepository
      .createQueryBuilder('audit')
      .where('audit.resource = :resource', { resource: 'auth' })
      .orderBy('audit.timestamp', 'DESC')
      .limit(options.limit)
      .offset(options.offset);

    if (options.userId) {
      query.andWhere('audit.userId = :userId', { userId: options.userId });
    }

    if (options.provider) {
      query.andWhere("audit.details->>'provider' = :provider", {
        provider: options.provider,
      });
    }

    const [logs, total] = await query.getManyAndCount();

    return {
      logs,
      total,
      limit: options.limit,
      offset: options.offset,
    };
  }

  /**
   * Gets users with OAuth accounts
   */
  async getOAuthUsers(options: {
    provider?: string;
    limit: number;
    offset: number;
  }) {
    const query = this.userRepository
      .createQueryBuilder('user')
      .select([
        'user.id',
        'user.email',
        'user.name',
        'user.surname',
        'user.createdAt',
      ])
      .addSelect('user.googleId')
      .addSelect('user.auth0Id')
      .where('user.googleId IS NOT NULL OR user.auth0Id IS NOT NULL')
      .orderBy('user.createdAt', 'DESC')
      .limit(options.limit)
      .offset(options.offset);

    if (options.provider === 'google') {
      query.andWhere('user.googleId IS NOT NULL');
    } else if (options.provider === 'auth0') {
      query.andWhere('user.auth0Id IS NOT NULL');
    }

    const [users, total] = await query.getManyAndCount();

    return {
      users: users.map((user) => ({
        id: user.id,
        email: user.email,
        name: user.name,
        surname: user.surname,
        createdAt: user.createdAt,
        providers: {
          google: !!user.googleId,
          auth0: !!user.auth0Id,
        },
      })),
      total,
      limit: options.limit,
      offset: options.offset,
    };
  }

  /**
   * Unlinks OAuth account for a user (admin action)
   */
  async unlinkUserOAuthAccount(userId: string, provider: string) {
    const user = await this.userService.findOne(userId);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (provider === 'google') {
      await this.userService.unlinkGoogleAccount(userId, 'admin');
    } else {
      throw new Error(`Unsupported provider: ${provider}`);
    }

    return { message: `${provider} account unlinked successfully` };
  }

  /**
   * Tests OAuth provider connectivity
   */
  async testProviderConnectivity(provider: string) {
    // Implementation would test OAuth provider endpoints
    // This is a simplified version

    if (provider === 'google') {
      const clientId = this.configService.get('GOOGLE_CLIENT_ID');
      return {
        provider: 'google',
        status: clientId ? 'configured' : 'not_configured',
        timestamp: new Date(),
      };
    }

    throw new Error(`Unsupported provider: ${provider}`);
  }

  /**
   * Simulates OAuth flow for testing
   */
  async simulateOAuthFlow(simulationData: any) {
    // This would be used for testing OAuth flows without actual user interaction
    // Implementation depends on testing requirements

    return {
      simulation: 'completed',
      timestamp: new Date(),
      data: simulationData,
    };
  }

  /**
   * Gets OAuth error analytics
   */
  async getErrorAnalytics(days: number = 7) {
    const dateThreshold = new Date();
    dateThreshold.setDate(dateThreshold.getDate() - days);

    const errors = await this.auditRepository.find({
      where: {
        action: AuditAction.FAILED_LOGIN,
        timestamp: MoreThan(dateThreshold as any),
      },
      order: { timestamp: 'DESC' },
    });

    const errorPatterns = errors.reduce(
      (acc, error) => {
        const errorType = error.details?.error || 'unknown';
        acc[errorType] = (acc[errorType] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    return {
      totalErrors: errors.length,
      errorPatterns,
      timeRange: { days, from: dateThreshold, to: new Date() },
    };
  }

  /**
   * Refreshes OAuth tokens for a user
   */
  async refreshUserTokens(userId: string) {
    // Implementation would refresh stored OAuth tokens
    // This is a placeholder for the actual implementation

    return {
      userId,
      status: 'tokens_refreshed',
      timestamp: new Date(),
    };
  }

  // Private helper methods

  private async checkConfiguration(): Promise<boolean> {
    try {
      const requiredConfig = [
        'GOOGLE_CLIENT_ID',
        'GOOGLE_CLIENT_SECRET',
        'JWT_SECRET',
        'FRONTEND_URL',
      ];

      return requiredConfig.every((key) => !!this.configService.get(key));
    } catch (error) {
      this.logger.error('Configuration check failed', error.stack);
      return false;
    }
  }

  private async checkDatabase(): Promise<boolean> {
    try {
      await this.userRepository.count();
      return true;
    } catch (error) {
      this.logger.error('Database check failed', error.stack);
      return false;
    }
  }

  private async checkProviders(): Promise<Record<string, boolean>> {
    return {
      google: !!this.configService.get('GOOGLE_CLIENT_ID'),
      // Add other providers as they are implemented
    };
  }

  private maskClientId(clientId?: string): string {
    if (!clientId) return 'not_configured';
    return clientId.substring(0, 8) + '...';
  }
}
