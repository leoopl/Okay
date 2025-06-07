import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
  ValidationPipe,
  UsePipes,
  UseInterceptors,
  ClassSerializerInterceptor,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiQuery,
  ApiParam,
  ApiBadRequestResponse,
  ApiNotFoundResponse,
  ApiForbiddenResponse,
  ApiInternalServerErrorResponse,
} from '@nestjs/swagger';
import { JournalService } from './journal.service';
import { IAuthenticatedRequest } from '../../core/auth/interfaces/auth-request.interface';
import { RequirePermissions } from '../../core/casl/decorators/check-policies.decorator';
import { Action } from '../../core/casl/types/ability.type';
import { JournalEntry } from './entities/journal.entity';
import { JwtAuthGuard } from '../../core/auth/guards/jwt-auth.guard';
import { JournalEntryResponseDto } from './dto/response-journal.dto';
import { CreateJournalDto } from './dto/create-journal.dto';
import { JournalQueryDto } from './dto/query-journal.dto';
import { UpdateJournalDto } from './dto/update-journal.dto';

@ApiTags('journal')
@Controller('journals')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard)
@UseInterceptors(ClassSerializerInterceptor)
@UsePipes(
  new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    validateCustomDecorators: true,
  }),
)
export class JournalController {
  constructor(private readonly journalService: JournalService) {}

  @ApiOperation({
    summary: 'Create a new journal entry',
    description:
      'Creates a new journal entry for the authenticated user. Content is validated and optionally encrypted for sensitive health data.',
  })
  @ApiResponse({
    status: 201,
    description: 'Journal entry created successfully',
    type: JournalEntryResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Invalid request data or TipTap content structure',
  })
  @ApiInternalServerErrorResponse({
    description: 'Failed to create journal entry',
  })
  @RequirePermissions((ability) => ability.can(Action.Create, JournalEntry))
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() createJournalDto: CreateJournalDto,
    @Req() req: IAuthenticatedRequest,
  ): Promise<JournalEntryResponseDto> {
    return this.journalService.create(req.user.userId, createJournalDto);
  }

  @ApiOperation({
    summary: 'Get all journal entries',
    description:
      'Retrieves journal entries for the authenticated user with optional filtering and pagination. Admins can see all entries.',
  })
  @ApiResponse({
    status: 200,
    description: 'List of journal entries',
    type: [JournalEntryResponseDto],
  })
  @ApiQuery({
    name: 'search',
    required: false,
    description: 'Search term for title and content',
    example: 'gratitude',
  })
  @ApiQuery({
    name: 'mood',
    required: false,
    description: 'Filter by mood',
    example: 'happy',
  })
  @ApiQuery({
    name: 'tags',
    required: false,
    description: 'Filter by tags (comma-separated)',
    example: 'reflection,gratitude',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Maximum number of entries to return (1-100)',
    example: 20,
  })
  @ApiQuery({
    name: 'offset',
    required: false,
    description: 'Number of entries to skip for pagination',
    example: 0,
  })
  @ApiInternalServerErrorResponse({
    description: 'Failed to fetch journal entries',
  })
  @RequirePermissions((ability) => ability.can(Action.Read, JournalEntry))
  @Get()
  async findAll(
    @Query() queryDto: JournalQueryDto,
    @Req() req: IAuthenticatedRequest,
  ): Promise<JournalEntryResponseDto[]> {
    const isAdmin = req.user.roles?.includes('admin') || false;
    return this.journalService.findAll(req.user.userId, queryDto, isAdmin);
  }

  @ApiOperation({
    summary: 'Get journal entries for a specific user (Admin only)',
    description:
      'Retrieves all journal entries for a specified user. Requires admin privileges.',
  })
  @ApiParam({
    name: 'userId',
    description: 'User ID to fetch journal entries for',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'List of journal entries for the specified user',
    type: [JournalEntryResponseDto],
  })
  @ApiForbiddenResponse({
    description: 'Forbidden - requires admin privileges',
  })
  @ApiNotFoundResponse({
    description: 'User not found',
  })
  @RequirePermissions((ability) => ability.can(Action.Manage, 'all'))
  @Get('user/:userId')
  async findByUserId(
    @Param('userId', ParseUUIDPipe) userId: string,
  ): Promise<JournalEntryResponseDto[]> {
    return this.journalService.findByUserId(userId);
  }

  @ApiOperation({
    summary: 'Get journal statistics',
    description:
      'Retrieves statistics about journal entries including total count, mood distribution, and last entry date.',
  })
  @ApiResponse({
    status: 200,
    description: 'Journal statistics',
    schema: {
      type: 'object',
      properties: {
        totalEntries: { type: 'number' },
        moodDistribution: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              mood: { type: 'string' },
              count: { type: 'number' },
            },
          },
        },
        lastEntryDate: { type: 'string', format: 'date-time' },
      },
    },
  })
  @RequirePermissions((ability) => ability.can(Action.Read, JournalEntry))
  @Get('statistics')
  async getStatistics(@Req() req: IAuthenticatedRequest): Promise<any> {
    const isAdmin = req.user.roles?.includes('admin') || false;
    return this.journalService.getJournalStatistics(req.user.userId, isAdmin);
  }

  @ApiOperation({
    summary: 'Get a specific journal entry',
    description:
      'Retrieves a specific journal entry by ID. Users can only access their own entries unless they are admins.',
  })
  @ApiParam({
    name: 'id',
    description: 'Journal entry ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'Journal entry details',
    type: JournalEntryResponseDto,
  })
  @ApiNotFoundResponse({
    description: 'Journal entry not found',
  })
  @ApiForbiddenResponse({
    description: 'Access denied - insufficient permissions',
  })
  @ApiInternalServerErrorResponse({
    description: 'Failed to fetch journal entry',
  })
  @RequirePermissions((ability) => ability.can(Action.Read, JournalEntry))
  @Get(':id')
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: IAuthenticatedRequest,
  ): Promise<JournalEntryResponseDto> {
    const isAdmin = req.user.roles?.includes('admin') || false;
    return this.journalService.findOne(id, req.user.userId, isAdmin);
  }

  @ApiOperation({
    summary: 'Update a journal entry',
    description:
      'Updates an existing journal entry. Users can only update their own entries unless they are admins. Content is re-encrypted if encryption is enabled.',
  })
  @ApiParam({
    name: 'id',
    description: 'Journal entry ID to update',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'Journal entry updated successfully',
    type: JournalEntryResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Invalid request data or TipTap content structure',
  })
  @ApiNotFoundResponse({
    description: 'Journal entry not found',
  })
  @ApiForbiddenResponse({
    description: 'Access denied - insufficient permissions',
  })
  @ApiInternalServerErrorResponse({
    description: 'Failed to update journal entry',
  })
  @RequirePermissions((ability) => ability.can(Action.Update, JournalEntry))
  @Patch(':id')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateJournalDto: UpdateJournalDto,
    @Req() req: IAuthenticatedRequest,
  ): Promise<JournalEntryResponseDto> {
    const isAdmin = req.user.roles?.includes('admin') || false;
    return this.journalService.update(
      id,
      req.user.userId,
      updateJournalDto,
      isAdmin,
    );
  }

  @ApiOperation({
    summary: 'Delete a journal entry',
    description:
      'Deletes a journal entry by ID. Users can only delete their own entries unless they are admins. This action is irreversible and will be audited.',
  })
  @ApiParam({
    name: 'id',
    description: 'Journal entry ID to delete',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 204,
    description: 'Journal entry deleted successfully',
  })
  @ApiNotFoundResponse({
    description: 'Journal entry not found',
  })
  @ApiForbiddenResponse({
    description: 'Access denied - insufficient permissions',
  })
  @ApiInternalServerErrorResponse({
    description: 'Failed to delete journal entry',
  })
  @RequirePermissions((ability) => ability.can(Action.Delete, JournalEntry))
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: IAuthenticatedRequest,
  ): Promise<void> {
    const isAdmin = req.user.roles?.includes('admin') || false;
    await this.journalService.remove(id, req.user.userId, isAdmin);
  }

  /**
   * Health check endpoint for monitoring
   * This endpoint can be used by the admin for system health checks
   */
  @ApiOperation({
    summary: 'Journal module health check (Admin only)',
    description:
      'Performs a basic health check on the journal module including database connectivity.',
  })
  @ApiResponse({
    status: 200,
    description: 'Module is healthy',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', example: 'healthy' },
        timestamp: { type: 'string', format: 'date-time' },
        checks: {
          type: 'object',
          properties: {
            database: { type: 'string', example: 'connected' },
            encryption: { type: 'string', example: 'available' },
          },
        },
      },
    },
  })
  @RequirePermissions((ability) => ability.can(Action.Manage, 'all'))
  @Get('admin/health')
  async healthCheck(): Promise<any> {
    try {
      // Test database connectivity
      const testQuery =
        await this.journalService['journalRepository'].query('SELECT 1');

      // Test encryption service if available
      const encryptionStatus = this.journalService['encryptionService']
        ? 'available'
        : 'unavailable';

      return {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        checks: {
          database: testQuery ? 'connected' : 'disconnected',
          encryption: encryptionStatus,
        },
      };
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (error) {
      return {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: 'Health check failed',
      };
    }
  }
}
