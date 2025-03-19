import { PartialType } from '@nestjs/mapped-types';
import { CreateBreathingTechniqueDto } from './create-breathing-technique.dto';

export class UpdateBreathingTechniqueDto extends PartialType(
  CreateBreathingTechniqueDto,
) {}
