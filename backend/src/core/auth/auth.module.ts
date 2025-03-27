import { Module } from '@nestjs/common';
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

@Module({
  imports: [
    UserModule,
    AuditModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
    TypeOrmModule.forFeature([RefreshToken, TokenBlacklist, AuthorizationCode]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: configService.get<string>('JWT_ACCESS_EXPIRATION', '15m'),
          audience: configService.get<string>('JWT_AUDIENCE', 'okay-api'),
          issuer: configService.get<string>('JWT_ISSUER', 'okay-mental-health'),
        },
      }),
    }),
    HttpModule,
  ],
  controllers: [AuthController],
  providers: [AuthService, TokenService, OAuthService, JwtStrategy],
  exports: [AuthService, TokenService, OAuthService],
})
export class AuthModule {}
