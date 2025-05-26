import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { StorageService } from './services/storage.service';
import { LocalStorageProvider } from './providers/local-storage.provider';
import { FileController } from './controllers/file.controller';
import storageConfig from './config/storage.config';

@Global()
@Module({
  imports: [ConfigModule.forFeature(storageConfig)],
  controllers: [FileController],
  providers: [StorageService, LocalStorageProvider],
  exports: [StorageService],
})
export class StorageModule {}
