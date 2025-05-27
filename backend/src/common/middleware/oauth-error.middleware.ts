import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { AuditService } from '../../core/audit/audit.service';
import { AuditAction } from '../../core/audit/entities/audit-log.entity';

export interface OAuthError {
  error: string;
  error_description?: string;
  error_uri?: string;
  state?: string;
}

/**
 * Middleware to handle OAuth errors and redirects
 * Processes OAuth error responses and logs them appropriately
 */
@Injectable()
export class OAuthErrorMiddleware implements NestMiddleware {
  private readonly logger = new Logger(OAuthErrorMiddleware.name);

  constructor(private readonly auditService: AuditService) {}

  async use(req: Request, res: Response, next: NextFunction) {
    // Only process OAuth callback routes
    if (!req.path.includes('/auth/') || !req.path.includes('/callback')) {
      return next();
    }

    const oauthError = this.extractOAuthError(req);

    if (oauthError) {
      await this.handleOAuthError(req, res, oauthError);
      return;
    }

    next();
  }

  /**
   * Extracts OAuth error from request query parameters
   */
  private extractOAuthError(req: Request): OAuthError | null {
    const { error, error_description, error_uri, state } = req.query;

    if (!error) {
      return null;
    }

    return {
      error: error as string,
      error_description: error_description as string,
      error_uri: error_uri as string,
      state: state as string,
    };
  }

  /**
   * Handles OAuth errors and redirects appropriately
   */
  private async handleOAuthError(
    req: Request,
    res: Response,
    oauthError: OAuthError,
  ): Promise<void> {
    const ip = this.getIpAddress(req);
    const userAgent = req.headers['user-agent'] || 'unknown';

    // Log the OAuth error
    this.logger.warn(
      `OAuth error received: ${oauthError.error} - ${oauthError.error_description}`,
      {
        error: oauthError.error,
        description: oauthError.error_description,
        state: oauthError.state,
        ip,
        userAgent,
      },
    );

    // Audit the failed OAuth attempt
    await this.auditService.logAction({
      userId: 'unknown',
      action: AuditAction.FAILED_LOGIN,
      resource: 'auth',
      details: {
        provider: this.getProviderFromPath(req.path),
        error: oauthError.error,
        errorDescription: oauthError.error_description,
        method: 'oauth_callback_error',
        ip,
        userAgent,
      },
    });

    // Redirect to frontend with error information
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const errorRedirectUrl = this.buildErrorRedirectUrl(
      frontendUrl,
      oauthError,
    );

    res.redirect(errorRedirectUrl);
  }

  /**
   * Builds error redirect URL for frontend
   */
  private buildErrorRedirectUrl(
    frontendUrl: string,
    oauthError: OAuthError,
  ): string {
    const url = new URL('/auth/error', frontendUrl);

    url.searchParams.set('error', oauthError.error);

    if (oauthError.error_description) {
      url.searchParams.set('error_description', oauthError.error_description);
    }

    // Map OAuth errors to user-friendly messages
    const userMessage = this.getUserFriendlyErrorMessage(oauthError.error);
    url.searchParams.set('message', userMessage);

    return url.toString();
  }

  /**
   * Maps OAuth error codes to user-friendly messages
   */
  private getUserFriendlyErrorMessage(errorCode: string): string {
    const errorMessages: Record<string, string> = {
      access_denied:
        'You cancelled the login process. Please try again if you want to sign in.',
      invalid_request:
        'There was a problem with the login request. Please try again.',
      invalid_client:
        'There was a configuration issue. Please contact support.',
      invalid_grant:
        'The authorization code was invalid or expired. Please try again.',
      unauthorized_client:
        'This application is not authorized. Please contact support.',
      unsupported_response_type:
        'This login method is not supported. Please contact support.',
      invalid_scope:
        'The requested permissions are not valid. Please contact support.',
      server_error:
        "Google's servers encountered an error. Please try again later.",
      temporarily_unavailable:
        "Google's service is temporarily unavailable. Please try again later.",
    };

    return (
      errorMessages[errorCode] ||
      'An unexpected error occurred during login. Please try again.'
    );
  }

  /**
   * Extracts OAuth provider from request path
   */
  private getProviderFromPath(path: string): string {
    if (path.includes('/google/')) return 'google';
    if (path.includes('/auth0/')) return 'auth0';
    return 'unknown';
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
