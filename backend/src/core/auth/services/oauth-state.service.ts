import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

export interface OAuthState {
  state: string;
  redirectUrl?: string;
  linkMode?: boolean; // true when linking account to existing user
  userId?: string; // for account linking
  expiresAt: Date;
}

/**
 * Service for managing OAuth state and CSRF protection
 * Handles state parameter generation and validation for OAuth flows
 */
@Injectable()
export class OAuthStateService {
  private readonly logger = new Logger(OAuthStateService.name);
  private readonly states = new Map<string, OAuthState>();
  private readonly stateExpirationMs = 10 * 60 * 1000; // 10 minutes

  constructor(private readonly configService: ConfigService) {
    // Clean up expired states every 5 minutes
    setInterval(() => this.cleanupExpiredStates(), 5 * 60 * 1000);
  }

  /**
   * Generates a new OAuth state parameter with optional metadata
   */
  generateState(
    options: {
      redirectUrl?: string;
      linkMode?: boolean;
      userId?: string;
    } = {},
  ): string {
    const state = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + this.stateExpirationMs);

    const stateData: OAuthState = {
      state,
      expiresAt,
      ...options,
    };

    this.states.set(state, stateData);

    this.logger.debug(`Generated OAuth state: ${state}`);

    return state;
  }

  /**
   * Validates and consumes an OAuth state parameter
   */
  validateAndConsumeState(state: string): OAuthState | null {
    const stateData = this.states.get(state);

    if (!stateData) {
      this.logger.warn(`Invalid OAuth state received: ${state}`);
      return null;
    }

    // Check expiration
    if (new Date() > stateData.expiresAt) {
      this.logger.warn(`Expired OAuth state received: ${state}`);
      this.states.delete(state);
      return null;
    }

    // Consume the state (one-time use)
    this.states.delete(state);

    this.logger.debug(`Validated and consumed OAuth state: ${state}`);

    return stateData;
  }

  /**
   * Checks if a state exists and is valid (without consuming it)
   */
  isValidState(state: string): boolean {
    const stateData = this.states.get(state);

    if (!stateData) {
      return false;
    }

    return new Date() <= stateData.expiresAt;
  }

  /**
   * Generates OAuth authorization URL with state parameter
   */
  generateAuthorizationUrl(
    baseUrl: string,
    clientId: string,
    redirectUri: string,
    scopes: string[],
    options: {
      redirectUrl?: string;
      linkMode?: boolean;
      userId?: string;
    } = {},
  ): string {
    const state = this.generateState(options);

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: scopes.join(' '),
      state,
      access_type: 'offline',
      prompt: 'consent',
    });

    return `${baseUrl}?${params.toString()}`;
  }

  /**
   * Cleans up expired state entries
   */
  private cleanupExpiredStates(): void {
    const now = new Date();
    let cleanedCount = 0;

    for (const [state, stateData] of this.states.entries()) {
      if (now > stateData.expiresAt) {
        this.states.delete(state);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      this.logger.debug(`Cleaned up ${cleanedCount} expired OAuth states`);
    }
  }

  /**
   * Gets the current number of stored states (for monitoring)
   */
  getStateCount(): number {
    return this.states.size;
  }
}
