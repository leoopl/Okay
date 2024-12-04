import { Test, TestingModule } from '@nestjs/testing';
import { BreathService } from './breathing-technique.service';

describe('BreathService', () => {
  let service: BreathService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [BreathService],
    }).compile();

    service = module.get<BreathService>(BreathService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
