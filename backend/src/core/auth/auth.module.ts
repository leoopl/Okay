import { Module, Global } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';
import { AuthController } from './controllers/auth.controller';
import { JwtStrategy } from './strategies/jwt.strategy';
import { GoogleOIDCStrategy } from './strategies/google-oauth.strategy';
import { TokenService } from './services/token.service';
import { SecureTokenService } from './services/secure-token.service';
import { OAuthService } from './services/oauth.service';
import { GoogleOAuthService } from './services/google-oauth.service';
import { RefreshToken } from './entities/refresh-token.entity';
import { TokenBlacklist } from './entities/token-blacklist.entity';
import { AuthorizationCode } from './entities/authorization-code.entity';
import { OAuthToken } from './entities/oauth-token.entity';
import { OAuthState } from './entities/oauth-state.entity';
import { UserModule } from '../../modules/user/user.module';
import { AuditModule } from '../audit/audit.module';
import { getJwtModuleOptions } from './auth-module.config';
import googleOAuthConfig from '../../config/google-oauth.config';
import { AuthService } from './services/auth.service';
import { TokenRefreshService } from './services/token-refresh.service';
import { CsrfMiddleware } from 'src/common/middleware/csrf.middleware';
import { OAuthStateService } from './services/oauth-state.service';
import { GoogleOAuthGuard } from './guards/google-oauth.guard';
import { OAuthPKCEService } from './services/oauth-pkce.service';
import { OIDCDiscoveryService } from './services/oidc-discovery.service';
import { OAuthCacheService } from './services/oauth-cache.service';
import { OAuthTokenManagerService } from './services/oauth-token-manager.service';
import { OAuthTokenEncryptionService } from './services/oauth-token-encryption.service';
import { EncryptionModule } from 'src/common/encryption/encryption.module';

@Global()
@Module({
  imports: [
    TypeOrmModule.forFeature([
      RefreshToken,
      TokenBlacklist,
      AuthorizationCode,
      OAuthState,
      OAuthToken, // Add OAuthToken here
    ]),
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: getJwtModuleOptions,
    }),
    ConfigModule.forFeature(googleOAuthConfig),
    HttpModule.register({
      timeout: 5000,
      maxRedirects: 5,
    }),
    UserModule,
    AuditModule,
    EncryptionModule,
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
    CsrfMiddleware,
    OAuthStateService,
    GoogleOIDCStrategy,
    OAuthPKCEService,
    OIDCDiscoveryService,
    GoogleOAuthGuard,
    OAuthCacheService,
    OAuthTokenManagerService,
    OAuthTokenEncryptionService,
  ],
  exports: [
    AuthService,
    TokenService,
    SecureTokenService,
    TokenRefreshService,
    OAuthService,
    GoogleOAuthService,
    JwtStrategy,
    GoogleOIDCStrategy,
    CsrfMiddleware,
    OAuthStateService,
    OAuthPKCEService,
    OIDCDiscoveryService,
    OAuthCacheService,
    OAuthTokenManagerService,
    OAuthTokenEncryptionService,
  ],
})
export class AuthModule {}
