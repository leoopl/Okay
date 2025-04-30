// backend/src/modules/testimonial/testimonial.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Testimonial, TestimonialStatus } from './entities/testimonial.entity';
import { CreateTestimonialDto } from './dto/create-testimonial.dto';
import { AuditService } from 'src/core/audit/audit.service';
import { AuditAction } from 'src/core/audit/entities/audit-log.entity';

@Injectable()
export class TestimonialService {
  constructor(
    @InjectRepository(Testimonial)
    private testimonialRepository: Repository<Testimonial>,
    private readonly auditService: AuditService,
  ) {}

  async create(
    createTestimonialDto: CreateTestimonialDto,
  ): Promise<Testimonial> {
    const testimonial = this.testimonialRepository.create({
      ...createTestimonialDto,
      status: TestimonialStatus.PENDING,
    });

    return this.testimonialRepository.save(testimonial);
  }

  async findAll(): Promise<Testimonial[]> {
    return this.testimonialRepository.find({
      relations: ['approvedBy'],
      order: { createdAt: 'DESC' },
    });
  }

  async findAllApproved(): Promise<Testimonial[]> {
    return this.testimonialRepository.find({
      where: { status: TestimonialStatus.APPROVED },
      order: { approvedAt: 'DESC' },
    });
  }

  async findAllPending(): Promise<Testimonial[]> {
    return this.testimonialRepository.find({
      where: { status: TestimonialStatus.PENDING },
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string): Promise<Testimonial> {
    const testimonial = await this.testimonialRepository.findOne({
      where: { id },
      relations: ['approvedBy'],
    });

    if (!testimonial) {
      throw new NotFoundException(`Testimonial with ID ${id} not found`);
    }

    return testimonial;
  }

  async approve(id: string, adminId: string): Promise<Testimonial> {
    const testimonial = await this.findOne(id);

    testimonial.status = TestimonialStatus.APPROVED;
    testimonial.approvedById = adminId;
    testimonial.approvedAt = new Date();

    const updatedTestimonial =
      await this.testimonialRepository.save(testimonial);

    // Audit the approval
    await this.auditService.logAction({
      userId: adminId,
      action: AuditAction.UPDATE,
      resource: 'testimonial',
      resourceId: id,
      details: { status: 'approved' },
    });

    return updatedTestimonial;
  }

  async reject(id: string, adminId: string): Promise<Testimonial> {
    const testimonial = await this.findOne(id);

    testimonial.status = TestimonialStatus.REJECTED;

    const updatedTestimonial =
      await this.testimonialRepository.save(testimonial);

    // Audit the rejection
    await this.auditService.logAction({
      userId: adminId,
      action: AuditAction.UPDATE,
      resource: 'testimonial',
      resourceId: id,
      details: { status: 'rejected' },
    });

    return updatedTestimonial;
  }

  async remove(id: string, adminId: string): Promise<void> {
    const testimonial = await this.findOne(id);

    await this.testimonialRepository.remove(testimonial);

    // Audit the deletion
    await this.auditService.logAction({
      userId: adminId,
      action: AuditAction.DELETE,
      resource: 'testimonial',
      resourceId: id,
    });
  }
}
