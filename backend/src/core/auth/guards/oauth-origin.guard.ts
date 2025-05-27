import {
  Injectable,
  CanActivate,
  ExecutionContext,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Guard to validate OAuth request origins
 * Ensures OAuth requests come from allowed origins
 */
@Injectable()
export class OAuthOriginGuard implements CanActivate {
  private readonly logger = new Logger(OAuthOriginGuard.name);
  private readonly allowedOrigins: string[];

  constructor(private readonly configService: ConfigService) {
    this.allowedOrigins = [
      configService.get('FRONTEND_URL'),
      configService.get('BASE_URL'),
      'https://accounts.google.com',
      'https://oauth.google.com',
    ].filter(Boolean);
  }

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();

    // Skip validation for callback endpoints (they come from Google)
    if (request.path.includes('/callback')) {
      return true;
    }

    // Validate origin for OAuth initiation endpoints
    if (this.isOAuthInitiationEndpoint(request.path)) {
      return this.validateOrigin(request);
    }

    return true;
  }

  /**
   * Validates the request origin
   */
  private validateOrigin(request: any): boolean {
    const origin = request.headers.origin;
    const referer = request.headers.referer;

    // Allow requests without origin/referer in development
    if (process.env.NODE_ENV === 'development' && !origin && !referer) {
      return true;
    }

    // Check origin header
    if (origin && this.allowedOrigins.includes(origin)) {
      return true;
    }

    // Check referer header as fallback
    if (
      referer &&
      this.allowedOrigins.some((allowed) => referer.startsWith(allowed))
    ) {
      return true;
    }

    this.logger.warn(
      `OAuth request from unauthorized origin: ${origin || referer || 'unknown'}`,
      {
        origin,
        referer,
        userAgent: request.headers['user-agent'],
        ip: request.ip,
        path: request.path,
      },
    );

    throw new BadRequestException('Unauthorized origin');
  }

  /**
   * Checks if the endpoint is an OAuth initiation endpoint
   */
  private isOAuthInitiationEndpoint(path: string): boolean {
    const initiationPaths = [
      '/auth/google',
      '/auth/google/link',
      '/auth/authorize',
    ];

    return initiationPaths.some((initPath) => path.includes(initPath));
  }
}
