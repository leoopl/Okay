import {
  Injectable,
  NestMiddleware,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import * as crypto from 'crypto';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class CsrfMiddleware implements NestMiddleware {
  private readonly logger = new Logger(CsrfMiddleware.name);
  private readonly tokenStore = new Map<
    string,
    { token: string; expires: number }
  >();

  constructor(private configService: ConfigService) {
    // Clean expired tokens every hour
    setInterval(() => this.cleanExpiredTokens(), 60 * 60 * 1000);
  }

  use(req: Request, res: Response, next: NextFunction) {
    // Add CSRF methods to request
    req['csrfMiddleware'] = this;

    // Skip CSRF for safe methods
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
      return next();
    }

    // Skip for excluded paths
    const excludedPaths = [
      '/api/auth/google/callback', // OAuth callbacks are state-protected
      '/api/health',
      '/api/info',
    ];

    if (excludedPaths.some((path) => req.originalUrl.includes(path))) {
      return next();
    }

    // Extract tokens
    const headerToken = req.headers['x-csrf-token'] as string;
    const cookieToken = req.cookies['csrf-token'];
    const sessionId = req.cookies['session-id'];

    // Validate CSRF protection
    if (!this.validateCsrfTokens(headerToken, cookieToken, sessionId)) {
      this.logger.warn(
        `CSRF validation failed for ${req.ip} on ${req.originalUrl}`,
      );

      if (this.configService.get('NODE_ENV') === 'production') {
        throw new UnauthorizedException('Invalid CSRF token');
      } else {
        this.logger.warn(
          'CSRF validation failed but allowing in development mode',
        );
      }
    }

    next();
  }

  /**
   * Generate cryptographically secure CSRF token tied to session
   */
  generateSecureToken(sessionId: string, res: Response): string {
    const token = crypto.randomBytes(32).toString('base64url');
    const expires = Date.now() + 24 * 60 * 60 * 1000; // 24 hours

    // Store token tied to session
    this.tokenStore.set(sessionId, { token, expires });

    // Set in cookie
    res.cookie('csrf-token', token, {
      httpOnly: false, // Needs to be readable by client for headers
      secure: this.configService.get('NODE_ENV') === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: 24 * 60 * 60 * 1000,
    });

    return token;
  }

  /**
   * Validate CSRF tokens with session binding
   */
  private validateCsrfTokens(
    headerToken: string,
    cookieToken: string,
    sessionId: string,
  ): boolean {
    if (!headerToken || !cookieToken || !sessionId) {
      return false;
    }

    // Tokens must match
    if (headerToken !== cookieToken) {
      return false;
    }

    // Token must be tied to current session
    const storedData = this.tokenStore.get(sessionId);
    if (!storedData) {
      return false;
    }

    // Check expiration
    if (Date.now() > storedData.expires) {
      this.tokenStore.delete(sessionId);
      return false;
    }

    // Verify token matches
    return crypto.timingSafeEqual(
      Buffer.from(headerToken),
      Buffer.from(storedData.token),
    );
  }

  /**
   * Clear CSRF token for session
   */
  clearToken(sessionId: string, res: Response): void {
    this.tokenStore.delete(sessionId);
    res.cookie('csrf-token', '', {
      httpOnly: false,
      secure: this.configService.get('NODE_ENV') === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: 0,
    });
  }

  /**
   * Clean expired tokens from memory
   */
  private cleanExpiredTokens(): void {
    const now = Date.now();
    for (const [sessionId, data] of this.tokenStore.entries()) {
      if (now > data.expires) {
        this.tokenStore.delete(sessionId);
      }
    }
  }
}
