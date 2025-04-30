import { Test, TestingModule } from '@nestjs/testing';
import { MedicationController } from './medication.controller';
import { MedicationService } from './medication.service';

describe('MedicationController', () => {
  let controller: MedicationController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MedicationController],
      providers: [MedicationService],
    }).compile();

    controller = module.get<MedicationController>(MedicationController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
