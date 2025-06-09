import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';

// Controllers
import { AuthController } from './controllers/auth.controller';
import { OAuthController } from './controllers/oauth.controller';

// Services
import { AuthService } from './services/auth.service';
import { GoogleOAuthService } from './services/google-oauth.service';
import { TokenService } from './services/token.service';
import { SessionService } from './services/session.service';
import { AccountLinkingService } from './services/account-linking.service';

// Strategies
import { JwtStrategy } from './strategies/jwt.strategy';
import { JwtRefreshStrategy } from './strategies/jwt-refresh.strategy';
import { LocalStrategy } from './strategies/local.strategy';
import { GoogleOAuthStrategy } from './strategies/google-oauth.strategy';

// Guards
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { JwtRefreshGuard } from './guards/jwt-refresh.guard';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { GoogleOAuthGuard } from './guards/google-oauth.guard';

// Entities
import { RefreshToken } from './entities/refresh-token.entity';
import { AuthSession } from './entities/auth-session.entity';
import { User } from '../../modules/user/entities/user.entity';

// Related modules
import { UserModule } from '../../modules/user/user.module';
import { AuditModule } from '../audit/audit.module';
import { EncryptionModule } from '../../common/encryption/encryption.module';

@Module({
  imports: [
    // Import UserModule to access UserService - circular dependency is now broken
    UserModule,

    // TypeORM for Auth entities + User entity for LocalStrategy
    TypeOrmModule.forFeature([RefreshToken, AuthSession, User]),

    // Configure PassportModule
    PassportModule.register({
      defaultStrategy: 'jwt',
      session: false,
    }),

    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: configService.get<string>('JWT_ACCESS_EXPIRATION'),
          audience: configService.get<string>('JWT_AUDIENCE'),
          issuer: configService.get<string>('JWT_ISSUER'),
        },
      }),
    }),

    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => [
        {
          name: 'auth',
          ttl: config.get('OAUTH_THROTTLE_TTL'),
          limit: config.get('OAUTH_THROTTLE_LIMIT'),
        },
      ],
    }),

    AuditModule,
    EncryptionModule,
    ConfigModule,
  ],
  controllers: [AuthController, OAuthController],
  providers: [
    // Strategies FIRST - important for registration order
    LocalStrategy,
    JwtStrategy,
    JwtRefreshStrategy,
    GoogleOAuthStrategy,

    // Services
    TokenService,
    SessionService,
    AuthService,
    GoogleOAuthService,
    AccountLinkingService,

    // Guards
    LocalAuthGuard,
    JwtAuthGuard,
    JwtRefreshGuard,
    GoogleOAuthGuard,
  ],
  exports: [
    AuthService,
    TokenService,
    SessionService,
    JwtAuthGuard,
    JwtRefreshGuard,
    LocalAuthGuard,
  ],
})
export class AuthModule {}
