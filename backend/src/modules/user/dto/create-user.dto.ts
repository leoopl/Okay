import { ApiProperty } from '@nestjs/swagger';
import {
  IsBoolean,
  IsDateString,
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

const passwordRegEx = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;

export class CreateUserDto {
  @ApiProperty({ description: "User's first name" })
  @IsString()
  @MinLength(2, { message: 'Name must have at least 2 characters.' })
  @MaxLength(50)
  @IsNotEmpty()
  readonly name: string;

  @ApiProperty({ description: "User's last name", required: false })
  @IsString()
  @IsOptional()
  @MaxLength(50)
  readonly surname?: string;

  @ApiProperty({ description: "User's email address" })
  @IsNotEmpty()
  @IsEmail({}, { message: 'Please provide a valid email address.' })
  readonly email: string;

  @ApiProperty({ description: "User's date of birth" })
  @IsDateString({}, { message: 'Please provide a valid birth date.' })
  @IsOptional()
  readonly birthdate?: Date;

  @ApiProperty({ description: "User's gender", required: false })
  @IsString()
  @IsOptional()
  readonly gender?: string;

  @ApiProperty({ description: "User's password" })
  @IsNotEmpty()
  @IsString()
  @Matches(passwordRegEx, {
    message: `Password must contain at least 8 characters, 
      at least one uppercase letter, 
      one lowercase letter, 
      and one number`,
  })
  readonly password: string;

  @ApiProperty({ description: 'Consent to data processing', default: false })
  @IsBoolean()
  @IsOptional()
  readonly consentToDataProcessing?: boolean;

  @ApiProperty({ description: 'Consent to research', default: false })
  @IsBoolean()
  @IsOptional()
  readonly consentToResearch?: boolean;

  @ApiProperty({ description: 'Consent to marketing', default: false })
  @IsBoolean()
  @IsOptional()
  readonly consentToMarketing?: boolean;
}
