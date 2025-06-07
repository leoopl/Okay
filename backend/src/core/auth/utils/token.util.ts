import * as crypto from 'crypto';

/**
 * Token utilities for generating secure tokens and identifiers
 */
export class TokenUtil {
  /**
   * Generate a secure random token
   */
  static generateSecureToken(length = 32): string {
    return crypto.randomBytes(length).toString('hex');
  }

  /**
   * Generate a URL-safe random state parameter
   */
  static generateState(): string {
    return crypto.randomBytes(16).toString('base64url');
  }

  /**
   * Generate a session ID
   */
  static generateSessionId(): string {
    return `sess_${crypto.randomBytes(24).toString('hex')}`;
  }

  /**
   * Calculate token expiration timestamp
   */
  static calculateExpiration(expiresIn: string): Date {
    const now = new Date();
    const match = expiresIn.match(/^(\d+)([smhd])$/);

    if (!match) {
      throw new Error('Invalid expiration format');
    }

    const [, value, unit] = match;
    const numValue = parseInt(value, 10);

    switch (unit) {
      case 's':
        now.setSeconds(now.getSeconds() + numValue);
        break;
      case 'm':
        now.setMinutes(now.getMinutes() + numValue);
        break;
      case 'h':
        now.setHours(now.getHours() + numValue);
        break;
      case 'd':
        now.setDate(now.getDate() + numValue);
        break;
    }

    return now;
  }

  /**
   * Parse expiration to seconds
   */
  static parseExpirationToSeconds(expiration: string): number {
    const match = expiration.match(/^(\d+)([smhd])$/);

    if (!match) {
      throw new Error('Invalid expiration format');
    }

    const [, value, unit] = match;
    const numValue = parseInt(value, 10);

    switch (unit) {
      case 's':
        return numValue;
      case 'm':
        return numValue * 60;
      case 'h':
        return numValue * 3600;
      case 'd':
        return numValue * 86400;
      default:
        throw new Error('Invalid time unit');
    }
  }
}
