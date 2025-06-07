import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';

export class LogoutDto {
  @ApiProperty({
    description: 'Logout from all devices',
    required: false,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  allDevices?: boolean;
}
