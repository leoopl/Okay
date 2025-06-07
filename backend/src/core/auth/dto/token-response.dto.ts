import { ApiProperty } from '@nestjs/swagger';

export class TokenResponseDto {
  @ApiProperty({ description: 'JWT access token' })
  accessToken: string;

  @ApiProperty({ description: 'Token type', default: 'Bearer' })
  tokenType: string;

  @ApiProperty({ description: 'Access token expiration in seconds' })
  expiresIn: number;

  @ApiProperty({ description: 'CSRF token for state-changing operations' })
  csrfToken: string;

  @ApiProperty({ description: 'User profile information' })
  user: {
    id: string;
    email: string;
    name: string;
    roles: string[];
  };
}
