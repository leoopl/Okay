import { Controller, Get, Post, Body } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { TestimonialService } from './testimonial.service';
import { CreateTestimonialDto } from './dto/create-testimonial.dto';
import { Testimonial } from './entities/testimonial.entity';
import { Public } from 'src/common/decorators/is-public.decorator';

@ApiTags('testimonials')
@Controller('testimonials')
export class TestimonialController {
  constructor(private readonly testimonialService: TestimonialService) {}

  @Public()
  @ApiOperation({ summary: 'Submit a new testimonial' })
  @ApiResponse({ status: 201, description: 'Testimonial created successfully' })
  @Post()
  async create(
    @Body() createTestimonialDto: CreateTestimonialDto,
  ): Promise<Testimonial> {
    return this.testimonialService.create(createTestimonialDto);
  }

  @Public()
  @ApiOperation({ summary: 'Get all approved testimonials' })
  @ApiResponse({
    status: 200,
    description: 'Returns all approved testimonials',
  })
  @Get('approved')
  async findAllApproved(): Promise<Testimonial[]> {
    return this.testimonialService.findAllApproved();
  }
}
