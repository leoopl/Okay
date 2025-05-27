import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EncryptionService } from '../../../common/encryption/encryption.service';
import * as crypto from 'crypto';

export interface EncryptedOAuthTokens {
  accessToken: string;
  refreshToken?: string;
  expiresAt: Date;
  encryptedAt: Date;
  keyId: string;
}

export interface OAuthTokenDecryption {
  accessToken: string;
  refreshToken?: string;
  isValid: boolean;
  expiresAt: Date;
}

/**
 * Service for encrypting and managing OAuth tokens
 * Provides secure storage and retrieval of OAuth provider tokens
 */
@Injectable()
export class OAuthTokenEncryptionService {
  private readonly logger = new Logger(OAuthTokenEncryptionService.name);
  private readonly keyRotationPeriod = 90 * 24 * 60 * 60 * 1000; // 90 days
  private readonly currentKeyId: string;

  constructor(
    private readonly encryptionService: EncryptionService,
    private readonly configService: ConfigService,
  ) {
    this.currentKeyId = this.generateKeyId();
  }

  /**
   * Encrypts OAuth tokens for secure storage
   */
  async encryptOAuthTokens(
    accessToken: string,
    refreshToken?: string,
    expiresIn?: number,
  ): Promise<EncryptedOAuthTokens> {
    try {
      const expiresAt = new Date();
      if (expiresIn) {
        expiresAt.setSeconds(expiresAt.getSeconds() + expiresIn);
      } else {
        expiresAt.setHours(expiresAt.getHours() + 1); // Default 1 hour
      }

      const encryptedAccessToken = this.encryptionService.encrypt(accessToken);
      let encryptedRefreshToken = null;

      if (refreshToken) {
        encryptedRefreshToken = this.encryptionService.encrypt(refreshToken);
      }

      if (!encryptedAccessToken) {
        throw new Error('Failed to encrypt access token');
      }

      return {
        accessToken: JSON.stringify(encryptedAccessToken),
        refreshToken: encryptedRefreshToken
          ? JSON.stringify(encryptedRefreshToken)
          : null,
        expiresAt,
        encryptedAt: new Date(),
        keyId: this.currentKeyId,
      };
    } catch (error) {
      this.logger.error(
        `Failed to encrypt OAuth tokens: ${error.message}`,
        error.stack,
      );
      throw new Error('Token encryption failed');
    }
  }

  /**
   * Decrypts OAuth tokens for use
   */
  async decryptOAuthTokens(
    encryptedTokens: EncryptedOAuthTokens,
  ): Promise<OAuthTokenDecryption> {
    try {
      // Check if tokens are expired
      const isValid = new Date() < encryptedTokens.expiresAt;

      if (!isValid) {
        this.logger.warn('Attempting to decrypt expired OAuth tokens');
      }

      // Decrypt access token
      const encryptedAccessData = JSON.parse(encryptedTokens.accessToken);
      const accessToken = this.encryptionService.decrypt(encryptedAccessData);

      if (!accessToken) {
        throw new Error('Failed to decrypt access token');
      }

      // Decrypt refresh token if present
      let refreshToken = null;
      if (encryptedTokens.refreshToken) {
        const encryptedRefreshData = JSON.parse(encryptedTokens.refreshToken);
        refreshToken = this.encryptionService.decrypt(encryptedRefreshData);
      }

      return {
        accessToken,
        refreshToken,
        isValid,
        expiresAt: encryptedTokens.expiresAt,
      };
    } catch (error) {
      this.logger.error(
        `Failed to decrypt OAuth tokens: ${error.message}`,
        error.stack,
      );
      throw new Error('Token decryption failed');
    }
  }

  /**
   * Validates if encrypted tokens are still usable
   */
  validateEncryptedTokens(encryptedTokens: EncryptedOAuthTokens): boolean {
    try {
      // Check expiration
      if (new Date() >= encryptedTokens.expiresAt) {
        return false;
      }

      // Check key rotation (tokens encrypted with old keys should be rotated)
      if (this.shouldRotateKey(encryptedTokens.encryptedAt)) {
        this.logger.warn(
          'OAuth tokens encrypted with old key, should be rotated',
        );
        return false;
      }

      return true;
    } catch (error) {
      this.logger.error(`Error validating encrypted tokens: ${error.message}`);
      return false;
    }
  }

  /**
   * Generates a new key ID for encryption key rotation
   */
  private generateKeyId(): string {
    const timestamp = Date.now();
    const random = crypto.randomBytes(4).toString('hex');
    return `key_${timestamp}_${random}`;
  }

  /**
   * Checks if encryption key should be rotated
   */
  private shouldRotateKey(encryptedAt: Date): boolean {
    const now = new Date();
    const keyAge = now.getTime() - encryptedAt.getTime();
    return keyAge > this.keyRotationPeriod;
  }

  /**
   * Creates a secure hash of token for comparison
   */
  createTokenHash(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  /**
   * Validates token hash against stored hash
   */
  validateTokenHash(token: string, storedHash: string): boolean {
    const tokenHash = this.createTokenHash(token);
    return crypto.timingSafeEqual(
      Buffer.from(tokenHash),
      Buffer.from(storedHash),
    );
  }
}
