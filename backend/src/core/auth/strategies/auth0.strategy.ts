import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { passportJwtSecret } from 'jwks-rsa';
import { ConfigService } from '@nestjs/config';
import { UserService } from '../../../modules/user/user.service';

@Injectable()
export class Auth0Strategy extends PassportStrategy(Strategy, 'auth0') {
  constructor(
    private configService: ConfigService,
    private userService: UserService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKeyProvider: passportJwtSecret({
        cache: true,
        rateLimit: true,
        jwksRequestsPerMinute: 5,
        jwksUri: configService.get<string>('auth0.jwksUri'),
      }),
      audience: configService.get<string>('auth0.audience'),
      issuer: configService.get<string>('auth0.issuerBaseURL'),
      algorithms: ['RS256'], // Auth0 uses RS256 by default
    });
  }

  async validate(payload: any) {
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
  }
}
