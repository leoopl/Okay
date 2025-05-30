import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  Logger,
} from '@nestjs/common';
import { Response, Request } from 'express';
import { ConfigService } from '@nestjs/config';
import { AuditService } from '../../audit/audit.service';
import { AuditAction } from '../../audit/entities/audit-log.entity';
import { OAuthException } from '../exceptions/oauth-exceptions';

@Catch(OAuthException, HttpException)
export class OAuthExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(OAuthExceptionFilter.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly auditService: AuditService,
  ) {}

  async catch(exception: OAuthException | HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    // Only handle OAuth-related routes
    if (!this.isOAuthRoute(request.path)) {
      throw exception;
    }

    const isOAuthException = exception instanceof OAuthException;
    const status = isOAuthException ? exception.status : exception.getStatus();
    const message = exception.message;
    const userMessage = isOAuthException
      ? exception.userMessage || message
      : this.getGenericUserMessage(status);

    // Log the error with appropriate level
    if (status >= 500) {
      this.logger.error(`OAuth server error: ${message}`, exception.stack, {
        path: request.path,
        ip: this.getIpAddress(request),
      });
    } else if (status >= 400) {
      this.logger.warn(`OAuth client error: ${message}`, {
        path: request.path,
        ip: this.getIpAddress(request),
      });
    }

    // Audit security-related errors
    if (this.isSecurityError(exception)) {
      await this.auditService.logAction({
        userId: 'unknown',
        action: AuditAction.FAILED_LOGIN,
        resource: 'auth',
        details: {
          error: message,
          path: request.path,
          ip: this.getIpAddress(request),
          userAgent: request.headers['user-agent'],
          securityIssue: true,
        },
      });
    }

    // Handle OAuth callback errors with redirects
    if (this.isCallbackRoute(request.path)) {
      return this.handleCallbackError(response, userMessage, status);
    }

    // Handle API errors with JSON response
    return this.handleApiError(response, exception, status, userMessage);
  }

  /**
   * Handle OAuth callback errors by redirecting to frontend
   */
  private handleCallbackError(
    response: Response,
    userMessage: string,
    status: number,
  ): void {
    const frontendUrl = this.configService.get(
      'FRONTEND_URL',
      'http://localhost:3000',
    );
    const errorUrl = new URL('/auth/error', frontendUrl);

    errorUrl.searchParams.set('error', this.mapStatusToOAuthError(status));
    errorUrl.searchParams.set('error_description', userMessage);
    errorUrl.searchParams.set('return_to', '/signin');

    this.logger.log(`Redirecting OAuth error to: ${errorUrl.toString()}`);
    response.redirect(errorUrl.toString());
  }

  /**
   * Handle API errors with structured JSON response
   */
  private handleApiError(
    response: Response,
    exception: OAuthException | HttpException,
    status: number,
    userMessage: string,
  ): void {
    const isDevelopment = this.configService.get('NODE_ENV') === 'development';

    const errorResponse = {
      error: this.mapStatusToOAuthError(status),
      error_description: userMessage,
      timestamp: new Date().toISOString(),
      ...(isDevelopment && {
        details:
          exception instanceof OAuthException ? exception.details : undefined,
        stack: exception.stack,
      }),
    };

    response.status(status).json(errorResponse);
  }

  /**
   * Check if this is an OAuth-related route
   */
  private isOAuthRoute(path: string): boolean {
    const oauthPaths = ['/auth/', '/oauth/'];
    return oauthPaths.some((oauthPath) => path.includes(oauthPath));
  }

  /**
   * Check if this is an OAuth callback route
   */
  private isCallbackRoute(path: string): boolean {
    return path.includes('/callback');
  }

  /**
   * Check if this is a security-related error
   */
  private isSecurityError(exception: OAuthException | HttpException): boolean {
    if (exception instanceof OAuthException) {
      return ['INVALID_OAUTH_STATE', 'CSRF_VALIDATION_FAILED'].includes(
        exception.code,
      );
    }
    return exception.getStatus() === 401 || exception.getStatus() === 403;
  }

  /**
   * Map HTTP status to OAuth error code
   */
  private mapStatusToOAuthError(status: number): string {
    const statusMap: Record<number, string> = {
      400: 'invalid_request',
      401: 'unauthorized',
      403: 'access_denied',
      404: 'invalid_request',
      409: 'invalid_grant',
      429: 'temporarily_unavailable',
      500: 'server_error',
      502: 'server_error',
      503: 'temporarily_unavailable',
    };

    return statusMap[status] || 'server_error';
  }

  /**
   * Get generic user-friendly message for status codes
   */
  private getGenericUserMessage(status: number): string {
    const messages: Record<number, string> = {
      400: 'There was an issue with your request. Please try again.',
      401: 'Authentication failed. Please try signing in again.',
      403: 'Access denied. You may not have permission for this action.',
      404: 'The requested resource was not found.',
      429: 'Too many requests. Please wait a moment and try again.',
      500: 'Internal server error. Please try again later.',
      502: 'Service temporarily unavailable. Please try again later.',
      503: 'Service maintenance in progress. Please try again later.',
    };

    return (
      messages[status] ||
      'An unexpected error occurred. Please try again later.'
    );
  }

  /**
   * Extract client IP address
   */
  private getIpAddress(request: Request): string {
    const forwarded = request.headers['x-forwarded-for'];
    if (forwarded) {
      return Array.isArray(forwarded)
        ? forwarded[0]
        : forwarded.split(',')[0].trim();
    }
    return request.ip || 'unknown';
  }
}
