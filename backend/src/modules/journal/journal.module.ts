import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JournalController } from './journal.controller';
import { JournalService } from './journal.service';
import { JournalEntry } from './entities/journal.entity';
import { AuditModule } from '../../core/audit/audit.module';
import { CaslModule } from '../../core/casl/casl.module';
import { UserModule } from '../user/user.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([JournalEntry]),
    AuditModule,
    forwardRef(() => CaslModule), // Resolve circular dependency with CaslModule
    forwardRef(() => UserModule), // Add this to resolve UserService dependency
  ],
  controllers: [JournalController],
  providers: [JournalService],
  exports: [JournalService],
})
export class JournalModule {}
