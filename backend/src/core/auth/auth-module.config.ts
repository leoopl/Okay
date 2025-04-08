import { ConfigService } from '@nestjs/config';

export const getJwtModuleOptions = (configService: ConfigService) => ({
  secret: configService.get<string>('JWT_SECRET'),
  signOptions: {
    expiresIn: configService.get<string>('JWT_ACCESS_EXPIRATION'),
    audience: configService.get<string>('JWT_AUDIENCE'),
    issuer: configService.get<string>('JWT_ISSUER'),
  },
});
