import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { StorageService } from './services/storage.service';
import { LocalStorageProvider } from './providers/local-storage.provider';
import { FileUploadInterceptor } from './interceptors/file-upload.interceptor';
import { FileController } from './controllers/file.controller';
import storageConfig from './config/storage.config';

@Global()
@Module({
  imports: [ConfigModule.forFeature(storageConfig)],
  controllers: [FileController],
  providers: [StorageService, LocalStorageProvider, FileUploadInterceptor],
  exports: [StorageService, FileUploadInterceptor],
})
export class StorageModule {}
