import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { JwtPayload } from '../interfaces/jwt-payload.interface';
import { Request } from 'express';

/**
 * JWT authentication strategy for validating access tokens
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        // First try to extract from Authorization header
        ExtractJwt.fromAuthHeaderAsBearerToken(),
        // Then try to extract from cookie
        (request: Request) => {
          return request?.cookies?.accessToken || null;
        },
      ]),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET'),
      audience: configService.get<string>('JWT_AUDIENCE'),
      issuer: configService.get<string>('JWT_ISSUER'),
      passReqToCallback: true,
    });
  }

  /**
   * Validate JWT payload and return user context
   */
  async validate(request: Request, payload: JwtPayload) {
    // Validate device fingerprint if present
    if (payload.deviceFingerprint) {
      const currentFingerprint = this.extractDeviceFingerprint(request);

      if (currentFingerprint !== payload.deviceFingerprint) {
        // Log potential security issue but don't reject immediately
        // This could be due to network changes, VPN, etc.
        console.warn(`Device fingerprint mismatch for user ${payload.userId}`);
      }
    }

    // Check if token has required fields
    if (!payload.userId || !payload.email) {
      throw new UnauthorizedException('Invalid token payload');
    }

    // Return user context for request
    return {
      userId: payload.userId,
      email: payload.email,
      roles: payload.roles || [],
      sessionId: payload.sessionId,
    };
  }

  /**
   * Extract device fingerprint from request
   */
  private extractDeviceFingerprint(request: Request): string {
    const ip = request.ip || 'unknown';
    const userAgent = request.headers['user-agent'] || 'unknown';

    return `${ip}|${userAgent}`;
  }
}
