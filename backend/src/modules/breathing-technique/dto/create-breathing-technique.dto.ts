import { ApiProperty } from '@nestjs/swagger';
import {
  ArrayMinSize,
  ArrayNotEmpty,
  IsArray,
  IsHexColor,
  IsNotEmpty,
  IsString,
} from 'class-validator';

export class CreateBreathingTechniqueDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  readonly name: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  readonly desc: string;

  @ApiProperty()
  @IsArray()
  @ArrayNotEmpty()
  @ArrayMinSize(1)
  readonly secs: number[];

  @ApiProperty()
  @IsHexColor()
  @IsNotEmpty()
  readonly bgcolor: string;
}
