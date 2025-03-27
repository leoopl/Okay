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
  HttpCode,
  HttpStatus,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JournalService } from './journal.service';
import { CreateJournalDto } from './dto/create-journal.dto';
import { UpdateJournalDto } from './dto/update-journal.dto';
import { IAuthenticatedRequest } from '../../common/interfaces/auth-request.interface';
import { RequirePermissions } from '../../core/casl/decorators/check-policies.decorator';
import { Action } from '../../core/casl/types/ability.type';
import { JournalEntry } from './entities/journal.entity';
import { UseResource } from '../../core/casl/decorators/resource.decorator';
import { JwtAuthGuard } from 'src/core/auth/guards/jwt-auth.guard';

@ApiTags('journal')
@Controller('journal')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard)
export class JournalController {
  constructor(private readonly journalService: JournalService) {}

  @ApiOperation({ summary: 'Create a new journal entry' })
  @ApiResponse({
    status: 201,
    description: 'Journal entry created successfully',
  })
  @RequirePermissions((ability) => ability.can(Action.Create, JournalEntry))
  @Post()
  async create(
    @Body() createJournalDto: CreateJournalDto,
    @Req() req: IAuthenticatedRequest,
  ) {
    return this.journalService.create(req.user.userId, createJournalDto);
  }

  @ApiOperation({ summary: 'Get all journal entries' })
  @ApiResponse({ status: 200, description: 'List of journal entries' })
  @RequirePermissions((ability) => ability.can(Action.Read, JournalEntry))
  @Get()
  async findAll(@Req() req: IAuthenticatedRequest) {
    const isAdmin = req.user.roles?.includes('admin');

    if (isAdmin) {
      // Admins can see all journal entries
      return this.journalService.findAll(req.user.userId, true);
    } else {
      // Regular users can only see their own entries
      return this.journalService.findAll(req.user.userId, false);
    }
  }

  @ApiOperation({
    summary: 'Get journal entries for a specific user',
  })
  @ApiResponse({
    status: 200,
    description: 'List of journal entries for the user',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - insufficient permissions',
  })
  @RequirePermissions((ability) => ability.can(Action.Manage, 'all'))
  @Get('user/:userId')
  async findByUserId(@Param('userId') userId: string) {
    return this.journalService.findByUserId(userId);
  }

  @ApiOperation({ summary: 'Get a specific journal entry' })
  @ApiResponse({ status: 200, description: 'Journal entry details' })
  @ApiResponse({ status: 404, description: 'Journal entry not found' })
  @UseResource(async (request) => {
    // Load the journal entry resource to check permissions against
    const journalEntry = await request.journalService?.findOne(
      request.params.id,
      request.user.userId,
      request.user.roles?.includes('admin'),
    );

    if (!journalEntry) {
      throw new NotFoundException(
        `Journal entry with ID ${request.params.id} not found`,
      );
    }

    return journalEntry;
  })
  @RequirePermissions((ability) => ability.can(Action.Read, JournalEntry))
  @Get(':id')
  async findOne(@Param('id') id: string, @Req() req: IAuthenticatedRequest) {
    const isAdmin = req.user.roles?.includes('admin');

    const journalEntry = await this.journalService.findOne(
      id,
      req.user.userId,
      isAdmin,
    );

    if (!journalEntry) {
      throw new NotFoundException(`Journal entry with ID ${id} not found`);
    }

    return journalEntry;
  }

  @ApiOperation({ summary: 'Update a journal entry' })
  @ApiResponse({
    status: 200,
    description: 'Journal entry updated successfully',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - insufficient permissions',
  })
  @ApiResponse({ status: 404, description: 'Journal entry not found' })
  @UseResource(async (request) => {
    // Load the journal entry resource to check permissions against
    const journalEntry = await request.journalService?.findOne(
      request.params.id,
      request.user.userId,
      request.user.roles?.includes('admin'),
    );

    if (!journalEntry) {
      throw new NotFoundException(
        `Journal entry with ID ${request.params.id} not found`,
      );
    }

    return journalEntry;
  })
  @RequirePermissions((ability) => ability.can(Action.Update, JournalEntry))
  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() updateJournalDto: UpdateJournalDto,
    @Req() req: IAuthenticatedRequest,
  ) {
    const journalEntry = await this.journalService.findOne(
      id,
      req.user.userId,
      req.user.roles?.includes('admin'),
    );

    if (!journalEntry) {
      throw new NotFoundException(`Journal entry with ID ${id} not found`);
    }

    // Only allow users to update their own journal entries (unless admin)
    if (
      journalEntry.userId !== req.user.userId &&
      !req.user.roles?.includes('admin')
    ) {
      throw new ForbiddenException(
        'You can only update your own journal entries',
      );
    }

    const isAdmin = req.user.roles?.includes('admin');
    return this.journalService.update(
      id,
      req.user.userId,
      updateJournalDto,
      isAdmin,
    );
  }

  @ApiOperation({ summary: 'Delete a journal entry' })
  @ApiResponse({
    status: 204,
    description: 'Journal entry deleted successfully',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - insufficient permissions',
  })
  @ApiResponse({ status: 404, description: 'Journal entry not found' })
  @UseResource(async (request) => {
    // Load the journal entry resource to check permissions against
    const journalEntry = await request.journalService?.findOne(
      request.params.id,
      request.user.userId,
      request.user.roles?.includes('admin'),
    );

    if (!journalEntry) {
      throw new NotFoundException(
        `Journal entry with ID ${request.params.id} not found`,
      );
    }

    return journalEntry;
  })
  @RequirePermissions((ability) => ability.can(Action.Delete, JournalEntry))
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string, @Req() req: IAuthenticatedRequest) {
    const journalEntry = await this.journalService.findOne(
      id,
      req.user.userId,
      req.user.roles?.includes('admin'),
    );

    if (!journalEntry) {
      throw new NotFoundException(`Journal entry with ID ${id} not found`);
    }

    // Only allow users to delete their own journal entries (unless admin)
    if (
      journalEntry.userId !== req.user.userId &&
      !req.user.roles?.includes('admin')
    ) {
      throw new ForbiddenException(
        'You can only delete your own journal entries',
      );
    }

    const isAdmin = req.user.roles?.includes('admin');
    await this.journalService.remove(id, req.user.userId, isAdmin);
  }
}
