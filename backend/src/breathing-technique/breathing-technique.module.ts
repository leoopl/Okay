import { Module } from '@nestjs/common';
import { BreathingTechniqueController } from './breathing-technique.controller';
import { BreathingTechniqueService } from './breathing-technique.service';
import { BreathingTechnique } from './entities/breathing-technique.entity';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
  controllers: [BreathingTechniqueController],
  providers: [BreathingTechniqueService, BreathingTechnique],
  imports: [TypeOrmModule.forFeature([BreathingTechnique])],
})
export class BreathModule {}
