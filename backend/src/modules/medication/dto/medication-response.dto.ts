import { ApiProperty } from '@nestjs/swagger';
import { Medication } from '../entities/medication.entity';

export class ScheduleTimeResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  time: string;

  @ApiProperty({ type: [String] })
  days: string[];
}

export class MedicationResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  dosage: string;

  @ApiProperty()
  form: string;

  @ApiProperty()
  startDate: Date;

  @ApiProperty({ required: false })
  endDate?: Date;

  @ApiProperty({ required: false })
  notes?: string;

  @ApiProperty({ required: false })
  instructions?: string;

  @ApiProperty({ type: [ScheduleTimeResponseDto] })
  schedule: ScheduleTimeResponseDto[];

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  constructor(medication: Medication) {
    this.id = medication.id;
    this.name = medication.name;
    this.dosage = medication.dosage;
    this.form = medication.form;
    this.startDate = new Date(medication.startDate);
    this.endDate = medication.endDate
      ? new Date(medication.endDate)
      : undefined;
    this.notes = medication.notes;
    this.instructions = medication.instructions;
    this.schedule = medication.schedule.map((scheduleTime) => ({
      id: scheduleTime.id,
      time: scheduleTime.time,
      days: scheduleTime.days,
    }));
    this.createdAt = medication.createdAt;
    this.updatedAt = medication.updatedAt;
  }
}
