import {
  Injectable,
  CanActivate,
  ExecutionContext,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { OAuthStateService } from '../services/oauth-state.service';

/**
 * Guard to validate OAuth state parameter in callback requests
 */
@Injectable()
export class OAuthStateGuard implements CanActivate {
  private readonly logger = new Logger(OAuthStateGuard.name);

  constructor(private readonly oauthStateService: OAuthStateService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const state = request.query?.state;

    if (!state) {
      this.logger.warn('OAuth callback received without state parameter');
      throw new BadRequestException('Missing state parameter');
    }

    // Extract IP address and user agent from request
    const ipAddress = this.getIpAddress(request);
    const userAgent = request.headers['user-agent'] || 'unknown';

    // Validate and consume state with all required parameters
    const stateValidation =
      await this.oauthStateService.validateAndConsumeState(
        state,
        ipAddress,
        userAgent,
      );

    if (!stateValidation.valid) {
      this.logger.warn(
        `Invalid or expired OAuth state: ${state.substring(0, 8)}...`,
      );
      throw new BadRequestException('Invalid or expired state parameter');
    }

    // Log security warnings if any
    if (stateValidation.securityWarnings?.length > 0) {
      this.logger.warn(
        `OAuth security warnings: ${stateValidation.securityWarnings.join(', ')}`,
      );
    }

    // Add state validation result to request for use in controller
    request.oauthState = {
      userId: stateValidation.userId,
      redirectUrl: stateValidation.redirectUrl,
      linkMode: stateValidation.linkMode,
      securityWarnings: stateValidation.securityWarnings,
    };

    return true;
  }

  /**
   * Extract client IP address from request
   */
  private getIpAddress(request: any): string {
    const forwarded = request.headers['x-forwarded-for'];
    if (forwarded) {
      return Array.isArray(forwarded)
        ? forwarded[0]
        : forwarded.split(',')[0].trim();
    }
    return request.ip || 'unknown';
  }
}
