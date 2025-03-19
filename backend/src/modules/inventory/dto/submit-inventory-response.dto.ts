import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  IsArray,
  IsNumber,
  ValidateNested,
  ArrayMinSize,
} from 'class-validator';
import { Type } from 'class-transformer';

class AnswerDto {
  @ApiProperty({ description: 'Question ID' })
  @IsNumber()
  questionId: number;

  @ApiProperty({ description: 'Selected option ID' })
  @IsNumber()
  optionId: number;

  @ApiProperty({ description: 'Answer value' })
  @IsNumber()
  value: number;
}

export class SubmitInventoryResponseDto {
  @ApiProperty({ description: 'Inventory ID' })
  @IsString()
  @IsNotEmpty()
  inventoryId: string;

  @ApiProperty({ description: 'User answers', type: [AnswerDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @ArrayMinSize(1)
  @Type(() => AnswerDto)
  answers: AnswerDto[];
}
