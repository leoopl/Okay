import { ConfigService } from '@nestjs/config';

export const getJwtModuleOptions = (configService: ConfigService) => ({
  secret: configService.get<string>('JWT_SECRET'),
  signOptions: {
    expiresIn: configService.get<string>('JWT_ACCESS_EXPIRATION', '15m'),
    audience: configService.get<string>('JWT_AUDIENCE', 'okay-api'),
    issuer: configService.get<string>('JWT_ISSUER', 'okay-mental-health'),
  },
});
