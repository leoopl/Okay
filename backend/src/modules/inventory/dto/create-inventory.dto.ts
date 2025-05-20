import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  IsArray,
  IsObject,
  ValidateNested,
  IsOptional,
  IsBoolean,
  ArrayMinSize,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  Question,
  Option,
  AssessmentScoring,
} from '../interfaces/inventory.interface';

export class OptionDto implements Option {
  @ApiProperty({ description: 'Option label' })
  @IsString()
  @IsNotEmpty()
  label: string;

  @ApiProperty({ description: 'Option value for scoring' })
  @IsNotEmpty()
  value: number;
}

export class QuestionDto implements Question {
  @ApiProperty({ description: 'Question ID' })
  @IsString()
  @IsNotEmpty()
  id: string;

  @ApiProperty({ description: 'Question text' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({
    description: 'Subscale this question belongs to',
    required: false,
  })
  @IsString()
  @IsOptional()
  subscale?: string;

  @ApiProperty({
    description: 'Whether this question is reverse-scored',
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  reverseScore?: boolean;

  @ApiProperty({ description: 'Answer options', type: [OptionDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @ArrayMinSize(1)
  @Type(() => OptionDto)
  options: OptionDto[];
}

export class ScoreRangeDto {
  @ApiProperty({ description: 'Minimum score for this interpretation' })
  @IsNotEmpty()
  min: number;

  @ApiProperty({ description: 'Maximum score for this interpretation' })
  @IsNotEmpty()
  max: number;

  @ApiProperty({ description: 'Label for this score range' })
  @IsString()
  @IsNotEmpty()
  label: string;

  @ApiProperty({ description: 'Recommendation for this score range' })
  @IsString()
  @IsNotEmpty()
  recommendation: string;
}

export class SubscaleInterpretationDto {
  @ApiProperty({
    description: 'Maximum raw score for this subscale',
    required: false,
  })
  @IsOptional()
  maxRawScore?: number;

  @ApiProperty({ description: 'Score interpretations', type: [ScoreRangeDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @ArrayMinSize(1)
  @Type(() => ScoreRangeDto)
  interpretation: ScoreRangeDto[];
}

export class AssessmentScoringDto implements AssessmentScoring {
  @ApiProperty({ description: 'Total score range [min, max]', required: false })
  @IsOptional()
  totalScoreRange?: [number, number];

  @ApiProperty({ description: 'Subscale interpretations', required: false })
  @IsOptional()
  @IsObject()
  subscales?: { [key: string]: SubscaleInterpretationDto };

  @ApiProperty({
    description: 'Score interpretations for total score',
    required: false,
    type: [ScoreRangeDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ScoreRangeDto)
  interpretation?: ScoreRangeDto[];
}

export class CreateInventoryDto {
  @ApiProperty({ description: 'Inventory name (e.g. phq9, gad7, dass21)' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ description: 'Inventory title' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({ description: 'Inventory description' })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiProperty({ description: 'Inventory disclaimer', required: false })
  @IsString()
  @IsOptional()
  disclaimer?: string;

  @ApiProperty({ description: 'Inventory questions', type: [QuestionDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @ArrayMinSize(1)
  @Type(() => QuestionDto)
  questions: QuestionDto[];

  @ApiProperty({ description: 'Scoring rules' })
  @IsObject()
  @ValidateNested()
  @Type(() => AssessmentScoringDto)
  scoring: AssessmentScoringDto;

  @ApiProperty({ description: 'Version number', required: false })
  @IsString()
  @IsOptional()
  version?: string;

  @ApiProperty({ description: 'Source information', required: false })
  @IsString()
  @IsOptional()
  source?: string;
}
