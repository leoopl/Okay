import { Module, forwardRef } from '@nestjs/common';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { AuditModule } from '../../core/audit/audit.module';
import { Role } from './entities/role.entity';
import { Permission } from './entities/permission.entity';
import { CaslModule } from '../../core/casl/casl.module';
import { StorageModule } from 'src/common/storage/storage.module';
import { AuthModule } from 'src/core/auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Role, Permission]),
    AuditModule,
    forwardRef(() => CaslModule), // Use forwardRef to avoid circular dependency
    StorageModule,
    forwardRef(() => AuthModule),
  ],
  controllers: [UserController],
  providers: [UserService],
  exports: [UserService],
})
export class UserModule {}
