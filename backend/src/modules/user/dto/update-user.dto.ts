import { PartialType } from '@nestjs/mapped-types';
import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';
import { CreateUserDto } from './create-user.dto';

export class UpdateUserDto extends PartialType(CreateUserDto) {
  @ApiProperty({ description: 'Consent to data processing', required: false })
  @IsBoolean()
  @IsOptional()
  readonly consentToDataProcessing?: boolean;

  @ApiProperty({ description: 'Consent to research', required: false })
  @IsBoolean()
  @IsOptional()
  readonly consentToResearch?: boolean;

  @ApiProperty({ description: 'Consent to marketing', required: false })
  @IsBoolean()
  @IsOptional()
  readonly consentToMarketing?: boolean;
}
