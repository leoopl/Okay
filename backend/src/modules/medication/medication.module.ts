import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MedicationController } from './medication.controller';
import { MedicationService } from './medication.service';
import { Medication } from './entities/medication.entity';
import { DoseLog } from './entities/dose-log.entity';
import { ScheduleTime } from './entities/schedule-time.entity';
import { AuditModule } from '../../core/audit/audit.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Medication, DoseLog, ScheduleTime]),
    AuditModule,
  ],
  controllers: [MedicationController],
  providers: [MedicationService],
  exports: [MedicationService],
})
export class MedicationModule {}
