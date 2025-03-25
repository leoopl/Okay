import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { UserModule } from 'src/modules/user/user.module';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';
import { PassportModule } from '@nestjs/passport';
import oauthConstants from './constants/oauth.constants';
import { GoogleStrategy } from './strategies/google.strategy';
import { AuditModule } from 'src/core/audit/audit.module';
import { Auth0Service } from './services/auth0.service';
import { Auth0Strategy } from './strategies/auth0.strategy';
import auth0Constants from './constants/auth0.constants';

@Module({
  imports: [
    UserModule,
    AuditModule,
    PassportModule.register({ defaultStrategy: 'auth0' }),
    ConfigModule.forFeature(oauthConstants),
    ConfigModule.forFeature(auth0Constants), // Make sure auth0Constants is imported
    JwtModule.register({}),
    HttpModule,
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    Auth0Service,
    Auth0Strategy,
    GoogleStrategy,
    // Provide proper Auth0 configuration
    {
      provide: 'AUTH0_CONFIG',
      useFactory: (configService: ConfigService) => ({
        domain: configService.get<string>('AUTH0_DOMAIN'),
        clientId: configService.get<string>('AUTH0_CLIENT_ID'),
        clientSecret: configService.get<string>('AUTH0_CLIENT_SECRET'),
        audience: configService.get<string>('AUTH0_AUDIENCE'),
      }),
      inject: [ConfigService],
    },
  ],
  exports: [AuthService, Auth0Service],
})
export class AuthModule {}
