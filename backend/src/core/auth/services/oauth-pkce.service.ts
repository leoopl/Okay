import { Injectable, Logger } from '@nestjs/common';
import * as crypto from 'crypto';
import { OAuthCacheService } from './oauth-cache.service';

export interface PKCEChallenge {
  codeVerifier: string;
  codeChallenge: string;
  codeChallengeMethod: 'S256' | 'plain';
}

export interface OAuthMetadata {
  userId?: string;
  redirectUrl?: string;
  linkMode?: boolean;
  ipAddress: string;
  userAgent: string;
  nonce?: string;
  state: string;
}

export interface PKCEValidationResult {
  valid: boolean;
  metadata?: OAuthMetadata;
  error?: string;
}

@Injectable()
export class OAuthPKCEService {
  private readonly logger = new Logger(OAuthPKCEService.name);

  constructor(private readonly cacheService: OAuthCacheService) {}

  /**
   * Generates PKCE challenge parameters
   */
  generatePKCEChallenge(): PKCEChallenge {
    const codeVerifier = crypto.randomBytes(64).toString('base64url');
    const codeChallenge = crypto
      .createHash('sha256')
      .update(codeVerifier)
      .digest('base64url');

    return {
      codeVerifier,
      codeChallenge,
      codeChallengeMethod: 'S256',
    };
  }

  /**
   * Generates a nonce for OpenID Connect
   */
  generateNonce(): string {
    return crypto.randomBytes(32).toString('base64url');
  }

  /**
   * Stores PKCE challenge with metadata
   */
  async storePKCEChallenge(
    state: string,
    challenge: PKCEChallenge,
    metadata: OAuthMetadata,
  ): Promise<void> {
    const data = {
      ...challenge,
      ...metadata,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
    };

    await this.cacheService.cacheOAuthState(state, data, 10 * 60 * 1000);
    this.logger.debug(
      `Stored PKCE challenge for state: ${state.substring(0, 8)}...`,
    );
  }

  /**
   * Validates PKCE challenge
   */
  async validatePKCEChallenge(
    state: string,
    codeVerifier: string,
  ): Promise<PKCEValidationResult> {
    try {
      const storedData = await this.cacheService.consumeOAuthState(state);

      if (!storedData) {
        return { valid: false, error: 'Invalid or expired state' };
      }

      // Check expiration
      if (new Date() > new Date(storedData.expiresAt)) {
        return { valid: false, error: 'State expired' };
      }

      // Validate code verifier
      const expectedChallenge = crypto
        .createHash('sha256')
        .update(codeVerifier)
        .digest('base64url');

      if (expectedChallenge !== storedData.codeChallenge) {
        this.logger.warn('Invalid code verifier provided');
        return { valid: false, error: 'Invalid code verifier' };
      }

      return {
        valid: true,
        metadata: {
          userId: storedData.userId,
          redirectUrl: storedData.redirectUrl,
          linkMode: storedData.linkMode,
          ipAddress: storedData.ipAddress,
          userAgent: storedData.userAgent,
          nonce: storedData.nonce,
          state: storedData.state,
        },
      };
    } catch (error) {
      this.logger.error(`PKCE validation error: ${error.message}`);
      return { valid: false, error: 'Validation failed' };
    }
  }

  /**
   * Cleans expired PKCE challenges
   */
  async cleanupExpiredChallenges(): Promise<void> {
    // This is handled by the cache service's internal cleanup
    this.logger.debug('Cleanup triggered for expired PKCE challenges');
  }
}
