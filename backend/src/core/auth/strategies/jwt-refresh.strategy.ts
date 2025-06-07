import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-strategy';
import { Request } from 'express';
import { TokenService } from '../services/token.service';

/**
 * Strategy for validating refresh tokens
 */
@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(
  Strategy,
  'jwt-refresh',
) {
  constructor(private tokenService: TokenService) {
    super();
  }

  /**
   * Validate refresh token from request
   */
  async validate(request: Request): Promise<any> {
    // Extract refresh token from cookie
    const refreshToken = request.cookies?.refreshToken;

    if (!refreshToken) {
      return false;
    }

    // Validate token exists and is not revoked
    // The actual rotation will happen in the service layer
    // Here we just validate it exists
    try {
      // This is a simplified check - the actual validation
      // and rotation happens in the auth controller
      return { refreshToken };
    } catch (error) {
      return false;
    }
  }
}
