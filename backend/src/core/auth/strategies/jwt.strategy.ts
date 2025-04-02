import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { TokenPayload } from '../services/token.service';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  private readonly logger = new Logger(JwtStrategy.name);

  constructor(private configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET'),
      audience: configService.get<string>('JWT_AUDIENCE'),
      issuer: configService.get<string>('JWT_ISSUER'),
    });
  }

  async validate(payload: TokenPayload) {
    this.logger.debug(`Validating JWT payload: ${JSON.stringify(payload)}`);

    try {
      // circular dependency error BUG TO FIX
      // Check if token is blacklisted
      // const isBlacklisted = await this.tokenService.isTokenBlacklisted(
      //   payload.jti,
      // );
      // if (isBlacklisted) {
      //   throw new UnauthorizedException('Token has been revoked');
      // }

      // // Ensure user exists in our database
      // const user = await this.userService.findOne(payload.sub);

      // if (!user) {
      //   throw new UnauthorizedException('User not found');
      // }

      // // Get user roles
      // const roles = user.roles?.map((role) => role.name) || [];

      // // Get user permissions from roles
      // const permissionSet = new Set<string>();
      // user.roles?.forEach((role) => {
      //   role.permissions?.forEach((permission) => {
      //     permissionSet.add(permission.name);
      //   });
      // });

      return {
        userId: payload.sub,
        email: payload.email,
        roles: payload.roles || [],
        permissions: payload.permissions || [],
        jti: payload.jti,
      };
    } catch (error) {
      this.logger.error(`JWT validation error: ${error.message}`, error.stack);
      throw new UnauthorizedException('Invalid token');
    }
  }
}
