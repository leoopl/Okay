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
  private readonly suspiciousIPs = new Map<
    string,
    { attempts: number; lastAttempt: Date }
  >();

  constructor(
    private readonly configService: ConfigService,
    storageService: ThrottlerStorage,
    reflector: Reflector,
  ) {
    super(
      [
        {
          limit: configService.get<number>('OAUTH_THROTTLE_LIMIT', 5),
          ttl: configService.get<number>('OAUTH_THROTTLE_TTL', 300) * 1000,
        },
      ],
      storageService,
      reflector,
    );
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const ip = this.getIpAddress(request);

    // Check for suspicious IP patterns
    if (this.isSuspiciousIP(ip)) {
      this.logger.warn(`Blocked suspicious IP: ${ip}`);
      return false;
    }

    const result = await super.canActivate(context);

    if (!result) {
      this.trackSuspiciousActivity(ip);
    }

    return result;
  }

  private isSuspiciousIP(ip: string): boolean {
    const suspicious = this.suspiciousIPs.get(ip);
    if (!suspicious) return false;

    // Block IP for 1 hour after 10 failed attempts
    const hourAgo = new Date(Date.now() - 60 * 60 * 1000);
    return suspicious.attempts >= 10 && suspicious.lastAttempt > hourAgo;
  }

  private trackSuspiciousActivity(ip: string): void {
    const existing = this.suspiciousIPs.get(ip) || {
      attempts: 0,
      lastAttempt: new Date(),
    };
    existing.attempts++;
    existing.lastAttempt = new Date();
    this.suspiciousIPs.set(ip, existing);

    // Clean up old entries periodically
    if (this.suspiciousIPs.size > 1000) {
      this.cleanupSuspiciousIPs();
    }
  }

  private cleanupSuspiciousIPs(): void {
    const hourAgo = new Date(Date.now() - 60 * 60 * 1000);
    for (const [ip, data] of this.suspiciousIPs.entries()) {
      if (data.lastAttempt < hourAgo) {
        this.suspiciousIPs.delete(ip);
      }
    }
  }

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
