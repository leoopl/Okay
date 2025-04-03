import { PartialType } from '@nestjs/mapped-types';
import { ApiProperty } from '@nestjs/swagger';
import { IsOptional } from 'class-validator';
import { CreateUserDto } from './create-user.dto';

export class UpdateUserDto extends PartialType(CreateUserDto) {
  @ApiProperty({ description: 'Name', required: false })
  @IsOptional()
  readonly name?: string;

  @ApiProperty({ description: 'Email', required: false })
  @IsOptional()
  readonly email?: string;

  @ApiProperty({ description: 'Surname', required: false })
  @IsOptional()
  readonly surname?: string;

  @ApiProperty({ description: 'Gender', required: false })
  @IsOptional()
  readonly gender?: string;

  @ApiProperty({ description: 'Birthdate', required: false })
  @IsOptional()
  readonly birthdate?: Date;
}
