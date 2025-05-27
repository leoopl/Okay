import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UserService } from '../../../modules/user/user.service';
import { OAuthCacheService } from './oauth-cache.service';
import { AuditService } from '../../audit/audit.service';

export interface PerformanceMetrics {
  avgResponseTime: number;
  cacheHitRate: number;
  databaseQueries: number;
  totalRequests: number;
  errorRate: number;
}

/**
 * Service for OAuth performance optimization and monitoring
 */
@Injectable()
export class OAuthPerformanceService {
  private readonly logger = new Logger(OAuthPerformanceService.name);
  private readonly metrics = {
    responseTime: [] as number[],
    cacheHits: 0,
    cacheMisses: 0,
    databaseQueries: 0,
    totalRequests: 0,
    errors: 0,
  };

  constructor(
    private readonly configService: ConfigService,
    private readonly userService: UserService,
    private readonly cacheService: OAuthCacheService,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Optimized user lookup with caching
   */
  async getOptimizedUser(userId: string): Promise<any> {
    const startTime = Date.now();
    this.metrics.totalRequests++;

    try {
      // Try cache first
      const cachedUser = this.cacheService.getCachedUser(userId);
      if (cachedUser) {
        this.metrics.cacheHits++;
        this.recordResponseTime(Date.now() - startTime);
        return cachedUser;
      }

      // Cache miss - fetch from database
      this.metrics.cacheMisses++;
      this.metrics.databaseQueries++;

      const user = await this.userService.findOne(userId);
      if (!user) {
        throw new Error(`User not found: ${userId}`);
      }

      // Prepare cache data
      const userData = {
        user,
        roles: user.roles?.map((r) => r.name) || [],
        permissions: this.extractPermissions(user),
        profileData: {
          id: user.id,
          email: user.email,
          name: user.name,
          surname: user.surname,
          profilePictureUrl: user.profilePictureUrl,
        },
      };

      // Cache for future requests
      this.cacheService.cacheUser(userId, userData);

      this.recordResponseTime(Date.now() - startTime);
      return userData;
    } catch (error) {
      this.metrics.errors++;
      this.logger.error(`Error in optimized user lookup: ${error.message}`);
      throw error;
    }
  }

  /**
   * Batch user lookup for multiple users
   */
  async getBatchUsers(userIds: string[]): Promise<Map<string, any>> {
    const startTime = Date.now();
    const results = new Map<string, any>();
    const uncachedUsers: string[] = [];

    try {
      // Check cache for all users first
      for (const userId of userIds) {
        const cachedUser = this.cacheService.getCachedUser(userId);
        if (cachedUser) {
          results.set(userId, cachedUser);
          this.metrics.cacheHits++;
        } else {
          uncachedUsers.push(userId);
          this.metrics.cacheMisses++;
        }
      }

      // Fetch uncached users from database in batch
      if (uncachedUsers.length > 0) {
        this.metrics.databaseQueries++;

        // This would require implementing batch user lookup in UserService
        // For now, we'll fetch individually but this could be optimized
        for (const userId of uncachedUsers) {
          try {
            const user = await this.userService.findOne(userId);
            if (user) {
              const userData = {
                user,
                roles: user.roles?.map((r) => r.name) || [],
                permissions: this.extractPermissions(user),
                profileData: {
                  id: user.id,
                  email: user.email,
                  name: user.name,
                  surname: user.surname,
                  profilePictureUrl: user.profilePictureUrl,
                },
              };

              results.set(userId, userData);
              this.cacheService.cacheUser(userId, userData);
            }
          } catch (error) {
            this.logger.warn(
              `Failed to fetch user ${userId}: ${error.message}`,
            );
          }
        }
      }

      this.recordResponseTime(Date.now() - startTime);
      return results;
    } catch (error) {
      this.metrics.errors++;
      this.logger.error(`Error in batch user lookup: ${error.message}`);
      throw error;
    }
  }

  /**
   * Preloads frequently accessed users into cache
   */
  async preloadFrequentUsers(limit: number = 100): Promise<void> {
    try {
      this.logger.log('Starting preload of frequent users...');

      // Get frequently accessed users from audit logs
      const frequentUserIds = await this.getFrequentUserIds(limit);

      // Preload in batches to avoid overwhelming the database
      const batchSize = 10;
      for (let i = 0; i < frequentUserIds.length; i += batchSize) {
        const batch = frequentUserIds.slice(i, i + batchSize);
        await this.getBatchUsers(batch);

        // Small delay between batches
        await new Promise((resolve) => setTimeout(resolve, 100));
      }

      this.logger.log(
        `Preloaded ${frequentUserIds.length} frequent users into cache`,
      );
    } catch (error) {
      this.logger.error(`Failed to preload frequent users: ${error.message}`);
    }
  }

  /**
   * Gets performance metrics
   */
  getPerformanceMetrics(): PerformanceMetrics {
    const totalCacheRequests =
      this.metrics.cacheHits + this.metrics.cacheMisses;

    return {
      avgResponseTime: this.calculateAverageResponseTime(),
      cacheHitRate:
        totalCacheRequests > 0
          ? (this.metrics.cacheHits / totalCacheRequests) * 100
          : 0,
      databaseQueries: this.metrics.databaseQueries,
      totalRequests: this.metrics.totalRequests,
      errorRate:
        this.metrics.totalRequests > 0
          ? (this.metrics.errors / this.metrics.totalRequests) * 100
          : 0,
    };
  }

  /**
   * Optimizes OAuth state management
   */
  optimizeOAuthState(state: string, stateData: any): void {
    // Use cache for state management instead of database
    this.cacheService.cacheOAuthState(state, stateData);
  }

  /**
   * Validates OAuth state with performance optimization
   */
  validateOptimizedOAuthState(state: string): any | null {
    return this.cacheService.consumeOAuthState(state);
  }

  /**
   * Resets performance metrics
   */
  resetMetrics(): void {
    this.metrics.responseTime.length = 0;
    this.metrics.cacheHits = 0;
    this.metrics.cacheMisses = 0;
    this.metrics.databaseQueries = 0;
    this.metrics.totalRequests = 0;
    this.metrics.errors = 0;

    this.logger.log('Performance metrics reset');
  }

  /**
   * Extracts permissions from user object
   */
  private extractPermissions(user: any): string[] {
    const permissions = new Set<string>();

    if (user.roles) {
      user.roles.forEach((role) => {
        if (role.permissions) {
          role.permissions.forEach((permission) => {
            permissions.add(permission.name);
          });
        }
      });
    }

    return Array.from(permissions);
  }

  /**
   * Records response time for metrics
   */
  private recordResponseTime(responseTime: number): void {
    this.metrics.responseTime.push(responseTime);

    // Keep only last 1000 response times
    if (this.metrics.responseTime.length > 1000) {
      this.metrics.responseTime.shift();
    }
  }

  /**
   * Calculates average response time
   */
  private calculateAverageResponseTime(): number {
    if (this.metrics.responseTime.length === 0) {
      return 0;
    }

    const sum = this.metrics.responseTime.reduce((a, b) => a + b, 0);
    return Math.round(sum / this.metrics.responseTime.length);
  }

  /**
   * Gets frequently accessed user IDs from audit logs
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private async getFrequentUserIds(limit: number): Promise<string[]> {
    try {
      // This would need to be implemented based on your audit log structure
      // For now, return empty array
      return [];
    } catch (error) {
      this.logger.error(`Failed to get frequent user IDs: ${error.message}`);
      return [];
    }
  }
}
