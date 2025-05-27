import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { ConfigService } from '@nestjs/config';

/**
 * Security middleware for OAuth endpoints
 * Adds additional security headers and protections
 */
@Injectable()
export class OAuthSecurityMiddleware implements NestMiddleware {
  private readonly logger: Logger = new Logger(OAuthSecurityMiddleware.name);
  private readonly isProduction: boolean;

  constructor(private readonly configService: ConfigService) {
    this.isProduction = configService.get('NODE_ENV') === 'production';
  }

  use(req: Request, res: Response, next: NextFunction) {
    // Apply security headers for OAuth endpoints
    if (this.isOAuthEndpoint(req.path)) {
      this.setOAuthSecurityHeaders(res);
      this.logOAuthRequest(req);
    }

    next();
  }

  /**
   * Checks if the current path is an OAuth endpoint
   */
  private isOAuthEndpoint(path: string): boolean {
    const oauthPaths = [
      '/auth/google',
      '/auth/google/callback',
      '/auth/google/link',
      '/auth/google/unlink',
      '/auth/authorize',
      '/auth/token',
      '/auth/refresh',
    ];

    return oauthPaths.some((oauthPath) => path.includes(oauthPath));
  }

  /**
   * Sets OAuth-specific security headers
   */
  private setOAuthSecurityHeaders(res: Response): void {
    // Prevent caching of OAuth responses
    res.setHeader(
      'Cache-Control',
      'no-store, no-cache, must-revalidate, private',
    );
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    // Content Security Policy for OAuth endpoints
    res.setHeader(
      'Content-Security-Policy',
      "default-src 'self'; " +
        "script-src 'self' 'unsafe-inline' accounts.google.com; " +
        "style-src 'self' 'unsafe-inline'; " +
        "img-src 'self' data: https:; " +
        "connect-src 'self' accounts.google.com; " +
        "frame-src 'self' accounts.google.com; " +
        "object-src 'none'; " +
        "base-uri 'self';",
    );

    // Prevent OAuth responses from being embedded
    res.setHeader('X-Frame-Options', 'DENY');

    // Additional security headers
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

    // HSTS header for production
    if (this.isProduction) {
      res.setHeader(
        'Strict-Transport-Security',
        'max-age=31536000; includeSubDomains; preload',
      );
    }

    // Prevent OAuth credentials from being sent with requests to other origins
    res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  }

  /**
   * Logs OAuth requests for security monitoring
   */
  private logOAuthRequest(req: Request): void {
    const logData = {
      path: req.path,
      method: req.method,
      ip: this.getIpAddress(req),
      userAgent: req.headers['user-agent'],
      referer: req.headers.referer,
      timestamp: new Date().toISOString(),
    };

    this.logger.log(`OAuth request: ${req.method} ${req.path}`, logData);

    // Log suspicious patterns
    if (this.detectSuspiciousActivity(req)) {
      this.logger.warn('Suspicious OAuth activity detected', logData);
    }
  }

  /**
   * Detects potentially suspicious OAuth activity
   */
  private detectSuspiciousActivity(req: Request): boolean {
    // Check for suspicious user agents
    const userAgent = req.headers['user-agent']?.toLowerCase() || '';
    const suspiciousUserAgents = ['bot', 'crawler', 'spider', 'scraper'];

    if (suspiciousUserAgents.some((agent) => userAgent.includes(agent))) {
      return true;
    }

    // Check for missing or suspicious referer
    const referer = req.headers.referer;
    const allowedOrigins = [
      this.configService.get('FRONTEND_URL'),
      this.configService.get('BASE_URL'),
      'https://accounts.google.com',
    ].filter(Boolean);

    if (
      referer &&
      !allowedOrigins.some((origin) => referer.startsWith(origin))
    ) {
      return true;
    }

    // Check for OAuth callback without proper parameters
    if (req.path.includes('/callback') && !req.query.code && !req.query.error) {
      return true;
    }

    return false;
  }

  /**
   * Extracts client IP address
   */
  private getIpAddress(req: Request): string {
    const forwarded = req.headers['x-forwarded-for'];
    if (forwarded) {
      return Array.isArray(forwarded)
        ? forwarded[0]
        : forwarded.split(',')[0].trim();
    }
    return req.ip || 'unknown';
  }
}
