import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
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
    AuditModule,
    forwardRef(() => CaslModule), // Resolve circular dependency with CaslModule
    forwardRef(() => UserModule), // Add this to resolve UserService dependency
  ],
  controllers: [InventoryController],
  providers: [InventoryService],
  exports: [InventoryService],
})
export class InventoryModule {}
