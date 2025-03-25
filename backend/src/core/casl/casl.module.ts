import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CaslAbilityFactory } from './casl-ability.factory';
import { PoliciesGuard } from './guards/policies.guard';
import { PolicyHandlerFactory } from './factories/policy-handler.factory';
import { PermissionService } from './services/permission.service';
import { AuditModule } from '../audit/audit.module';
import { UserModule } from '../../modules/user/user.module';
import { Permission } from '../../modules/user/entities/permission.entity';
import { Role } from '../../modules/user/entities/role.entity';
import { InventoryModule } from '../../modules/inventory/inventory.module';
import { JournalModule } from '../../modules/journal/journal.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Permission, Role]),
    AuditModule,
    forwardRef(() => UserModule), // Use forwardRef to avoid circular dependency
    forwardRef(() => InventoryModule), // Add InventoryModule
    forwardRef(() => JournalModule), // Add JournalModule
  ],
  providers: [
    CaslAbilityFactory,
    PoliciesGuard,
    PolicyHandlerFactory,
    PermissionService,
  ],
  exports: [
    CaslAbilityFactory,
    PoliciesGuard,
    PolicyHandlerFactory,
    PermissionService,
  ],
})
export class CaslModule {}
