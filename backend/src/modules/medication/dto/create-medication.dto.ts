import { ApiProperty } from '@nestjs/swagger';
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class ScheduleTimeDto {
  @ApiProperty({ description: 'Time in HH:MM format' })
  @IsString()
  @IsNotEmpty()
  time: string;

  @ApiProperty({ description: 'Days of the week this time applies to' })
  @IsArray()
  @IsString({ each: true })
  days: string[];
}

export class CreateMedicationDto {
  @ApiProperty({ description: 'Medication name' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ description: 'Medication dosage' })
  @IsString()
  @IsNotEmpty()
  dosage: string;

  @ApiProperty({
    description: 'Medication form',
    enum: ['Capsule', 'Tablet', 'Drops', 'Injectable', 'Ointment', 'Other'],
  })
  @IsEnum(['Capsule', 'Tablet', 'Drops', 'Injectable', 'Ointment', 'Other'])
  form: string;

  @ApiProperty({ description: 'Start date (YYYY-MM-DD)' })
  @IsDateString()
  startDate: string;

  @ApiProperty({ description: 'End date (YYYY-MM-DD)', required: false })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiProperty({ description: 'Additional notes', required: false })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({ description: "Doctor's instructions", required: false })
  @IsOptional()
  @IsString()
  instructions?: string;

  @ApiProperty({
    description: 'Schedule (times and days)',
    type: [ScheduleTimeDto],
  })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ScheduleTimeDto)
  schedule: ScheduleTimeDto[];
}
