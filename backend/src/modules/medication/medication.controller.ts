import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Req,
  Query,
} from '@nestjs/common';
import { MedicationService } from './medication.service';
import { CreateMedicationDto } from './dto/create-medication.dto';
import { UpdateMedicationDto } from './dto/update-medication.dto';
import { LogDoseDto } from './dto/log-dose.dto';
import { JwtAuthGuard } from '../../core/auth/guards/jwt-auth.guard';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { IAuthenticatedRequest } from '../../common/interfaces/auth-request.interface';
import { MedicationResponseDto } from './dto/medication-response.dto';

@ApiTags('medications')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard)
@Controller('medications')
export class MedicationController {
  constructor(private readonly medicationService: MedicationService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new medication' })
  @ApiResponse({
    status: 201,
    description: 'Medication created successfully',
    type: MedicationResponseDto,
  })
  async create(
    @Req() req: IAuthenticatedRequest,
    @Body() createMedicationDto: CreateMedicationDto,
  ): Promise<MedicationResponseDto> {
    return this.medicationService.create(req.user.userId, createMedicationDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all medications for the current user' })
  @ApiResponse({
    status: 200,
    description: 'List of medications',
    type: [MedicationResponseDto],
  })
  async findAll(
    @Req() req: IAuthenticatedRequest,
  ): Promise<MedicationResponseDto[]> {
    return this.medicationService.findAll(req.user.userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a medication by ID' })
  @ApiParam({ name: 'id', description: 'Medication ID' })
  @ApiResponse({
    status: 200,
    description: 'Medication details',
    type: MedicationResponseDto,
  })
  async findOne(
    @Param('id') id: string,
    @Req() req: IAuthenticatedRequest,
  ): Promise<MedicationResponseDto> {
    return this.medicationService.findOne(id, req.user.userId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a medication' })
  @ApiParam({ name: 'id', description: 'Medication ID' })
  @ApiResponse({
    status: 200,
    description: 'Medication updated successfully',
    type: MedicationResponseDto,
  })
  async update(
    @Param('id') id: string,
    @Req() req: IAuthenticatedRequest,
    @Body() updateMedicationDto: UpdateMedicationDto,
  ): Promise<MedicationResponseDto> {
    return this.medicationService.update(
      id,
      req.user.userId,
      updateMedicationDto,
    );
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a medication' })
  @ApiParam({ name: 'id', description: 'Medication ID' })
  @ApiResponse({ status: 200, description: 'Medication deleted successfully' })
  async remove(
    @Param('id') id: string,
    @Req() req: IAuthenticatedRequest,
  ): Promise<void> {
    return this.medicationService.remove(id, req.user.userId);
  }

  @Post('log-dose')
  @ApiOperation({ summary: 'Log a medication dose' })
  @ApiResponse({ status: 201, description: 'Dose logged successfully' })
  async logDose(
    @Req() req: IAuthenticatedRequest,
    @Body() logDoseDto: LogDoseDto,
  ): Promise<any> {
    return this.medicationService.logDose(req.user.userId, logDoseDto);
  }

  @Get('schedule/today')
  @ApiOperation({ summary: "Get today's medication schedule" })
  @ApiResponse({ status: 200, description: "Today's medication schedule" })
  async getTodaySchedule(@Req() req: IAuthenticatedRequest): Promise<any> {
    return this.medicationService.getTodaySchedule(req.user.userId);
  }

  @Get('logs/history')
  @ApiOperation({ summary: 'Get medication dose logs' })
  @ApiQuery({
    name: 'medicationId',
    required: false,
    description: 'Filter by medication ID',
  })
  @ApiQuery({
    name: 'startDate',
    required: false,
    description: 'Start date (YYYY-MM-DD)',
  })
  @ApiQuery({
    name: 'endDate',
    required: false,
    description: 'End date (YYYY-MM-DD)',
  })
  @ApiResponse({ status: 200, description: 'Medication dose logs' })
  async getDoseLogs(
    @Req() req: IAuthenticatedRequest,
    @Query('medicationId') medicationId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ): Promise<any> {
    return this.medicationService.getDoseLogs(
      req.user.userId,
      medicationId,
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
    );
  }

  @Get('stats/adherence')
  @ApiOperation({ summary: 'Get medication adherence statistics' })
  @ApiQuery({
    name: 'medicationId',
    required: false,
    description: 'Filter by medication ID',
  })
  @ApiQuery({
    name: 'daysBack',
    required: false,
    description: 'Number of days to look back',
  })
  @ApiResponse({ status: 200, description: 'Medication adherence statistics' })
  async getAdherenceStats(
    @Req() req: IAuthenticatedRequest,
    @Query('medicationId') medicationId?: string,
    @Query('daysBack') daysBack?: number,
  ): Promise<any> {
    return this.medicationService.getAdherenceStats(
      req.user.userId,
      medicationId,
      daysBack || 30,
    );
  }
}
