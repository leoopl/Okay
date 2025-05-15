import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Matches, MinLength } from 'class-validator';

const passwordRegEx = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;

export class ChangePasswordDto {
  @ApiProperty({ description: 'Current password' })
  @IsNotEmpty({ message: 'Current password is required' })
  @IsString()
  readonly currentPassword: string;

  @ApiProperty({ description: 'New password' })
  @IsNotEmpty({ message: 'New password is required' })
  @IsString()
  @MinLength(8, { message: 'Password must have at least 8 characters' })
  @Matches(passwordRegEx, {
    message: `Password must contain at least 8 characters, 
      at least one uppercase letter, 
      one lowercase letter, 
      and one number`,
  })
  readonly newPassword: string;
}
