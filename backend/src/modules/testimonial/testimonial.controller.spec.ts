import { Test, TestingModule } from '@nestjs/testing';
import { TestimonialController } from './testimonial.controller';
import { TestimonialService } from './testimonial.service';

describe('TestimonialController', () => {
  let controller: TestimonialController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TestimonialController],
      providers: [TestimonialService],
    }).compile();

    controller = module.get<TestimonialController>(TestimonialController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
