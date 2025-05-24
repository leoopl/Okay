import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as crypto from 'crypto';
import {
  IStorageProvider,
  StorageResult,
} from '../interfaces/storage-provider.interface';

@Injectable()
export class LocalStorageProvider implements IStorageProvider {
  private readonly logger = new Logger(LocalStorageProvider.name);
  private readonly uploadPath: string;
  private readonly baseUrl: string;

  constructor(private configService: ConfigService) {
    this.uploadPath = this.configService.get<string>('UPLOAD_PATH');
    this.baseUrl = this.configService.get<string>('BASE_URL');
    this.ensureUploadDirectory();
  }

  async upload(
    file: Express.Multer.File,
    filePath: string,
  ): Promise<StorageResult> {
    try {
      const fileName = this.generateFileName(file.originalname);
      const fullPath = path.join(this.uploadPath, filePath);
      const fileFinalPath = path.join(fullPath, fileName);

      // Ensure directory exists
      await fs.mkdir(fullPath, { recursive: true });

      // Write file
      await fs.writeFile(fileFinalPath, file.buffer);

      const key = path.join(filePath, fileName).replace(/\\/g, '/');

      return {
        key,
        url: `${this.baseUrl}/api/files/${key}`,
        size: file.size,
        mimetype: file.mimetype,
        provider: 'local',
      };
    } catch (error) {
      this.logger.error(`Failed to upload file: ${error.message}`, error.stack);
      throw new Error('Failed to upload file');
    }
  }

  async delete(fileKey: string): Promise<void> {
    try {
      const filePath = path.join(this.uploadPath, fileKey);
      await fs.unlink(filePath);
    } catch (error) {
      if (error.code !== 'ENOENT') {
        this.logger.error(
          `Failed to delete file: ${error.message}`,
          error.stack,
        );
        throw new Error('Failed to delete file');
      }
    }
  }

  getUrl(fileKey: string): string {
    return `${this.baseUrl}/api/files/${fileKey}`;
  }

  async getStream(fileKey: string): Promise<NodeJS.ReadableStream> {
    const fs = await import('fs');
    const filePath = path.join(this.uploadPath, fileKey);
    return fs.createReadStream(filePath);
  }

  async exists(fileKey: string): Promise<boolean> {
    try {
      const filePath = path.join(this.uploadPath, fileKey);
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  private generateFileName(originalName: string): string {
    const ext = path.extname(originalName);
    const timestamp = Date.now();
    const random = crypto.randomBytes(8).toString('hex');
    return `${timestamp}-${random}${ext}`;
  }

  private async ensureUploadDirectory(): Promise<void> {
    try {
      await fs.mkdir(this.uploadPath, { recursive: true });
    } catch (error) {
      this.logger.error(`Failed to create upload directory: ${error.message}`);
    }
  }
}
