import { Module, Global } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { TokenService } from './services/token.service';
import { OAuthService } from './services/oauth.service';
import { RefreshToken } from './entities/refresh-token.entity';
import { TokenBlacklist } from './entities/token-blacklist.entity';
import { AuthorizationCode } from './entities/authorization-code.entity';
import { UserModule } from '../../modules/user/user.module';
import { AuditModule } from '../audit/audit.module';
import { getJwtModuleOptions } from './auth-module.config';

@Global() // Make this module global to ensure JWT strategy is available everywhere
@Module({
  imports: [
    TypeOrmModule.forFeature([RefreshToken, TokenBlacklist, AuthorizationCode]),
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: getJwtModuleOptions,
    }),
    HttpModule,
    UserModule,
    AuditModule,
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    TokenService,
    OAuthService,
    JwtStrategy, // Ensure this is included
  ],
  exports: [
    AuthService,
    TokenService,
    OAuthService,
    JwtStrategy, // Ensure this is exported
    PassportModule, // Export PassportModule
    JwtModule, // Export JwtModule
  ],
})
export class AuthModule {}
