import {
  IsOptional,
  IsBoolean,
  IsString,
  IsInt,
  Min,
  Max,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class SearchProfessionalsDto {
  @ApiPropertyOptional({
    description: 'Professional CBO code for filtering',
    example: '225125',
  })
  @IsOptional()
  @IsString()
  professionalCbo?: string;

  @ApiPropertyOptional({
    description: 'Filter by SUS attendance',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  professionalAtendeSus?: boolean;

  @ApiPropertyOptional({
    description: 'Municipality for filtering',
    example: 'São Paulo',
  })
  @IsOptional()
  @IsString()
  municipio?: string;

  @ApiPropertyOptional({
    description: 'Text search in fantasy name and professional name',
    example: 'Hospital Central',
  })
  @IsOptional()
  @IsString()
  textSearch?: string;

  @ApiPropertyOptional({
    description: 'Location search in address (logradouro)',
    example: 'Rua das Flores',
  })
  @IsOptional()
  @IsString()
  locationSearch?: string;

  @ApiPropertyOptional({
    description: 'Page number for pagination',
    example: 1,
    minimum: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Number of items per page',
    example: 20,
    minimum: 1,
    maximum: 100,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}
