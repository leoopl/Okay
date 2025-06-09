import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class OAuthCallbackDto {
  @ApiProperty({ description: 'Authorization code from OAuth provider' })
  @IsString()
  @IsOptional()
  code?: string;

  @ApiProperty({ description: 'State parameter for CSRF protection' })
  @IsString()
  @IsOptional()
  state?: string;

  @ApiProperty({ description: 'OAuth error code', required: false })
  @IsString()
  @IsOptional()
  error?: string;

  @ApiProperty({ description: 'OAuth error description', required: false })
  @IsString()
  @IsOptional()
  error_description?: string;
}
