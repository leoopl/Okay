import { ApiProperty } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreateTestimonialDto {
  @ApiProperty({ description: 'The testimonial message' })
  @IsString()
  @IsNotEmpty({ message: 'Message is required' })
  readonly message: string;

  @ApiProperty({ description: 'Email of the person submitting testimonial' })
  @IsEmail({}, { message: 'Please provide a valid email address' })
  @IsNotEmpty()
  readonly email: string;

  @ApiProperty({ description: 'Location (optional)', required: false })
  @IsString()
  @IsOptional()
  readonly location?: string;

  @ApiProperty({ description: 'Newsletter subscription', default: false })
  @IsBoolean()
  @IsOptional()
  readonly newsletter?: boolean;
}
