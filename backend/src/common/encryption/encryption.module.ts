import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EncryptionService } from './encryption.service';

// Consider making this module @Global() if EncryptionService is used in many other modules.
// If @Global(), it must be imported once in your AppModule.
// For now, we'll import it directly into AuthModule.
@Module({
  imports: [
    ConfigModule, // Import ConfigModule if EncryptionService depends on ConfigService
  ],
  providers: [EncryptionService],
  exports: [EncryptionService],
})
export class EncryptionModule {}
