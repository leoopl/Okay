import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Request } from 'express';
import { Strategy } from 'passport-strategy';

/**
 * Google OAuth strategy - handles OAuth flow validation
 * The actual OAuth logic is in GoogleOAuthService
 */
@Injectable()
export class GoogleOAuthStrategy extends PassportStrategy(
  Strategy,
  'google-oauth',
) {
  constructor() {
    super();
  }

  /**
   * Validate OAuth callback parameters
   */
  async validate(request: Request): Promise<any> {
    const { code, state, error } = request.query;

    // Check for OAuth errors
    if (error) {
      return false;
    }

    // Validate required parameters
    if (!code || !state) {
      return false;
    }

    // Return the OAuth parameters for processing
    return {
      code: code as string,
      state: state as string,
    };
  }
}
