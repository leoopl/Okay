import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  IStorageProvider,
  StorageProvider,
  StorageResult,
} from '../interfaces/storage-provider.interface';
import { LocalStorageProvider } from '../providers/local-storage.provider';

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly providers: Map<StorageProvider, IStorageProvider> =
    new Map();
  private readonly defaultProvider: StorageProvider;

  constructor(
    private configService: ConfigService,
    private localStorageProvider: LocalStorageProvider,
  ) {
    this.defaultProvider = this.configService.get<StorageProvider>(
      'STORAGE_PROVIDER',
      StorageProvider.LOCAL,
    );

    // Register providers
    this.providers.set(StorageProvider.LOCAL, this.localStorageProvider);
  }

  async uploadFile(
    file: Express.Multer.File,
    path: string,
    provider?: StorageProvider,
  ): Promise<StorageResult> {
    const storageProvider = this.getProvider(provider);
    return storageProvider.upload(file, path);
  }

  async deleteFile(fileKey: string, provider?: StorageProvider): Promise<void> {
    const storageProvider = this.getProvider(provider);
    return storageProvider.delete(fileKey);
  }

  getFileUrl(fileKey: string, provider?: StorageProvider): string {
    const storageProvider = this.getProvider(provider);
    return storageProvider.getUrl(fileKey);
  }

  async getFileStream(
    fileKey: string,
    provider?: StorageProvider,
  ): Promise<NodeJS.ReadableStream> {
    const storageProvider = this.getProvider(provider);
    return storageProvider.getStream(fileKey);
  }

  async fileExists(
    fileKey: string,
    provider?: StorageProvider,
  ): Promise<boolean> {
    const storageProvider = this.getProvider(provider);
    return storageProvider.exists(fileKey);
  }

  private getProvider(provider?: StorageProvider): IStorageProvider {
    const selectedProvider = provider || this.defaultProvider;
    const storageProvider = this.providers.get(selectedProvider);

    if (!storageProvider) {
      throw new Error(`Storage provider ${selectedProvider} not found`);
    }

    return storageProvider;
  }
}
