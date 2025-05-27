import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map, tap } from 'rxjs/operators';
import { ConfigService } from '@nestjs/config';

/**
 * Interceptor for OAuth responses
 * Handles successful OAuth flows and redirects
 */
@Injectable()
export class OAuthResponseInterceptor implements NestInterceptor {
  private readonly logger = new Logger(OAuthResponseInterceptor.name);

  constructor(private readonly configService: ConfigService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();

    // Only handle OAuth callback endpoints
    if (!request.path.includes('/callback')) {
      return next.handle();
    }

    return next.handle().pipe(
      map((data) => {
        // For successful OAuth callbacks, redirect to frontend with tokens
        if (data && data.accessToken) {
          const frontendUrl = this.configService.get('FRONTEND_URL');
          const callbackUrl = this.buildFrontendCallbackUrl(frontendUrl, data);

          this.logger.log(`OAuth success, redirecting to: ${callbackUrl}`);

          // Set cookies for refresh token (handled by TokenService)
          // Redirect to frontend with success parameters
          response.redirect(callbackUrl);

          return; // Don't return JSON response for redirects
        }

        return data;
      }),
      tap({
        error: (error) => {
          // Handle OAuth errors by redirecting to frontend error page
          const frontendUrl = this.configService.get('FRONTEND_URL');
          const errorUrl = new URL('/auth/error', frontendUrl);

          errorUrl.searchParams.set('error', 'oauth_error');
          errorUrl.searchParams.set(
            'error_description',
            error.message || 'Authentication failed',
          );

          this.logger.error(
            `OAuth error, redirecting to: ${errorUrl.toString()}`,
          );

          response.redirect(errorUrl.toString());
        },
      }),
    );
  }

  /**
   * Builds frontend callback URL with authentication data
   */
  private buildFrontendCallbackUrl(frontendUrl: string, authData: any): string {
    const callbackUrl = new URL('/auth/callback', frontendUrl);

    // Add success parameters
    callbackUrl.searchParams.set('access_token', authData.accessToken);
    callbackUrl.searchParams.set('csrf_token', authData.csrfToken);
    callbackUrl.searchParams.set('is_new_user', authData.isNewUser.toString());

    // Encode user data
    if (authData.user) {
      callbackUrl.searchParams.set(
        'user',
        encodeURIComponent(JSON.stringify(authData.user)),
      );
    }

    return callbackUrl.toString();
  }
}
