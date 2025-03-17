import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { UserService } from 'src/user/user.service';
import { Request } from 'express';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  private readonly logger = new Logger(JwtStrategy.name);

  constructor(
    private configService: ConfigService,
    private userService: UserService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        // Extract JWT from cookies
        (request: Request) => {
          const token = request?.cookies?.access_token;
          if (!token) {
            return null;
          }
          return token;
        },
        // Fallback to Authorization header (for API clients)
        ExtractJwt.fromAuthHeaderAsBearerToken(),
      ]),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('jwtConstants.secret'),
      //   audience: 'YOUR_AUTH0_API_IDENTIFIER',
      //   issuer: 'https://YOUR_AUTH0_DOMAIN/',
      //   algorithms: ['RS256'],
    });
  }

  async validate(payload: any) {
    try {
      // Optionally verify that the user still exists in the database
      const user = await this.userService.findOne(payload.sub);

      if (!user) {
        throw new UnauthorizedException('User no longer exists');
      }

      // Return a user object that will be attached to the Request
      return {
        userId: payload.sub,
        email: payload.email,
      };
    } catch (error) {
      this.logger.error(`JWT validation failed: ${error.message}`);
      throw new UnauthorizedException('Invalid token');
    }
  }
}
