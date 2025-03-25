import { Injectable, Logger } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { passportJwtSecret } from 'jwks-rsa';
import { ConfigService } from '@nestjs/config';
import { UserService } from '../../../modules/user/user.service';

@Injectable()
export class Auth0Strategy extends PassportStrategy(Strategy, 'auth0') {
  private readonly logger = new Logger(Auth0Strategy.name);

  constructor(
    private configService: ConfigService,
    private userService: UserService,
  ) {
    const domain = configService.get<string>('AUTH0_DOMAIN');

    if (!domain) {
      // Log warning but continue - this helps avoid complete startup failure
      // when environment variables are missing
      console.warn(
        'WARNING: AUTH0_DOMAIN environment variable is not set or empty!',
      );
    }

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKeyProvider: passportJwtSecret({
        cache: true,
        rateLimit: true,
        jwksRequestsPerMinute: 5,
        jwksUri: `https://${domain}/.well-known/jwks.json`,
      }),
      audience: configService.get<string>('AUTH0_AUDIENCE'),
      issuer: `https://${domain}/`,
      algorithms: ['RS256'], // Auth0 uses RS256 by default
    });
  }

  async validate(payload: any) {
    this.logger.debug(
      `Validating Auth0 JWT payload: ${JSON.stringify(payload)}`,
    );

    try {
      // Ensure user exists in our database
      // For Auth0, the user ID is in the 'sub' claim
      const auth0Id = payload.sub;

      // Sync user with our database
      const user = await this.userService.findOrCreateAuth0User({
        auth0Id,
        email: payload.email,
        name: payload.name || payload.nickname || payload.email.split('@')[0],
      });

      return {
        userId: user.id,
        auth0Id: auth0Id,
        email: payload.email,
        permissions: payload.permissions || [],
        roles: payload.roles || [],
      };
    } catch (error) {
      this.logger.error(
        `Auth0 validation error: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }
}
