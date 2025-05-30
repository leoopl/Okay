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

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const state = request.query?.state;

    if (!state) {
      this.logger.warn('OAuth callback received without state parameter');
      throw new BadRequestException('Missing state parameter');
    }

    const stateData = this.oauthStateService.validateAndConsumeState(state);

    if (!stateData) {
      this.logger.warn(`Invalid or expired OAuth state: ${state}`);
      throw new BadRequestException('Invalid or expired state parameter');
    }

    // Add state data to request for use in controller
    request.oauthState = stateData;

    return true;
  }
}
