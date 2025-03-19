import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JournalController } from './journal.controller';
import { JournalService } from './journal.service';
import { JournalEntry } from './entities/journal.entity';
import { AuditModule } from '../../core/audit/audit.module';

@Module({
  imports: [TypeOrmModule.forFeature([JournalEntry]), AuditModule],
  controllers: [JournalController],
  providers: [JournalService],
  exports: [JournalService],
})
export class JournalModule {}
