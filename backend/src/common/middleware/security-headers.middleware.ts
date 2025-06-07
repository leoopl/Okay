import { Injectable, Logger, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class SecurityHeadersMiddleware implements NestMiddleware {
  private readonly logger = new Logger(SecurityHeadersMiddleware.name);
  constructor(private readonly configService: ConfigService) {}

  use(req: Request, res: Response, next: NextFunction) {
    const isProduction = this.configService.get('NODE_ENV') === 'production';

    // HIPAA Compliance: Secure transport
    // HSTS header for production
    if (isProduction) {
      res.setHeader(
        'Strict-Transport-Security',
        'max-age=31536000; includeSubDomains; preload',
      );
    }

    // Prevent clickjacking
    // Prevent OAuth responses from being embedded
    res.setHeader('X-Frame-Options', 'DENY');

    // Prevent MIME type sniffing
    res.setHeader('X-Content-Type-Options', 'nosniff');

    // XSS Protection
    res.setHeader('X-XSS-Protection', '1; mode=block');

    // Referrer Policy for PHI protection
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

    // Content Security Policy
    res.setHeader(
      'Content-Security-Policy',
      "default-src 'self'; " +
        "script-src 'self' 'unsafe-inline' accounts.google.com; " +
        "style-src 'self' 'unsafe-inline'; " +
        "img-src 'self' data: https:; " +
        "connect-src 'self' accounts.google.com; " +
        "font-src 'self'; " +
        "object-src 'none'; " +
        "base-uri 'self'; " +
        "form-action 'self'; " +
        "frame-ancestors 'none'; " +
        'upgrade-insecure-requests;',
    );

    // HIPAA: Prevent caching of sensitive data
    if (req.path.includes('/api/')) {
      res.setHeader(
        'Cache-Control',
        'no-store, no-cache, must-revalidate, private',
      );
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
    }

    // Prevent OAuth credentials from being sent with requests to other origins
    // res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
    // res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');

    next();
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
