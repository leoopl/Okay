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
import { InventoryService } from './inventory.service';
import { CreateInventoryDto } from './dto/create-inventory.dto';
import { UpdateInventoryDto } from './dto/update-inventory.dto';
import { SubmitInventoryResponseDto } from './dto/submit-inventory-response.dto';
import { Inventory } from './entities/inventory.entity';
import { InventoryResponse } from './entities/inventory-response.entity';
import { Auth0Guard } from '../../core/auth/guards/auth0.guard';
import { RolesGuard } from '../../core/auth/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { IAuthenticatedRequest } from '../../common/interfaces/auth-request.interface';

@ApiTags('inventories')
@Controller('inventories')
@ApiBearerAuth('Auth0')
@UseGuards(Auth0Guard)
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  // Inventory management endpoints (admin only)
  @ApiOperation({
    summary: 'Create a new psychological inventory (Admin only)',
  })
  @ApiResponse({ status: 201, description: 'Inventory created successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - requires admin role' })
  @UseGuards(RolesGuard)
  @Roles('admin')
  @Post()
  async create(
    @Body() createInventoryDto: CreateInventoryDto,
    @Req() req: IAuthenticatedRequest,
  ): Promise<Inventory> {
    return this.inventoryService.create(createInventoryDto, req.user.userId);
  }

  @ApiOperation({ summary: 'Get all psychological inventories' })
  @ApiResponse({ status: 200, description: 'List of all inventories' })
  @Get()
  async findAll(): Promise<Inventory[]> {
    return this.inventoryService.findAll();
  }

  @ApiOperation({ summary: 'Get a specific psychological inventory' })
  @ApiResponse({ status: 200, description: 'Inventory details' })
  @ApiResponse({ status: 404, description: 'Inventory not found' })
  @Get(':id')
  async findOne(@Param('id') id: string): Promise<Inventory> {
    return this.inventoryService.findOne(id);
  }

  @ApiOperation({ summary: 'Update a psychological inventory (Admin only)' })
  @ApiResponse({ status: 200, description: 'Inventory updated successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - requires admin role' })
  @ApiResponse({ status: 404, description: 'Inventory not found' })
  @UseGuards(RolesGuard)
  @Roles('admin')
  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() updateInventoryDto: UpdateInventoryDto,
    @Req() req: IAuthenticatedRequest,
  ): Promise<Inventory> {
    return this.inventoryService.update(
      id,
      updateInventoryDto,
      req.user.userId,
    );
  }

  @ApiOperation({ summary: 'Delete a psychological inventory (Admin only)' })
  @ApiResponse({ status: 204, description: 'Inventory deleted successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - requires admin role' })
  @ApiResponse({ status: 404, description: 'Inventory not found' })
  @ApiResponse({
    status: 409,
    description: 'Conflict - cannot delete inventory with responses',
  })
  @UseGuards(RolesGuard)
  @Roles('admin')
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @Param('id') id: string,
    @Req() req: IAuthenticatedRequest,
  ): Promise<void> {
    await this.inventoryService.remove(id, req.user.userId);
  }

  // Inventory response endpoints
  @ApiOperation({ summary: 'Submit a response to an inventory' })
  @ApiResponse({ status: 201, description: 'Response submitted successfully' })
  @ApiResponse({ status: 404, description: 'Inventory not found' })
  @Post('responses')
  async submitResponse(
    @Body() submitDto: SubmitInventoryResponseDto,
    @Req() req: IAuthenticatedRequest,
  ): Promise<InventoryResponse> {
    return this.inventoryService.submitResponse(req.user.userId, submitDto);
  }

  @ApiOperation({ summary: 'Get all responses for the current user' })
  @ApiResponse({ status: 200, description: 'List of user responses' })
  @Get('responses/me')
  async getUserResponses(
    @Req() req: IAuthenticatedRequest,
  ): Promise<InventoryResponse[]> {
    return this.inventoryService.getUserResponses(req.user.userId);
  }

  @ApiOperation({ summary: 'Get a specific inventory response' })
  @ApiResponse({ status: 200, description: 'Response details' })
  @ApiResponse({ status: 404, description: 'Response not found' })
  @Get('responses/:id')
  async getResponseById(
    @Param('id') id: string,
    @Req() req: IAuthenticatedRequest,
  ): Promise<InventoryResponse> {
    const isAdmin = req.user.roles?.includes('admin');
    return this.inventoryService.getResponseById(id, req.user.userId, isAdmin);
  }

  @ApiOperation({ summary: 'Get all inventory responses (Admin only)' })
  @ApiResponse({ status: 200, description: 'List of all responses' })
  @ApiResponse({ status: 403, description: 'Forbidden - requires admin role' })
  @UseGuards(RolesGuard)
  @Roles('admin')
  @Get('responses')
  async getAllResponses(
    @Req() req: IAuthenticatedRequest,
  ): Promise<InventoryResponse[]> {
    const isAdmin = req.user.roles?.includes('admin');
    return this.inventoryService.getAllResponses(isAdmin);
  }
}
