import { ApiProperty } from '@nestjs/swagger';

export class RefreshTokenDto {
  @ApiProperty({ description: 'Refresh token (sent via cookie)' })
  refreshToken?: string;
}
