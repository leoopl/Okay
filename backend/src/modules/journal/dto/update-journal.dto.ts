import { ApiProperty, PartialType } from '@nestjs/swagger';
import { CreateJournalDto } from './create-journal.dto';
import {
  ArrayMaxSize,
  IsArray,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { JournalMood } from '../enum/journal.enum';

/**
 * DTO for updating an existing journal entry
 * All fields are optional for partial updates
 */
export class UpdateJournalDto extends PartialType(CreateJournalDto) {
  @ApiProperty({
    description: 'Updated journal entry title',
    required: false,
    minLength: 1,
    maxLength: 200,
  })
  @IsOptional()
  @IsString({ message: 'Title must be a string' })
  @MinLength(1, { message: 'Title cannot be empty' })
  @MaxLength(200, { message: 'Title must not exceed 200 characters' })
  @Transform(({ value }) => value?.trim())
  readonly title?: string;

  @ApiProperty({
    description:
      'Updated journal entry content in TipTap JSON format as string',
    required: false,
    example:
      '{"type":"doc","content":[{"type":"paragraph","attrs":{"textAlign":null},"content":[{"type":"text","text":"Updated content..."}]}]}',
  })
  @IsOptional()
  @IsString({ message: 'Content must be a string' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  readonly content?: string;

  @ApiProperty({
    description: 'Updated mood',
    enum: JournalMood,
    required: false,
  })
  @IsOptional()
  @IsEnum(JournalMood, { message: 'Invalid mood value' })
  readonly mood?: JournalMood;

  @ApiProperty({
    description: 'Updated tags',
    type: [String],
    required: false,
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
          .slice(0, 10)
      : value,
  )
  readonly tags?: string[];
}
