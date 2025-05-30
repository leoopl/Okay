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
  private readonly debug: boolean;

  constructor(private configService: ConfigService) {
    this.debug = configService.get<boolean>('DEBUG_CSRF');
  }

  use(req: Request, res: Response, next: NextFunction) {
    // Add the middleware instance to the request so controllers can use it
    req['csrfMiddleware'] = this;

    // Skip CSRF check for non-mutation methods
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
      if (this.debug) {
        this.logger.debug(
          `[CSRF] Skipping check for ${req.method} ${req.originalUrl}`,
        );
      }
      return next();
    }

    // List of paths explicitly excluded from CSRF protection
    const excludedPaths = [
      '/api/auth/login',
      '/api/auth/token',
      '/api/auth/refresh',
      '/api/auth/authorize',
      '/api/users',
      '/api/health',
      '/api/info',
    ];

    // Check BOTH originalUrl and path against excluded paths
    if (
      excludedPaths.some(
        (path) => req.originalUrl.includes(path) || req.path.includes(path),
      )
    ) {
      if (this.debug) {
        this.logger.debug(
          `[CSRF] Skipping check for excluded path: ${req.originalUrl}`,
        );
      }
      return next();
    }

    // For mutation endpoints, check CSRF token
    const csrfToken = req.headers['x-csrf-token'] as string;
    const cookieToken = req.cookies['csrf_token'];

    // Verify CSRF token existence and match
    if (!csrfToken || !cookieToken || csrfToken !== cookieToken) {
      this.logger.warn(
        `CSRF validation failed: ${req.ip}, path: ${req.originalUrl}, method: ${req.method}`,
      );

      // During development, allow requests to pass through for debugging
      if (process.env.NODE_ENV === 'development') {
        this.logger.warn(
          '[CSRF] Allowing request in development mode despite CSRF failure',
        );
        return next();
      }

      throw new UnauthorizedException('Invalid CSRF token');
    }

    if (this.debug) {
      this.logger.debug(`[CSRF] Validation successful for ${req.originalUrl}`);
    }

    next();
  }

  /**
   * Generate a new CSRF token and set it in the response cookies
   * Call this after authentication
   */
  generateToken(res: Response): string {
    const token = crypto.randomBytes(32).toString('hex');

    res.cookie('csrf_token', token, {
      httpOnly: true,
      secure: this.configService.get<boolean>('SECURE_COOKIES'),
      sameSite: 'lax',
      domain: this.configService.get<string>('COOKIE_DOMAIN'),
      path: '/',
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    });

    return token;
  }

  /**
   * Clear the CSRF token cookie
   * Call this during logout
   */
  clearToken(res: Response): void {
    res.cookie('csrf_token', '', {
      httpOnly: true,
      secure: this.configService.get<boolean>('SECURE_COOKIES'),
      sameSite: 'lax',
      domain: this.configService.get<string>('COOKIE_DOMAIN'),
      path: '/',
      maxAge: 0, // Expires immediately
    });
  }
}
