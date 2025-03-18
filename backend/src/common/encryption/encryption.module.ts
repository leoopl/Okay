import { Module } from '@nestjs/common';
import { EncryptionService as ImportedEncryptionService } from './encryption.service';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [ConfigModule],
  providers: [ImportedEncryptionService],
  exports: [ImportedEncryptionService],
})
export class EncryptionModule {}
