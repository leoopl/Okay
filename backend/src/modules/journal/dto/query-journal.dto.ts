import { ApiProperty } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { JournalMood } from '../enum/journal.enum';

/**
 * Query DTO for filtering journal entries
 */
export class JournalQueryDto {
  @ApiProperty({
    description: 'Search term for title and content',
    required: false,
    example: 'gratitude',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  @Transform(({ value }) => value?.trim())
  readonly search?: string;

  @ApiProperty({
    description: 'Filter by mood',
    enum: JournalMood,
    required: false,
  })
  @IsOptional()
  @IsEnum(JournalMood)
  readonly mood?: JournalMood;

  @ApiProperty({
    description: 'Filter by tags (comma-separated)',
    required: false,
    example: 'reflection,gratitude',
  })
  @IsOptional()
  @IsString()
  @Transform(({ value }) =>
    typeof value === 'string'
      ? value
          .split(',')
          .map((tag) => tag.trim().toLowerCase())
          .filter(Boolean)
      : value,
  )
  readonly tags?: string[];

  @ApiProperty({
    description: 'Number of entries to return',
    required: false,
    default: 20,
    minimum: 1,
    maximum: 100,
  })
  @IsOptional()
  @Type(() => Number)
  @Transform(({ value }) => Math.min(Math.max(parseInt(value) || 20, 1), 100))
  readonly limit?: number = 20;

  @ApiProperty({
    description: 'Number of entries to skip',
    required: false,
    default: 0,
    minimum: 0,
  })
  @IsOptional()
  @Type(() => Number)
  @Transform(({ value }) => Math.max(parseInt(value) || 0, 0))
  readonly offset?: number = 0;
}
