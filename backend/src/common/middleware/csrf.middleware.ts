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
    // Skip CSRF check for non-mutation methods
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
      return next();
    }

    // Skip CSRF for public routes and authentication
    const publicPaths = ['/auth/login', '/auth/token', '/health', '/info'];

    if (publicPaths.some((path) => req.path.includes(path))) {
      return next();
    }

    // For refresh token endpoint, we need CSRF protection
    if (req.path.includes('/auth/refresh')) {
      const csrfToken = req.headers['x-csrf-token'] as string;
      const cookieToken = req.cookies['csrf_token'];

      // Verify CSRF token existence and match
      if (!csrfToken || !cookieToken || csrfToken !== cookieToken) {
        this.logger.warn(
          `CSRF validation failed: ${req.ip}, path: ${req.path}`,
        );
        throw new UnauthorizedException('Invalid CSRF token');
      }
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
}
