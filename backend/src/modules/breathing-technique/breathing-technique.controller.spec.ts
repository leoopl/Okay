import { Test, TestingModule } from '@nestjs/testing';
import { BreathController } from './breathing-technique.controller';

describe('BreathController', () => {
  let controller: BreathController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [BreathController],
    }).compile();

    controller = module.get<BreathController>(BreathController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
