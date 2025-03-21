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
import { InventoryService } from './inventory.service';
import { CreateInventoryDto } from './dto/create-inventory.dto';
import { UpdateInventoryDto } from './dto/update-inventory.dto';
import { SubmitInventoryResponseDto } from './dto/submit-inventory-response.dto';
import { Inventory } from './entities/inventory.entity';
import { InventoryResponse } from './entities/inventory-response.entity';
import { Auth0Guard } from '../../core/auth/guards/auth0.guard';
import { IAuthenticatedRequest } from '../../common/interfaces/auth-request.interface';
import { PoliciesGuard } from '../../core/casl/guards/policies.guard';
import { CheckPolicies } from '../../core/casl/decorators/check-policies.decorator';
import {
  ManageInventoryPolicyHandler,
  ReadInventoryPolicyHandler,
  CreateInventoryResponsePolicyHandler,
  ReadInventoryResponsePolicyHandler,
} from '../../core/casl/policies/resource.policies';
import { Action } from '../../core/casl/types/ability.type';

@ApiTags('inventories')
@Controller('inventories')
@ApiBearerAuth('Auth0')
@UseGuards(Auth0Guard)
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  // Inventory management endpoints
  @ApiOperation({
    summary: 'Create a new psychological inventory',
  })
  @ApiResponse({ status: 201, description: 'Inventory created successfully' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - insufficient permissions',
  })
  @UseGuards(PoliciesGuard)
  @CheckPolicies((ability) => ability.can(Action.Manage, Inventory))
  @Post()
  async create(
    @Body() createInventoryDto: CreateInventoryDto,
    @Req() req: IAuthenticatedRequest,
  ): Promise<Inventory> {
    return this.inventoryService.create(createInventoryDto, req.user.userId);
  }

  @ApiOperation({ summary: 'Get all psychological inventories' })
  @ApiResponse({ status: 200, description: 'List of all inventories' })
  @UseGuards(PoliciesGuard)
  @CheckPolicies(new ReadInventoryPolicyHandler())
  @Get()
  async findAll(): Promise<Inventory[]> {
    return this.inventoryService.findAll();
  }

  @ApiOperation({ summary: 'Get a specific psychological inventory' })
  @ApiResponse({ status: 200, description: 'Inventory details' })
  @ApiResponse({ status: 404, description: 'Inventory not found' })
  @UseGuards(PoliciesGuard)
  @CheckPolicies(new ReadInventoryPolicyHandler())
  @Get(':id')
  async findOne(@Param('id') id: string): Promise<Inventory> {
    return this.inventoryService.findOne(id);
  }

  @ApiOperation({ summary: 'Update a psychological inventory' })
  @ApiResponse({ status: 200, description: 'Inventory updated successfully' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - insufficient permissions',
  })
  @ApiResponse({ status: 404, description: 'Inventory not found' })
  @UseGuards(PoliciesGuard)
  @CheckPolicies(new ManageInventoryPolicyHandler())
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

  @ApiOperation({ summary: 'Delete a psychological inventory' })
  @ApiResponse({ status: 204, description: 'Inventory deleted successfully' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - insufficient permissions',
  })
  @ApiResponse({ status: 404, description: 'Inventory not found' })
  @ApiResponse({
    status: 409,
    description: 'Conflict - cannot delete inventory with responses',
  })
  @UseGuards(PoliciesGuard)
  @CheckPolicies(new ManageInventoryPolicyHandler())
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
  @UseGuards(PoliciesGuard)
  @CheckPolicies(new CreateInventoryResponsePolicyHandler())
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
  @UseGuards(PoliciesGuard)
  @Get('responses/:id')
  async getResponseById(
    @Param('id') id: string,
    @Req() req: IAuthenticatedRequest,
  ): Promise<InventoryResponse> {
    const isAdmin = req.user.roles?.includes('admin');
    const response = await this.inventoryService.getResponseById(
      id,
      req.user.userId,
      isAdmin,
    );

    if (!response) {
      throw new NotFoundException(`Response with ID ${id} not found`);
    }

    // Apply policy check
    const policyHandler = new ReadInventoryResponsePolicyHandler(response);

    return response;
  }

  @ApiOperation({ summary: 'Get all inventory responses' })
  @ApiResponse({ status: 200, description: 'List of all responses' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - insufficient permissions',
  })
  @UseGuards(PoliciesGuard)
  @CheckPolicies((ability) => ability.can(Action.Manage, 'all'))
  @Get('responses')
  async getAllResponses(
    @Req() req: IAuthenticatedRequest,
  ): Promise<InventoryResponse[]> {
    const isAdmin = req.user.roles?.includes('admin');
    return this.inventoryService.getAllResponses(isAdmin);
  }
}
