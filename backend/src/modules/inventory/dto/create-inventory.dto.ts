import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  IsArray,
  IsNumber,
  ValidateNested,
  ArrayMinSize,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

class OptionDto {
  @ApiProperty({ description: 'Option ID' })
  @IsNumber()
  id: number;

  @ApiProperty({ description: 'Option text' })
  @IsString()
  @IsNotEmpty()
  text: string;

  @ApiProperty({ description: 'Option value for scoring' })
  @IsNumber()
  value: number;
}

class QuestionDto {
  @ApiProperty({ description: 'Question ID' })
  @IsNumber()
  id: number;

  @ApiProperty({ description: 'Question text' })
  @IsString()
  @IsNotEmpty()
  text: string;

  @ApiProperty({ description: 'Answer options', type: [OptionDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @ArrayMinSize(1)
  @Type(() => OptionDto)
  options: OptionDto[];
}

class ScoreInterpretationDto {
  @ApiProperty({ description: 'Minimum score for this interpretation' })
  @IsNumber()
  minScore: number;

  @ApiProperty({ description: 'Maximum score for this interpretation' })
  @IsNumber()
  maxScore: number;

  @ApiProperty({ description: 'Interpretation text' })
  @IsString()
  @IsNotEmpty()
  interpretation: string;
}

export class CreateInventoryDto {
  @ApiProperty({ description: 'Inventory name (e.g. PHQ-9, GAD-7)' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ description: 'Inventory description' })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiProperty({ description: 'Inventory questions', type: [QuestionDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @ArrayMinSize(1)
  @Type(() => QuestionDto)
  questions: QuestionDto[];

  @ApiProperty({ description: 'Minimum possible score' })
  @IsNumber()
  @Min(0)
  minScore: number;

  @ApiProperty({ description: 'Maximum possible score' })
  @IsNumber()
  maxScore: number;

  @ApiProperty({
    description: 'Score interpretations',
    type: [ScoreInterpretationDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @ArrayMinSize(1)
  @Type(() => ScoreInterpretationDto)
  scoreInterpretations: ScoreInterpretationDto[];
}
