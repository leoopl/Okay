import { Injectable } from '@nestjs/common';
import { jwtConstants } from '../constants';
import { PassportStrategy } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { ExtractJwt, Strategy } from 'passport-jwt';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey:
        jwtConstants.secret || configService.get<string>('JWT_SECRET'),
      //   audience: 'YOUR_AUTH0_API_IDENTIFIER',
      //   issuer: 'https://YOUR_AUTH0_DOMAIN/',
      //   algorithms: ['RS256'],
    });
  }

  async validate(payload: any) {
    return { userId: payload.sub, username: payload.email };
  }
}
