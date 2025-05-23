import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsArray,
  MaxLength,
  MinLength,
  ArrayMaxSize,
  IsEnum,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { JournalMood } from '../enum/journal.enum';

/**
 * DTO for creating a new journal entry
 * Validates TipTap content structure and sanitizes input
 */
export class CreateJournalDto {
  @ApiProperty({
    description: 'Journal entry title',
    example: 'My Daily Reflection',
    minLength: 1,
    maxLength: 200,
  })
  @IsString({ message: 'Title must be a string' })
  @IsNotEmpty({ message: 'Title is required' })
  @MinLength(1, { message: 'Title cannot be empty' })
  @MaxLength(200, { message: 'Title must not exceed 200 characters' })
  @Transform(({ value }) => value?.trim())
  readonly title: string;

  @ApiProperty({
    description: 'Journal entry content in TipTap JSON format as string',
    example:
      '{"type":"doc","content":[{"type":"paragraph","attrs":{"textAlign":null},"content":[{"type":"text","text":"Today I felt grateful for..."}]}]}',
  })
  @IsNotEmpty({ message: 'Content is required' })
  @IsString({ message: 'Content must be a string' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  readonly content: string;

  @ApiProperty({
    description: 'Mood associated with the entry',
    enum: JournalMood,
    required: false,
    example: JournalMood.GRATEFUL,
  })
  @IsOptional()
  @IsEnum(JournalMood, { message: 'Invalid mood value' })
  readonly mood?: JournalMood;

  @ApiProperty({
    description: 'Tags for categorizing the entry',
    type: [String],
    required: false,
    example: ['reflection', 'gratitude', 'personal-growth'],
    maxItems: 10,
  })
  @IsOptional()
  @IsArray({ message: 'Tags must be an array' })
  @IsString({ each: true, message: 'Each tag must be a string' })
  @ArrayMaxSize(10, { message: 'Maximum 10 tags allowed' })
  @Transform(({ value }) =>
    Array.isArray(value)
      ? value
          .map((tag) =>
            typeof tag === 'string' ? tag.trim().toLowerCase() : tag,
          )
          .filter((tag) => tag && tag.length > 0)
          .slice(0, 10) // Ensure max 10 tags
      : value,
  )
  readonly tags?: string[];
}
