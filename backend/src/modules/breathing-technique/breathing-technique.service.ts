import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { BreathingTechnique } from './entities/breathing-technique.entity';
import { DeleteResult, Repository } from 'typeorm';
import { IBreathingTechnique } from './interfaces/breathing-technique.interface';
import { CreateBreathingTechniqueDto } from './dto/create-breathing-technique.dto';
import { UpdateBreathingTechniqueDto } from './dto/update-breathing-technique.dto';

@Injectable()
export class BreathingTechniqueService {
  constructor(
    @InjectRepository(BreathingTechnique)
    private readonly breathingTechniquesRepository: Repository<IBreathingTechnique>,
  ) {}

  async create(
    createBreathingTechniqueDto: CreateBreathingTechniqueDto,
  ): Promise<IBreathingTechnique> {
    const technique = this.breathingTechniquesRepository.create(
      createBreathingTechniqueDto,
    );
    await this.breathingTechniquesRepository.save(technique);
    return technique;
  }

  async findAll(): Promise<IBreathingTechnique[]> {
    return await this.breathingTechniquesRepository.find();
  }

  async findOne(id: string): Promise<IBreathingTechnique> {
    const technique = await this.breathingTechniquesRepository.findOneBy({
      id,
    });
    if (!technique) {
      throw new NotFoundException(
        `Breathing Technique with ID ${id} not found`,
      );
    }
    return technique;
  }

  async update(
    id: string,
    updateBreathingTechniqueDto: UpdateBreathingTechniqueDto,
  ): Promise<IBreathingTechnique> {
    await this.breathingTechniquesRepository.update(
      id,
      updateBreathingTechniqueDto,
    );
    return this.findOne(id);
  }

  async remove(id: string): Promise<DeleteResult> {
    const result = await this.breathingTechniquesRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(
        `Breathing Technique with ID ${id} not found`,
      );
    }
    return result;
  }
}
