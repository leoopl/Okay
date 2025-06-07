import {
  Controller,
  Get,
  Param,
  Delete,
  UseGuards,
  Req,
  Patch,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { TestimonialService } from './testimonial.service';
import { Testimonial } from './entities/testimonial.entity';
import { JwtAuthGuard } from 'src/core/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/core/auth/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { IAuthenticatedRequest } from 'src/core/auth/interfaces/auth-request.interface';

@ApiTags('admin/testimonials')
@Controller('admin/testimonials')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class AdminTestimonialController {
  constructor(private readonly testimonialService: TestimonialService) {}

  @ApiOperation({ summary: 'Get all testimonials (Admin only)' })
  @ApiResponse({ status: 200, description: 'Returns all testimonials' })
  @Get()
  async findAll(): Promise<Testimonial[]> {
    return this.testimonialService.findAll();
  }

  @ApiOperation({ summary: 'Get all pending testimonials (Admin only)' })
  @ApiResponse({ status: 200, description: 'Returns all pending testimonials' })
  @Get('pending')
  async findAllPending(): Promise<Testimonial[]> {
    return this.testimonialService.findAllPending();
  }

  @ApiOperation({ summary: 'Get a specific testimonial (Admin only)' })
  @ApiResponse({ status: 200, description: 'Returns the testimonial' })
  @ApiResponse({ status: 404, description: 'Testimonial not found' })
  @Get(':id')
  async findOne(@Param('id') id: string): Promise<Testimonial> {
    return this.testimonialService.findOne(id);
  }

  @ApiOperation({ summary: 'Approve a testimonial (Admin only)' })
  @ApiResponse({
    status: 200,
    description: 'Testimonial approved successfully',
  })
  @ApiResponse({ status: 404, description: 'Testimonial not found' })
  @Patch(':id/approve')
  async approve(
    @Param('id') id: string,
    @Req() req: IAuthenticatedRequest,
  ): Promise<Testimonial> {
    return this.testimonialService.approve(id, req.user.userId);
  }

  @ApiOperation({ summary: 'Reject a testimonial (Admin only)' })
  @ApiResponse({
    status: 200,
    description: 'Testimonial rejected successfully',
  })
  @ApiResponse({ status: 404, description: 'Testimonial not found' })
  @Patch(':id/reject')
  async reject(
    @Param('id') id: string,
    @Req() req: IAuthenticatedRequest,
  ): Promise<Testimonial> {
    return this.testimonialService.reject(id, req.user.userId);
  }

  @ApiOperation({ summary: 'Delete a testimonial (Admin only)' })
  @ApiResponse({ status: 204, description: 'Testimonial deleted successfully' })
  @ApiResponse({ status: 404, description: 'Testimonial not found' })
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @Param('id') id: string,
    @Req() req: IAuthenticatedRequest,
  ): Promise<void> {
    return this.testimonialService.remove(id, req.user.userId);
  }
}
