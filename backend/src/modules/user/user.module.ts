import { Module } from '@nestjs/common';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { AuditModule } from '../../core/audit/audit.module';
import { Role } from './entities/role.entity';
import { Permission } from './entities/permission.entity';
import { CaslModule } from '../../core/casl/casl.module';
import { StorageModule } from 'src/common/storage/storage.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Role, Permission]),
    AuditModule,
    CaslModule,
    StorageModule,
    // Remove AuthModule import to break circular dependency
  ],
  controllers: [UserController],
  providers: [UserService],
  exports: [UserService, TypeOrmModule], // Export TypeOrmModule for AuthModule
})
export class UserModule {}
