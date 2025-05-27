import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { User } from '../../../modules/user/entities/user.entity';

export interface CacheEntry<T> {
  data: T;
  expiresAt: Date;
  createdAt: Date;
}

export interface OAuthUserCache {
  user: User;
  roles: string[];
  permissions: string[];
  profileData: any;
}

/**
 * In-memory cache service for OAuth performance optimization
 * Reduces database queries for frequently accessed OAuth data
 */
@Injectable()
export class OAuthCacheService {
  private readonly logger = new Logger(OAuthCacheService.name);
  private readonly cache = new Map<string, CacheEntry<any>>();
  private readonly defaultTtl = 15 * 60 * 1000; // 15 minutes
  private readonly maxCacheSize = 1000;

  constructor(private readonly configService: ConfigService) {
    // Clean up expired entries every 5 minutes
    setInterval(() => this.cleanupExpiredEntries(), 5 * 60 * 1000);
  }

  /**
   * Caches OAuth user data
   */
  cacheUser(userId: string, userData: OAuthUserCache, ttl?: number): void {
    try {
      const cacheKey = `user:${userId}`;
      const expiresAt = new Date(Date.now() + (ttl || this.defaultTtl));

      this.cache.set(cacheKey, {
        data: userData,
        expiresAt,
        createdAt: new Date(),
      });

      this.logger.debug(`Cached user data for: ${userId}`);
      this.enforeCacheLimit();
    } catch (error) {
      this.logger.error(`Failed to cache user data: ${error.message}`);
    }
  }

  /**
   * Retrieves cached OAuth user data
   */
  getCachedUser(userId: string): OAuthUserCache | null {
    try {
      const cacheKey = `user:${userId}`;
      const entry = this.cache.get(cacheKey);

      if (!entry) {
        return null;
      }

      if (new Date() > entry.expiresAt) {
        this.cache.delete(cacheKey);
        return null;
      }

      this.logger.debug(`Cache hit for user: ${userId}`);
      return entry.data;
    } catch (error) {
      this.logger.error(
        `Failed to retrieve cached user data: ${error.message}`,
      );
      return null;
    }
  }

  /**
   * Caches OAuth state for CSRF protection
   */
  cacheOAuthState(state: string, stateData: any, ttl?: number): void {
    try {
      const cacheKey = `oauth_state:${state}`;
      const expiresAt = new Date(Date.now() + (ttl || 10 * 60 * 1000)); // 10 minutes default

      this.cache.set(cacheKey, {
        data: stateData,
        expiresAt,
        createdAt: new Date(),
      });

      this.logger.debug(`Cached OAuth state: ${state}`);
    } catch (error) {
      this.logger.error(`Failed to cache OAuth state: ${error.message}`);
    }
  }

  /**
   * Retrieves and removes OAuth state (one-time use)
   */
  consumeOAuthState(state: string): any | null {
    try {
      const cacheKey = `oauth_state:${state}`;
      const entry = this.cache.get(cacheKey);

      if (!entry) {
        return null;
      }

      // Remove immediately (one-time use)
      this.cache.delete(cacheKey);

      if (new Date() > entry.expiresAt) {
        return null;
      }

      this.logger.debug(`Consumed OAuth state: ${state}`);
      return entry.data;
    } catch (error) {
      this.logger.error(`Failed to consume OAuth state: ${error.message}`);
      return null;
    }
  }

  /**
   * Caches OAuth provider configuration
   */
  cacheProviderConfig(provider: string, config: any): void {
    try {
      const cacheKey = `provider_config:${provider}`;
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      this.cache.set(cacheKey, {
        data: config,
        expiresAt,
        createdAt: new Date(),
      });

      this.logger.debug(`Cached provider config: ${provider}`);
    } catch (error) {
      this.logger.error(`Failed to cache provider config: ${error.message}`);
    }
  }

  /**
   * Retrieves cached provider configuration
   */
  getCachedProviderConfig(provider: string): any | null {
    try {
      const cacheKey = `provider_config:${provider}`;
      const entry = this.cache.get(cacheKey);

      if (!entry || new Date() > entry.expiresAt) {
        if (entry) this.cache.delete(cacheKey);
        return null;
      }

      return entry.data;
    } catch (error) {
      this.logger.error(
        `Failed to retrieve cached provider config: ${error.message}`,
      );
      return null;
    }
  }

  /**
   * Invalidates cached user data
   */
  invalidateUser(userId: string): void {
    try {
      const cacheKey = `user:${userId}`;
      this.cache.delete(cacheKey);
      this.logger.debug(`Invalidated cache for user: ${userId}`);
    } catch (error) {
      this.logger.error(`Failed to invalidate user cache: ${error.message}`);
    }
  }

  /**
   * Invalidates all cached data
   */
  invalidateAll(): void {
    try {
      this.cache.clear();
      this.logger.log('Invalidated all cached data');
    } catch (error) {
      this.logger.error(`Failed to invalidate all cache: ${error.message}`);
    }
  }

  /**
   * Gets cache statistics
   */
  getStatistics(): any {
    const now = new Date();
    let expiredCount = 0;
    const typeCount = new Map<string, number>();

    for (const [key, entry] of this.cache.entries()) {
      const type = key.split(':')[0];
      typeCount.set(type, (typeCount.get(type) || 0) + 1);

      if (now > entry.expiresAt) {
        expiredCount++;
      }
    }

    return {
      totalEntries: this.cache.size,
      expiredEntries: expiredCount,
      maxSize: this.maxCacheSize,
      utilizationPercent: Math.round(
        (this.cache.size / this.maxCacheSize) * 100,
      ),
      typeBreakdown: Object.fromEntries(typeCount),
    };
  }

  /**
   * Cleans up expired cache entries
   */
  private cleanupExpiredEntries(): void {
    try {
      const now = new Date();
      let cleanedCount = 0;

      for (const [key, entry] of this.cache.entries()) {
        if (now > entry.expiresAt) {
          this.cache.delete(key);
          cleanedCount++;
        }
      }

      if (cleanedCount > 0) {
        this.logger.debug(`Cleaned up ${cleanedCount} expired cache entries`);
      }
    } catch (error) {
      this.logger.error(
        `Failed to cleanup expired cache entries: ${error.message}`,
      );
    }
  }

  /**
   * Enforces cache size limit using LRU eviction
   */
  private enforeCacheLimit(): void {
    if (this.cache.size <= this.maxCacheSize) {
      return;
    }

    try {
      // Convert to array and sort by creation date (LRU)
      const entries = Array.from(this.cache.entries()).sort(
        ([, a], [, b]) => a.createdAt.getTime() - b.createdAt.getTime(),
      );

      // Remove oldest entries until we're under the limit
      const toRemove = this.cache.size - this.maxCacheSize;
      for (let i = 0; i < toRemove; i++) {
        this.cache.delete(entries[i][0]);
      }

      this.logger.debug(`Evicted ${toRemove} cache entries due to size limit`);
    } catch (error) {
      this.logger.error(`Failed to enforce cache limit: ${error.message}`);
    }
  }
}
