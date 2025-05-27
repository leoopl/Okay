import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  IsBoolean,
} from 'class-validator';

export class GoogleOAuthCallbackDto {
  @ApiProperty({ description: 'Authorization code from Google' })
  @IsString()
  @IsNotEmpty()
  readonly code: string;

  @ApiProperty({ description: 'State parameter for CSRF protection' })
  @IsString()
  @IsNotEmpty()
  readonly state: string;

  @ApiProperty({ description: 'Scope granted by user', required: false })
  @IsString()
  @IsOptional()
  readonly scope?: string;
}

export class GoogleUserInfoDto {
  @ApiProperty({ description: 'Google user ID' })
  @IsString()
  @IsNotEmpty()
  readonly googleId: string;

  @ApiProperty({ description: 'User email address' })
  @IsEmail()
  @IsNotEmpty()
  readonly email: string;

  @ApiProperty({ description: 'User first name' })
  @IsString()
  @IsNotEmpty()
  readonly firstName: string;

  @ApiProperty({ description: 'User last name', required: false })
  @IsString()
  @IsOptional()
  readonly lastName?: string;

  @ApiProperty({ description: 'User profile picture URL', required: false })
  @IsUrl()
  @IsOptional()
  readonly picture?: string;

  @ApiProperty({ description: 'Whether email is verified by Google' })
  @IsBoolean()
  readonly emailVerified: boolean;
}

export class GoogleOAuthResponseDto {
  @ApiProperty({ description: 'JWT access token' })
  @IsString()
  @IsNotEmpty()
  readonly accessToken: string;

  @ApiProperty({ description: 'Token type (Bearer)' })
  @IsString()
  @IsNotEmpty()
  readonly tokenType: string;

  @ApiProperty({ description: 'Token expiration time in seconds' })
  @IsNotEmpty()
  readonly expiresIn: number;

  @ApiProperty({ description: 'CSRF token for subsequent requests' })
  @IsString()
  @IsNotEmpty()
  readonly csrfToken: string;

  @ApiProperty({ description: 'Whether this is a new user registration' })
  @IsBoolean()
  readonly isNewUser: boolean;

  @ApiProperty({ description: 'User information' })
  readonly user: {
    id: string;
    email: string;
    name: string;
    surname?: string;
    roles: string[];
    profilePictureUrl?: string;
  };
}

export class GoogleAccountLinkDto {
  @ApiProperty({ description: 'User ID to link Google account to' })
  @IsString()
  @IsNotEmpty()
  readonly userId: string;
}

export class GoogleAccountUnlinkDto {
  @ApiProperty({ description: 'Confirmation message' })
  @IsString()
  @IsNotEmpty()
  readonly message: string;
}
