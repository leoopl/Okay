import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { UserModule } from 'src/user/user.module';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';
import { PassportModule } from '@nestjs/passport';
import oauthConstants from './constants/oauth.constants';
import { GoogleStrategy } from './strategies/google.strategy';
import { AuditModule } from 'src/audit/audit.module';
import { Auth0Service } from './services/auth0.service';
import { Auth0Strategy } from './strategies/auth0.strategy';

@Module({
  imports: [
    UserModule,
    AuditModule,
    PassportModule.register({ defaultStrategy: 'auth0' }),
    ConfigModule.forFeature(oauthConstants),
    JwtModule.register({}),
    HttpModule,
  ],
  controllers: [AuthController],
  providers: [AuthService, Auth0Service, Auth0Strategy, GoogleStrategy],
  exports: [AuthService, Auth0Service],
})
export class AuthModule {}
