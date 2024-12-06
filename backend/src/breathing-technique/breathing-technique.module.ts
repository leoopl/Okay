// src/breathing-techniques/breathing-techniques.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BreathingTechniqueService } from './breathing-technique.service';
import { BreathingTechniqueController } from './breathing-technique.controller';
import { BreathingTechnique } from './entities/breathing-technique.entity';

@Module({
  imports: [TypeOrmModule.forFeature([BreathingTechnique])],
  providers: [BreathingTechniqueService],
  controllers: [BreathingTechniqueController],
})
export class BreathingTechniquesModule {}
