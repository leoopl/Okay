import {
  ArrayMinSize,
  ArrayNotEmpty,
  IsArray,
  IsHexColor,
  IsNotEmpty,
  IsString,
} from 'class-validator';

export class CreateBreathingTechniqueDto {
  @IsString()
  @IsNotEmpty()
  readonly name: string;

  @IsString()
  @IsNotEmpty()
  readonly desc: string;

  @IsArray()
  @ArrayNotEmpty()
  @ArrayMinSize(1)
  readonly secs: number[];

  @IsHexColor()
  @IsNotEmpty()
  readonly bgcolor: string;
}
