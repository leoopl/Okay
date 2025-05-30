import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Response, Request } from 'express';
import * as crypto from 'crypto';

@Injectable()
export class SecureTokenService {
  private readonly logger = new Logger(SecureTokenService.name);

  constructor(private configService: ConfigService) {}

  /**
   * Set secure authentication cookies
   * Access token is HttpOnly, refresh token is HttpOnly
   * Client gets a secure session identifier only
   */
  setSecureAuthCookies(
    response: Response,
    accessToken: string,
    refreshToken: string,
    expiresIn: number,
    csrfToken?: string,
  ): string {
    const sessionId = crypto.randomUUID();
    const isProduction = this.configService.get('NODE_ENV') === 'production';

    // Store access token in HttpOnly cookie
    response.cookie('__Secure-access-token', accessToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'strict',
      path: '/',
      maxAge: expiresIn * 1000,
      domain: this.configService.get('COOKIE_DOMAIN'),
    });

    // Store refresh token in HttpOnly cookie
    response.cookie('__Secure-refresh-token', refreshToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'strict',
      path: '/',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      domain: this.configService.get('COOKIE_DOMAIN'),
    });

    // Provide session identifier to client (not sensitive)
    response.cookie('session-id', sessionId, {
      httpOnly: false,
      secure: isProduction,
      sameSite: 'strict',
      path: '/',
      maxAge: expiresIn * 1000,
    });

    // CSRF token (can be non-HttpOnly as it's not sensitive when used correctly)
    if (csrfToken) {
      response.cookie('csrf-token', csrfToken, {
        httpOnly: false,
        secure: isProduction,
        sameSite: 'strict',
        path: '/',
        maxAge: 24 * 60 * 60 * 1000,
      });
    }

    return sessionId;
  }

  /**
   * Clear all authentication cookies securely
   */
  clearAuthCookies(response: Response): void {
    const cookieOptions = {
      httpOnly: true,
      secure: this.configService.get('NODE_ENV') === 'production',
      sameSite: 'strict' as const,
      path: '/',
      maxAge: 0,
    };

    response.cookie('__Secure-access-token', '', cookieOptions);
    response.cookie('__Secure-refresh-token', '', cookieOptions);
    response.cookie('session-id', '', { ...cookieOptions, httpOnly: false });
    response.cookie('csrf-token', '', { ...cookieOptions, httpOnly: false });
  }

  /**
   * Extract access token from secure cookie
   */
  extractAccessToken(request: Request): string | null {
    return request.cookies['__Secure-access-token'] || null;
  }

  /**
   * Extract refresh token from secure cookie
   */
  extractRefreshToken(request: Request): string | null {
    return request.cookies['__Secure-refresh-token'] || null;
  }
}
