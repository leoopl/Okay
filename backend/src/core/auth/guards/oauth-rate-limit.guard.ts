import { Injectable, ExecutionContext, Logger } from '@nestjs/common';
import { ThrottlerGuard, ThrottlerStorage } from '@nestjs/throttler';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';

/**
 * Rate limiting guard specifically for OAuth endpoints
 * Implements stricter limits for authentication attempts
 */
@Injectable()
export class OAuthRateLimitGuard extends ThrottlerGuard {
  private readonly logger = new Logger(OAuthRateLimitGuard.name);

  constructor(
    private readonly configService: ConfigService,
    storageService: ThrottlerStorage,
    reflector: Reflector,
  ) {
    super(
      [
        {
          limit: configService.get<number>('OAUTH_THROTTLE_LIMIT', 5),
          ttl: configService.get<number>('OAUTH_THROTTLE_TTL', 300),
        },
      ],
      storageService,
      reflector,
    );
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();

    // Apply rate limiting only to OAuth initiation endpoints
    if (this.isOAuthInitiationEndpoint(request.path)) {
      const result = await super.canActivate(context);

      if (!result) {
        this.logger.warn(
          `OAuth rate limit exceeded for IP: ${this.getIpAddress(request)}`,
          {
            ip: this.getIpAddress(request),
            userAgent: request.headers['user-agent'],
            path: request.path,
          },
        );
      }

      return result;
    }

    return true;
  }

  /**
   * Checks if the endpoint is an OAuth initiation endpoint
   */
  private isOAuthInitiationEndpoint(path: string): boolean {
    const oauthInitiationPaths = [
      '/auth/google',
      '/auth/google/link',
      '/auth/authorize',
      '/auth/token',
    ];

    return oauthInitiationPaths.some((oauthPath) => path.includes(oauthPath));
  }

  /**
   * Extracts client IP address
   */
  private getIpAddress(request: any): string {
    const forwarded = request.headers['x-forwarded-for'];
    if (forwarded) {
      return Array.isArray(forwarded)
        ? forwarded[0]
        : forwarded.split(',')[0].trim();
    }
    return request.ip || 'unknown';
  }
}
