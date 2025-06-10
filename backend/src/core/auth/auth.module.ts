import { Module, forwardRef } from '@nestjs/common';
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

// Entities
import { RefreshToken } from './entities/refresh-token.entity';
import { AuthSession } from './entities/auth-session.entity';
import { User } from '../../modules/user/entities/user.entity';

// Related modules
import { UserModule } from '../../modules/user/user.module';
import { AuditModule } from '../audit/audit.module';
import { EncryptionModule } from '../../common/encryption/encryption.module';
import { AuthenticationLogicModule } from './authentication-logic/authentication-logic.module';

// Middleware
import { CsrfMiddleware } from '../../common/middleware/csrf.middleware';

@Module({
  imports: [
    // IMPORTANT: Import AuthenticationLogicModule for strategies
    AuthenticationLogicModule,

    // PassportModule must be imported before strategies are provided
    PassportModule.register({
      defaultStrategy: 'jwt',
      session: false,
    }),

    // Import UserModule to access UserService
    forwardRef(() => UserModule),

    // TypeORM for Auth entities
    TypeOrmModule.forFeature([RefreshToken, AuthSession]),

    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: configService.get<string>('JWT_ACCESS_EXPIRATION', '15m'),
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
          ttl: config.get('OAUTH_THROTTLE_TTL', 300),
          limit: config.get('OAUTH_THROTTLE_LIMIT', 5),
        },
      ],
    }),

    AuditModule,
    EncryptionModule,
    ConfigModule,
  ],
  controllers: [AuthController, OAuthController],
  providers: [
    // Core Services
    TokenService,
    SessionService,
    AuthService,
    GoogleOAuthService,
    AccountLinkingService,

    // Strategies - These will now work without circular dependencies
    LocalStrategy,
    JwtStrategy,
    JwtRefreshStrategy,
    GoogleOAuthStrategy,

    // Guards
    LocalAuthGuard,
    JwtAuthGuard,
    JwtRefreshGuard,

    // Middleware
    CsrfMiddleware,
  ],
  exports: [
    // Export services that other modules might need
    AuthService,
    TokenService,
    SessionService,

    // Export guards for use in other modules
    JwtAuthGuard,
    JwtRefreshGuard,
    LocalAuthGuard,

    // Export middleware
    CsrfMiddleware,

    // Export PassportModule so other modules can use passport features
    PassportModule,
  ],
})
export class AuthModule {}
