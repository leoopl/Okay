import { ApiProperty } from '@nestjs/swagger';
import { Exclude, Expose, Type } from 'class-transformer';
import {
  InterpretationResult,
  CalculatedScores,
} from '../interfaces/inventory.interface';

export class UserResponseOptionDto {
  @ApiProperty({ description: 'Question ID' })
  questionId: string;

  @ApiProperty({ description: 'Selected option value' })
  optionValue: number;

  @ApiProperty({ description: 'Question text' })
  questionTitle?: string;

  @ApiProperty({ description: 'Option label' })
  optionLabel?: string;
}

@Exclude()
export class GetInventoryResponseDto {
  @Expose()
  @ApiProperty({ description: 'Response ID' })
  id: string;

  @Expose()
  @ApiProperty({ description: 'Inventory ID' })
  inventoryId: string;

  @Expose()
  @ApiProperty({ description: 'Inventory title' })
  inventoryTitle: string;

  @Expose()
  @ApiProperty({ description: 'User responses', type: [UserResponseOptionDto] })
  @Type(() => UserResponseOptionDto)
  responses: UserResponseOptionDto[];

  @Expose()
  @ApiProperty({ description: 'Calculated scores' })
  calculatedScores: CalculatedScores;

  @Expose()
  @ApiProperty({ description: 'Interpretation results' })
  interpretationResults: InterpretationResult;

  @Expose()
  @ApiProperty({ description: 'Date when assessment was completed' })
  completedAt: Date;

  constructor(partial: Partial<GetInventoryResponseDto>) {
    Object.assign(this, partial);
  }
}
