import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class LinkAccountDto {
  @ApiProperty({ description: 'OAuth provider name' })
  @IsString()
  @IsNotEmpty()
  provider: string;

  @ApiProperty({ description: 'Authorization code from OAuth provider' })
  @IsString()
  @IsNotEmpty()
  code: string;

  @ApiProperty({ description: 'PKCE code verifier' })
  @IsString()
  @IsNotEmpty()
  codeVerifier: string;
}
