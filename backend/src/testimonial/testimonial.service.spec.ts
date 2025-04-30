import { Test, TestingModule } from '@nestjs/testing';
import { TestimonialService } from './testimonial.service';

describe('TestimonialService', () => {
  let service: TestimonialService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TestimonialService],
    }).compile();

    service = module.get<TestimonialService>(TestimonialService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
