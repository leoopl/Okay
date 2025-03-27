import { registerAs } from '@nestjs/config';

export default registerAs('auth', () => ({
  // JWT settings
  jwtSecret: process.env.JWT_SECRET || 'your_super_secure_jwt_secret_key',
  jwtAccessExpiration: process.env.JWT_ACCESS_EXPIRATION || '15m',
  jwtRefreshExpiration: process.env.JWT_REFRESH_EXPIRATION || '7d',
  jwtAudience: process.env.JWT_AUDIENCE || 'okay-api',
  jwtIssuer: process.env.JWT_ISSUER || 'okay-mental-health',

  // Cookie settings
  cookieSecret: process.env.COOKIE_SECRET || 'your_cookie_secret_key',
  secureCookies: process.env.SECURE_COOKIES === 'true',
  cookieDomain: process.env.COOKIE_DOMAIN || 'localhost',

  // OAuth settings
  authCodeExpiration: parseInt(process.env.AUTH_CODE_EXPIRATION || '300', 10), // 5 minutes
  oauthClientIds: process.env.OAUTH_CLIENT_IDS || 'web-client,mobile-client',

  // RBAC settings
  defaultRole: process.env.DEFAULT_USER_ROLE || 'patient',
}));
