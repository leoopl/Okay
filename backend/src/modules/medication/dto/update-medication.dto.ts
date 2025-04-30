import { PartialType } from '@nestjs/mapped-types';
import { CreateMedicationDto } from './create-medication.dto';
import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsOptional, ValidateNested } from 'class-validator';
import { ScheduleTimeDto } from './create-medication.dto';
import { Type } from 'class-transformer';

export class UpdateMedicationDto extends PartialType(CreateMedicationDto) {
  @ApiProperty({
    description: 'Schedule (times and days)',
    type: [ScheduleTimeDto],
    required: false,
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ScheduleTimeDto)
  schedule?: ScheduleTimeDto[];
}
