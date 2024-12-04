import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Put,
  Delete,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { BreathingTechniqueService } from './breathing-technique.service';
import { CreateBreathingTechniqueDto } from './dto/create-breathing-technique.dto';
import { UpdateBreathingTechniqueDto } from './dto/update-breathing-technique.dto';
import { IBreathingTechnique } from './interfaces/breathing-technique.interface';

@Controller('breathing-techniques')
export class BreathingTechniqueController {
  constructor(
    private readonly breathingTechniquesService: BreathingTechniqueService,
  ) {}

  @Get()
  async findAll(): Promise<IBreathingTechnique[]> {
    return await this.breathingTechniquesService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<IBreathingTechnique> {
    return await this.breathingTechniquesService.findOne(id);
  }

  // @UseGuards(JwtAuthGuard)
  @Post()
  async create(
    @Body() createBreathingTechniqueDto: CreateBreathingTechniqueDto,
  ): Promise<IBreathingTechnique> {
    return await this.breathingTechniquesService.create(
      createBreathingTechniqueDto,
    );
  }

  // @UseGuards(JwtAuthGuard)
  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() updateBreathingTechniqueDto: UpdateBreathingTechniqueDto,
  ): Promise<IBreathingTechnique> {
    return await this.breathingTechniquesService.update(
      id,
      updateBreathingTechniqueDto,
    );
  }

  // @UseGuards(JwtAuthGuard)
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string): Promise<void> {
    await this.breathingTechniquesService.remove(id);
  }
}
