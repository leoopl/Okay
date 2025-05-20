import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MulterModule } from '@nestjs/platform-express';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { InventoryController } from './inventory.controller';
import { InventoryService } from './inventory.service';
import { Inventory } from './entities/inventory.entity';
import { InventoryResponse } from './entities/inventory-response.entity';
import { AuditModule } from '../../core/audit/audit.module';
import { CaslModule } from '../../core/casl/casl.module';
import { UserModule } from '../user/user.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Inventory, InventoryResponse]),
    MulterModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        dest: configService.get('UPLOAD_DEST', './uploads'),
        limits: {
          fileSize: 5 * 1024 * 1024, // 5MB limit
        },
      }),
      inject: [ConfigService],
    }),
    AuditModule,
    forwardRef(() => CaslModule), // Resolve circular dependency with CaslModule
    forwardRef(() => UserModule), // Add this to resolve UserService dependency
  ],
  controllers: [InventoryController],
  providers: [InventoryService],
  exports: [InventoryService],
})
export class InventoryModule {}
