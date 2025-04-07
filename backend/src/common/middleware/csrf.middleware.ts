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

  constructor(private configService: ConfigService) {}

  use(req: Request, res: Response, next: NextFunction) {
    // Add the middleware instance to the request so controllers can use it
    req['csrfMiddleware'] = this;

    // Skip CSRF check for non-mutation methods
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
      return next();
    }

    // Skip CSRF for public routes and authentication endpoints
    // Add all auth-related paths that should be excluded
    const excludedPaths = [
      '/api/auth/login',
      '/api/auth/token',
      '/api/auth/refresh',
      '/api/auth/authorize',
      '/api/users', // Allow user registration without CSRF (public endpoint)
      '/api/health',
      '/api/info',
    ];

    // Check if the current path matches any excluded path
    if (excludedPaths.some((path) => req.path.includes(path))) {
      return next();
    }

    // For mutation endpoints, check CSRF token
    const csrfToken = req.headers['x-csrf-token'] as string;
    const cookieToken = req.cookies['csrf_token'];

    // Verify CSRF token existence and match
    if (!csrfToken || !cookieToken || csrfToken !== cookieToken) {
      this.logger.warn(
        `CSRF validation failed: ${req.ip}, path: ${req.path}, method: ${req.method}`,
      );

      // During initial deployment, you can log instead of blocking
      this.logger.warn(
        `CSRF would be blocked (currently in monitoring mode): ${req.path}`,
      );
      return next(); // Comment this out after clients are updated

      throw new UnauthorizedException('Invalid CSRF token');
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
      secure: this.configService.get<boolean>('SECURE_COOKIES', false),
      sameSite: 'lax',
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
      secure: this.configService.get<boolean>('SECURE_COOKIES', false),
      sameSite: 'lax',
      path: '/',
      maxAge: 0, // Expires immediately
    });
  }
}
