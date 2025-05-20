import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  IsArray,
  IsNumber,
  ValidateNested,
  ArrayMinSize,
  IsBoolean,
  IsOptional,
} from 'class-validator';
import { Type } from 'class-transformer';
import { UserResponseOption } from '../interfaces/inventory.interface';

export class ResponseOptionDto implements UserResponseOption {
  @ApiProperty({ description: 'Question ID' })
  @IsString()
  @IsNotEmpty()
  questionId: string;

  @ApiProperty({ description: 'Selected option value' })
  @IsNumber()
  optionValue: number;

  @ApiProperty({ description: 'Question text (optional)', required: false })
  @IsString()
  @IsOptional()
  questionTitle?: string;

  @ApiProperty({ description: 'Option label (optional)', required: false })
  @IsString()
  @IsOptional()
  optionLabel?: string;
}

export class SubmitInventoryResponseDto {
  @ApiProperty({ description: 'Inventory ID' })
  @IsString()
  @IsNotEmpty()
  inventoryId: string;

  @ApiProperty({ description: 'User responses', type: [ResponseOptionDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @ArrayMinSize(1)
  @Type(() => ResponseOptionDto)
  responses: ResponseOptionDto[];

  @ApiProperty({ description: 'User consent for data processing' })
  @IsBoolean()
  @IsNotEmpty()
  consentGiven: boolean;
}
