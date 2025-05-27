import { registerAs } from '@nestjs/config';

export interface ThrottlerConfig {
  ttl: number;
  limit: number;
  oauthTtl: number;
  oauthLimit: number;
  skipIf?: (context: any) => boolean;
}

export default registerAs(
  'throttler',
  (): ThrottlerConfig => ({
    ttl: parseInt(process.env.THROTTLE_TTL, 10),
    limit: parseInt(process.env.THROTTLE_LIMIT, 10),
    oauthTtl: parseInt(process.env.OAUTH_THROTTLE_TTL, 10),
    oauthLimit: parseInt(process.env.OAUTH_THROTTLE_LIMIT, 10),
    skipIf: (context) => {
      // Skip rate limiting for health checks
      const request = context.switchToHttp().getRequest();
      return request.path === '/health' || request.path === '/info';
    },
  }),
);
