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
  UseGuards,
} from '@nestjs/common';
import { BreathingTechniqueService } from './breathing-technique.service';
import { CreateBreathingTechniqueDto } from './dto/create-breathing-technique.dto';
import { UpdateBreathingTechniqueDto } from './dto/update-breathing-technique.dto';
import { IBreathingTechnique } from './interfaces/breathing-technique.interface';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Auth0Guard } from 'src/core/auth/guards/auth0.guard';
import { RolesGuard } from 'src/core/auth/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';

@ApiTags('breathing-techniques')
@ApiBearerAuth('Auth0')
@UseGuards(Auth0Guard)
@Controller('breathing-techniques')
export class BreathingTechniqueController {
  constructor(
    private readonly breathingTechniquesService: BreathingTechniqueService,
  ) {}

  @ApiOperation({
    summary: 'Create a new breathing technique',
  })
  @ApiResponse({
    status: 201,
    description: 'Breathing technique created successfully',
  })
  @ApiResponse({ status: 403, description: 'Forbidden - requires admin role' })
  @UseGuards(RolesGuard)
  @Roles('admin')
  @Post()
  async create(
    @Body() createBreathingTechniqueDto: CreateBreathingTechniqueDto,
  ): Promise<IBreathingTechnique> {
    return await this.breathingTechniquesService.create(
      createBreathingTechniqueDto,
    );
  }

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

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string): Promise<void> {
    await this.breathingTechniquesService.remove(id);
  }
  @Get()
  async findAll(): Promise<IBreathingTechnique[]> {
    return await this.breathingTechniquesService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<IBreathingTechnique> {
    return await this.breathingTechniquesService.findOne(id);
  }
}
