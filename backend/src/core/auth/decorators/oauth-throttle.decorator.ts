import { applyDecorators, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { OAuthRateLimitGuard } from '../guards/oauth-rate-limit.guard';

/**
 * Decorator to apply OAuth-specific rate limiting
 * @param limit Number of requests allowed
 * @param ttl Time window in seconds
 */
export const OAuthThrottle = (limit: number = 5, ttl: number = 300) => {
  return applyDecorators(Throttle(limit, ttl), UseGuards(OAuthRateLimitGuard));
};

/**
 * Decorator for OAuth initiation endpoints (stricter limits)
 */
export const OAuthInitiationThrottle = () => OAuthThrottle(3, 300); // 3 attempts per 5 minutes

/**
 * Decorator for OAuth callback endpoints (moderate limits)
 */
export const OAuthCallbackThrottle = () => OAuthThrottle(10, 60); // 10 callbacks per minute
