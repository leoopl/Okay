import { registerAs } from '@nestjs/config';

export default registerAs('auth', () => ({
  jwt: {
    secret: process.env.JWT_SECRET,
    accessTokenExpiration: process.env.JWT_ACCESS_EXPIRATION,
    refreshTokenExpiration: process.env.JWT_REFRESH_EXPIRATION,
    audience: process.env.JWT_AUDIENCE,
    issuer: process.env.JWT_ISSUER,
  },
  oauth: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackUrl: process.env.GOOGLE_CALLBACK_URL,
    },
    authCodeExpiration: parseInt(process.env.AUTH_CODE_EXPIRATION, 10),
    clientIds: process.env.OAUTH_CLIENT_IDS?.split(','),
  },
  session: {
    duration: process.env.SESSION_DURATION,
    maxSessionsPerUser: parseInt(process.env.MAX_SESSIONS_PER_USER, 10),
    sensitiveOpReauthMinutes: parseInt(
      process.env.SENSITIVE_OP_REAUTH_MINUTES,
      10,
    ),
  },
  security: {
    cookieSecret: process.env.COOKIE_SECRET,
    secureCookies: process.env.SECURE_COOKIES === 'true',
    cookieDomain: process.env.COOKIE_DOMAIN,
    encryptionKey: process.env.ENCRYPTION_KEY,
    encryptionSalt: process.env.ENCRYPTION_SALT,
  },
  rateLimit: {
    auth: {
      ttl: parseInt(process.env.OAUTH_THROTTLE_TTL, 10),
      limit: parseInt(process.env.OAUTH_THROTTLE_LIMIT, 10),
      skipIf: (context) => {
        // Skip rate limiting for health checks
        const request = context.switchToHttp().getRequest();
        return request.path === '/health' || request.path === '/info';
      },
    },
  },
  defaults: {
    userRole: process.env.DEFAULT_USER_ROLE,
  },
}));
