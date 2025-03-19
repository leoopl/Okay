import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsArray,
  MaxLength,
} from 'class-validator';

export class CreateJournalDto {
  @ApiProperty({ description: 'Journal entry title' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  readonly title: string;

  @ApiProperty({ description: 'Journal entry content' })
  @IsString()
  @IsNotEmpty()
  readonly content: string;

  @ApiProperty({
    description: 'Mood associated with the entry',
    required: false,
  })
  @IsString()
  @IsOptional()
  readonly mood?: string;

  @ApiProperty({
    description: 'Tags associated with the entry',
    required: false,
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  readonly tags?: string[];
}
