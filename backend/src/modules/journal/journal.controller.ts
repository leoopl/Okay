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
import { Auth0Guard } from '../auth/guards/auth0.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { IAuthenticatedRequest } from '../../common/interfaces/auth-request.interface';

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
    summary: 'Get journal entries for a specific user (Admin only)',
  })
  @ApiResponse({
    status: 200,
    description: 'List of journal entries for the user',
  })
  @ApiResponse({ status: 403, description: 'Forbidden - requires admin role' })
  @UseGuards(RolesGuard)
  @Roles('admin')
  @Get('user/:userId')
  async findByUserId(@Param('userId') userId: string) {
    return this.journalService.findByUserId(userId);
  }

  @ApiOperation({ summary: 'Get a specific journal entry' })
  @ApiResponse({ status: 200, description: 'Journal entry details' })
  @ApiResponse({ status: 404, description: 'Journal entry not found' })
  @Get(':id')
  async findOne(@Param('id') id: string, @Req() req: IAuthenticatedRequest) {
    const isAdmin = req.user.roles?.includes('admin');
    return this.journalService.findOne(id, req.user.userId, isAdmin);
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
  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() updateJournalDto: UpdateJournalDto,
    @Req() req: IAuthenticatedRequest,
  ) {
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
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string, @Req() req: IAuthenticatedRequest) {
    const isAdmin = req.user.roles?.includes('admin');
    await this.journalService.remove(id, req.user.userId, isAdmin);
  }
}
