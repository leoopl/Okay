/* eslint-disable @typescript-eslint/no-unused-vars */
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
import { Auth0Guard } from '../../core/auth/guards/auth0.guard';
import { IAuthenticatedRequest } from '../../common/interfaces/auth-request.interface';
import { PoliciesGuard } from '../../core/casl/guards/policies.guard';
import { CheckPolicies } from '../../core/casl/decorators/check-policies.decorator';
import {
  CreateJournalEntryPolicyHandler,
  ReadJournalEntryPolicyHandler,
  UpdateJournalEntryPolicyHandler,
  DeleteJournalEntryPolicyHandler,
} from '../../core/casl/policies/resource.policies';
import { Action } from '../../core/casl/types/ability.type';

@ApiTags('journal')
@Controller('journal')
@ApiBearerAuth('Auth0')
@UseGuards(Auth0Guard)
export class JournalController {
  constructor(private readonly journalService: JournalService) {}

  @ApiOperation({ summary: 'Create a new journal entry' })
  @ApiResponse({
    status: 201,
    description: 'Journal entry created successfully',
  })
  @UseGuards(PoliciesGuard)
  @CheckPolicies(new CreateJournalEntryPolicyHandler())
  @Post()
  async create(
    @Body() createJournalDto: CreateJournalDto,
    @Req() req: IAuthenticatedRequest,
  ) {
    return this.journalService.create(req.user.userId, createJournalDto);
  }

  @ApiOperation({ summary: 'Get all journal entries' })
  @ApiResponse({ status: 200, description: 'List of journal entries' })
  @Get()
  async findAll(@Req() req: IAuthenticatedRequest) {
    const isAdmin = req.user.roles?.includes('admin');
    return this.journalService.findAll(req.user.userId, isAdmin);
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
  @UseGuards(PoliciesGuard)
  @CheckPolicies((ability) => ability.can(Action.Manage, 'all'))
  @Get('user/:userId')
  async findByUserId(@Param('userId') userId: string) {
    return this.journalService.findByUserId(userId);
  }

  @ApiOperation({ summary: 'Get a specific journal entry' })
  @ApiResponse({ status: 200, description: 'Journal entry details' })
  @ApiResponse({ status: 404, description: 'Journal entry not found' })
  @UseGuards(PoliciesGuard)
  @Get(':id')
  async findOne(@Param('id') id: string, @Req() req: IAuthenticatedRequest) {
    const journalEntry = await this.journalService.findOne(
      id,
      req.user.userId,
      true,
    );

    if (!journalEntry) {
      throw new NotFoundException(`Journal entry with ID ${id} not found`);
    }

    // Apply policy check after we have the journal entry
    const policyHandler = new ReadJournalEntryPolicyHandler(journalEntry);
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
  @UseGuards(PoliciesGuard)
  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() updateJournalDto: UpdateJournalDto,
    @Req() req: IAuthenticatedRequest,
  ) {
    const journalEntry = await this.journalService.findOne(
      id,
      req.user.userId,
      true,
    );

    if (!journalEntry) {
      throw new NotFoundException(`Journal entry with ID ${id} not found`);
    }

    // Apply policy check
    const policyHandler = new UpdateJournalEntryPolicyHandler(journalEntry);

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
  @UseGuards(PoliciesGuard)
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string, @Req() req: IAuthenticatedRequest) {
    const journalEntry = await this.journalService.findOne(
      id,
      req.user.userId,
      true,
    );

    if (!journalEntry) {
      throw new NotFoundException(`Journal entry with ID ${id} not found`);
    }

    // Apply policy check
    const policyHandler = new DeleteJournalEntryPolicyHandler(journalEntry);

    const isAdmin = req.user.roles?.includes('admin');
    await this.journalService.remove(id, req.user.userId, isAdmin);
  }
}
