import { ApiProperty } from '@nestjs/swagger';
import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

export class LogDoseDto {
  @ApiProperty({ description: 'Medication ID' })
  @IsUUID()
  @IsNotEmpty()
  medicationId: string;

  @ApiProperty({
    description: 'Status of the dose',
    enum: ['taken', 'skipped', 'delayed'],
    default: 'taken',
  })
  @IsEnum(['taken', 'skipped', 'delayed'])
  status: 'taken' | 'skipped' | 'delayed';

  @ApiProperty({
    description: 'Timestamp when the dose was taken/skipped/delayed',
  })
  @IsDateString()
  timestamp: string;

  @ApiProperty({ description: 'Notes about this dose', required: false })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({
    description: 'Scheduled time for this dose (if applicable)',
    required: false,
  })
  @IsOptional()
  @IsString()
  scheduledTime?: string;
}
