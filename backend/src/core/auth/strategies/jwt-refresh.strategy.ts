import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-custom';
import { Request } from 'express';
import { AuthenticationLogicService } from '../authentication-logic/authentication-logic.service';

/**
 * Strategy for validating refresh tokens
 */
@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(
  Strategy,
  'jwt-refresh',
) {
  constructor(private readonly authLogicService: AuthenticationLogicService) {
    super();
  }

  /**
   * Validate refresh token from request
   */
  async validate(request: Request): Promise<any> {
    // Extract refresh token from cookie or body
    const refreshToken =
      request.cookies?.refreshToken || request.body?.refreshToken;

    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token not provided');
    }

    // Use AuthenticationLogicService to validate token
    const validationResult =
      await this.authLogicService.validateRefreshToken(refreshToken);

    if (!validationResult) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    // Return the validation result for use in the controller
    return {
      refreshToken: refreshToken,
      tokenEntity: validationResult.tokenEntity,
      user: validationResult.user,
    };
  }
}
