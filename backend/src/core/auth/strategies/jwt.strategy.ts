import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { TokenService, TokenPayload } from '../services/token.service';
import { UserService } from '../../../modules/user/user.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  private readonly logger = new Logger(JwtStrategy.name);

  constructor(
    private configService: ConfigService,
    private userService: UserService,
    private tokenService: TokenService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET'),
      audience: configService.get<string>('JWT_AUDIENCE', 'okay-api'),
      issuer: configService.get<string>('JWT_ISSUER', 'okay-mental-health'),
    });
  }

  async validate(payload: TokenPayload) {
    this.logger.debug(`Validating JWT payload: ${JSON.stringify(payload)}`);

    try {
      // Check if token is blacklisted
      const isBlacklisted = await this.tokenService.isTokenBlacklisted(
        payload.jti,
      );
      if (isBlacklisted) {
        throw new UnauthorizedException('Token has been revoked');
      }

      // Ensure user exists in our database
      const user = await this.userService.findOne(payload.sub);

      if (!user) {
        throw new UnauthorizedException('User not found');
      }

      // Get user roles
      const roles = user.roles?.map((role) => role.name) || [];

      // Get user permissions from roles
      const permissionSet = new Set<string>();
      user.roles?.forEach((role) => {
        role.permissions?.forEach((permission) => {
          permissionSet.add(permission.name);
        });
      });

      return {
        userId: user.id,
        email: user.email,
        roles,
        permissions: Array.from(permissionSet),
      };
    } catch (error) {
      this.logger.error(`JWT validation error: ${error.message}`, error.stack);
      throw new UnauthorizedException('Invalid token');
    }
  }
}
