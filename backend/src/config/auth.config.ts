import { registerAs } from '@nestjs/config';

export default registerAs('auth', () => ({
  // JWT settings
  jwtSecret: process.env.JWT_SECRET,
  jwtAccessExpiration: process.env.JWT_ACCESS_EXPIRATION,
  jwtRefreshExpiration: process.env.JWT_REFRESH_EXPIRATION,
  jwtAudience: process.env.JWT_AUDIENCE,
  jwtIssuer: process.env.JWT_ISSUER,

  // Cookie settings
  cookieSecret: process.env.COOKIE_SECRET,
  secureCookies: process.env.SECURE_COOKIES,
  cookieDomain: process.env.COOKIE_DOMAIN,

  // OAuth settings
  authCodeExpiration: parseInt(process.env.AUTH_CODE_EXPIRATION, 10), // 5 minutes
  oauthClientIds: process.env.OAUTH_CLIENT_IDS,

  // RBAC settings
  defaultRole: process.env.DEFAULT_USER_ROLE,
}));
