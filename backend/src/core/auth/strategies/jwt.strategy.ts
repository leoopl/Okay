import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-jwt';
import { TokenPayload } from '../services/token.service';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TokenBlacklist } from '../entities/token-blacklist.entity';
import { AuthenticatedUser } from '../../../common/interfaces/auth-request.interface';
import { Request } from 'express';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  private readonly logger = new Logger(JwtStrategy.name);

  constructor(
    private configService: ConfigService,
    @InjectRepository(TokenBlacklist)
    private tokenBlacklistRepository: Repository<TokenBlacklist>,
  ) {
    super({
      // Extract JWT from secure HttpOnly cookie instead of Authorization header
      jwtFromRequest: (req: Request) => {
        return req.cookies['__Secure-access-token'] || null;
      },
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET'),
      audience: configService.get<string>('JWT_AUDIENCE'),
      issuer: configService.get<string>('JWT_ISSUER'),
    });
  }

  async validate(payload: TokenPayload): Promise<AuthenticatedUser> {
    this.logger.debug(`Validating JWT payload: ${JSON.stringify(payload)}`);

    try {
      if (payload.jti) {
        const blacklistedToken = await this.tokenBlacklistRepository.findOne({
          where: { jti: payload.jti },
        });

        if (blacklistedToken) {
          throw new UnauthorizedException('Token has been revoked');
        }
      }

      return {
        userId: payload.sub,
        email: payload.email,
        roles: payload.roles || [],
        permissions: payload.permissions || [],
        jti: payload.jti,
        exp: payload.exp,
      };
    } catch (error) {
      this.logger.error(`JWT validation error: ${error.message}`, error.stack);
      throw new UnauthorizedException('Invalid token');
    }
  }
}
