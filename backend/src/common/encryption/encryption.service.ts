import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

export interface EncryptedData {
  iv: string;
  encryptedData: string;
  authTag: string;
}

@Injectable()
export class EncryptionService {
  private readonly logger = new Logger(EncryptionService.name);
  private readonly algorithm = 'aes-256-gcm';
  private readonly key: Buffer;

  constructor(private configService: ConfigService) {
    // In production, consider using a KMS service like AWS KMS
    // or Azure Key Vault to manage this key
    const encryptionKey = this.configService.get<string>('ENCRYPTION_KEY');

    if (!encryptionKey) {
      this.logger.error(
        'ENCRYPTION_KEY is not set! PHI data will not be properly secured.',
      );
      throw new Error('ENCRYPTION_KEY environment variable must be set');
    }

    // Derive key using scrypt for additional security
    this.key = crypto.scryptSync(
      encryptionKey,
      this.configService.get<string>(
        'ENCRYPTION_SALT',
        'okay-mental-health-salt',
      ),
      32, // 256 bits
    );
  }

  /**
   * Encrypt sensitive patient data
   */
  encrypt(text: string | null | undefined): EncryptedData | null {
    if (text === null || text === undefined) {
      return null;
    }

    try {
      const iv = crypto.randomBytes(16);
      const cipher = crypto.createCipheriv(this.algorithm, this.key, iv);

      let encrypted = cipher.update(text, 'utf8', 'hex');
      encrypted += cipher.final('hex');

      const authTag = cipher.getAuthTag();

      return {
        iv: iv.toString('hex'),
        encryptedData: encrypted,
        authTag: authTag.toString('hex'),
      };
    } catch (error) {
      this.logger.error(`Encryption failed: ${error.message}`);
      throw new Error('Failed to encrypt data');
    }
  }

  /**
   * Decrypt sensitive patient data
   */
  decrypt(data: EncryptedData | null | undefined): string | null {
    if (!data) {
      return null;
    }

    try {
      const decipher = crypto.createDecipheriv(
        this.algorithm,
        this.key,
        Buffer.from(data.iv, 'hex'),
      );

      decipher.setAuthTag(Buffer.from(data.authTag, 'hex'));

      let decrypted = decipher.update(data.encryptedData, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      return decrypted;
    } catch (error) {
      this.logger.error(`Decryption failed: ${error.message}`);
      throw new Error('Failed to decrypt data');
    }
  }
}
