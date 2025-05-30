import { Module, Global } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';
import { AuthController } from './controllers/auth.controller';
import { JwtStrategy } from './strategies/jwt.strategy';
import { GoogleOAuthStrategy } from './strategies/google-oauth.strategy';
import { TokenService } from './services/token.service';
import { SecureTokenService } from './services/secure-token.service';
import { OAuthService } from './services/oauth.service';
import { GoogleOAuthService } from './services/google-oauth.service';
import { RefreshToken } from './entities/refresh-token.entity';
import { TokenBlacklist } from './entities/token-blacklist.entity';
import { AuthorizationCode } from './entities/authorization-code.entity';
import { OAuthState } from './entities/oauth-state.entity';
import { UserModule } from '../../modules/user/user.module';
import { AuditModule } from '../audit/audit.module';
import { getJwtModuleOptions } from './auth-module.config';
import googleOAuthConfig from '../../config/google-oauth.config';
import { AuthService } from './services/auth.service';
import { TokenRefreshService } from './services/token-refresh.service';
import { CsrfMiddleware } from 'src/common/middleware/csrf.middleware';
import { OAuthStateService } from './services/oauth-state.service';

@Global()
@Module({
  imports: [
    TypeOrmModule.forFeature([
      RefreshToken,
      TokenBlacklist,
      AuthorizationCode,
      OAuthState,
    ]),
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: getJwtModuleOptions,
    }),
    ConfigModule.forFeature(googleOAuthConfig),
    HttpModule,
    UserModule,
    AuditModule,
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    TokenService,
    SecureTokenService,
    TokenRefreshService,
    OAuthService,
    GoogleOAuthService,
    JwtStrategy,
    GoogleOAuthStrategy,
    CsrfMiddleware,
    OAuthStateService,
  ],
  exports: [
    AuthService,
    TokenService,
    SecureTokenService,
    TokenRefreshService,
    OAuthService,
    GoogleOAuthService,
    JwtStrategy,
    GoogleOAuthStrategy,
    CsrfMiddleware,
    OAuthStateService,
  ],
})
export class AuthModule {}
