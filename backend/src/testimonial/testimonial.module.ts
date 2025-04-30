import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Testimonial } from './entities/testimonial.entity';
import { TestimonialService } from './testimonial.service';
import { TestimonialController } from './testimonial.controller';
import { AdminTestimonialController } from './admin-testimonial.controller';
import { AuditModule } from 'src/core/audit/audit.module';

@Module({
  imports: [TypeOrmModule.forFeature([Testimonial]), AuditModule],
  controllers: [TestimonialController, AdminTestimonialController],
  providers: [TestimonialService],
  exports: [TestimonialService],
})
export class TestimonialModule {}
