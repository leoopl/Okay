import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';

/**
 * Exception filter specifically for OAuth-related errors
 * Provides consistent error responses for OAuth failures
 */
@Catch()
export class OAuthExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(OAuthExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest();

    // Only handle OAuth-related routes
    if (!request.path.includes('/auth/')) {
      throw exception;
    }

    let status = 500;
    let message = 'Internal server error';
    let errorCode = 'server_error';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else if (
        typeof exceptionResponse === 'object' &&
        exceptionResponse !== null
      ) {
        message = (exceptionResponse as any).message || message;
      }

      // Map HTTP status codes to OAuth error codes
      errorCode = this.mapStatusToOAuthError(status);
    } else if (exception instanceof Error) {
      message = exception.message;
    }

    this.logger.error(
      `OAuth exception: ${message}`,
      exception instanceof Error ? exception.stack : undefined,
    );

    // For OAuth callback routes, redirect to frontend with error
    if (request.path.includes('/callback')) {
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      const errorUrl = new URL('/auth/error', frontendUrl);

      errorUrl.searchParams.set('error', errorCode);
      errorUrl.searchParams.set('error_description', message);

      return response.redirect(errorUrl.toString());
    }

    // For API routes, return JSON error
    response.status(status).json({
      error: errorCode,
      error_description: message,
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }

  /**
   * Maps HTTP status codes to OAuth 2.0 error codes
   */
  private mapStatusToOAuthError(status: number): string {
    const statusToErrorMap: Record<number, string> = {
      400: 'invalid_request',
      401: 'access_denied',
      403: 'unauthorized_client',
      404: 'invalid_request',
      422: 'invalid_grant',
      429: 'temporarily_unavailable',
      500: 'server_error',
      502: 'server_error',
      503: 'temporarily_unavailable',
      504: 'temporarily_unavailable',
    };

    return statusToErrorMap[status] || 'server_error';
  }
}
