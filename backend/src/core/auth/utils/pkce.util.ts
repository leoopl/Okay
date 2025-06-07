import * as crypto from 'crypto';
import { PKCEParams } from '../interfaces/pkce-params.interface';

/**
 * PKCE (Proof Key for Code Exchange) utilities for OAuth 2.0 security
 */
export class PKCEUtil {
  /**
   * Generate PKCE parameters for OAuth flow
   */
  static generatePKCE(): PKCEParams {
    const codeVerifier = this.generateCodeVerifier();
    const codeChallenge = this.generateCodeChallenge(codeVerifier);

    return {
      codeVerifier,
      codeChallenge,
      challengeMethod: 'S256',
    };
  }

  /**
   * Generate a cryptographically secure code verifier
   */
  private static generateCodeVerifier(): string {
    return crypto.randomBytes(32).toString('base64url');
  }

  /**
   * Generate code challenge from verifier using SHA256
   */
  private static generateCodeChallenge(verifier: string): string {
    return crypto.createHash('sha256').update(verifier).digest('base64url');
  }

  /**
   * Verify that a code verifier matches a code challenge
   */
  static verifyChallenge(verifier: string, challenge: string): boolean {
    const computedChallenge = this.generateCodeChallenge(verifier);
    return computedChallenge === challenge;
  }
}
