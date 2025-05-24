import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class UploadProfilePictureDto {
  @ApiProperty({
    type: 'string',
    format: 'binary',
    description: 'Profile picture file',
  })
  file: Express.Multer.File;

  @ApiProperty({ description: 'Storage provider to use', required: false })
  @IsOptional()
  @IsString()
  provider?: string;
}
