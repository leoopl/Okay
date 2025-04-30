// backend/src/modules/testimonial/dto/update-testimonial-status.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty } from 'class-validator';
import { TestimonialStatus } from '../entities/testimonial.entity';

export class UpdateTestimonialStatusDto {
  @ApiProperty({
    description: 'New status for the testimonial',
    enum: TestimonialStatus,
  })
  @IsEnum(TestimonialStatus)
  @IsNotEmpty()
  readonly status: TestimonialStatus;
}
