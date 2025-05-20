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
  BadRequestException,
  UnauthorizedException,
  UseInterceptors,
  ClassSerializerInterceptor,
  UploadedFile,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { InventoryService } from './inventory.service';
import { CreateInventoryDto } from './dto/create-inventory.dto';
import { UpdateInventoryDto } from './dto/update-inventory.dto';
import { SubmitInventoryResponseDto } from './dto/submit-inventory-response.dto';
import { GetInventoryResponseDto } from './dto/get-inventory-response.dto';
import { IAuthenticatedRequest } from '../../common/interfaces/auth-request.interface';
import { RequirePermissions } from '../../core/casl/decorators/check-policies.decorator';
import { Action } from '../../core/casl/types/ability.type';
import { UseResource } from '../../core/casl/decorators/resource.decorator';
import { JwtAuthGuard } from 'src/core/auth/guards/jwt-auth.guard';
import { Inventory } from './entities/inventory.entity';
import { InventoryResponse } from './entities/inventory-response.entity';

@ApiTags('inventories')
@Controller('inventories')
@UseInterceptors(ClassSerializerInterceptor) // For DTO transformations
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard)
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
  @RequirePermissions((ability) => ability.can(Action.Create, Inventory))
  @Post()
  async create(
    @Body() createInventoryDto: CreateInventoryDto,
    @Req() req: IAuthenticatedRequest,
  ): Promise<Inventory> {
    return this.inventoryService.create(createInventoryDto, req.user.userId);
  }

  @ApiOperation({
    summary: 'Import inventory from JSON file',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Inventory imported successfully' })
  @ApiResponse({ status: 400, description: 'Invalid file format' })
  @RequirePermissions((ability) => ability.can(Action.Create, Inventory))
  @Post('import')
  @UseInterceptors(FileInterceptor('file'))
  async importInventory(
    @UploadedFile() file: Express.Multer.File,
    @Req() req: IAuthenticatedRequest,
  ): Promise<Inventory> {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    try {
      // Parse the JSON file
      const jsonData = JSON.parse(file.buffer.toString());
      return this.inventoryService.importFromJson(jsonData, req.user.userId);
    } catch (error) {
      if (error instanceof SyntaxError) {
        throw new BadRequestException('Invalid JSON file');
      }
      throw error;
    }
  }

  @ApiOperation({ summary: 'Get all psychological inventories' })
  @ApiResponse({ status: 200, description: 'List of all inventories' })
  @RequirePermissions((ability) => ability.can(Action.Read, Inventory))
  @Get()
  async findAll(): Promise<Inventory[]> {
    return this.inventoryService.findAll();
  }

  @ApiOperation({ summary: 'Get a specific psychological inventory' })
  @ApiResponse({ status: 200, description: 'Inventory details' })
  @ApiResponse({ status: 404, description: 'Inventory not found' })
  @RequirePermissions((ability) => ability.can(Action.Read, Inventory))
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
  @UseResource(async (request) => {
    return await request.inventoryService?.findOne(request.params.id);
  })
  @RequirePermissions((ability) => ability.can(Action.Update, Inventory))
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
  @UseResource(async (request) => {
    return await request.inventoryService?.findOne(request.params.id);
  })
  @RequirePermissions((ability) => ability.can(Action.Delete, Inventory))
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @Param('id') id: string,
    @Req() req: IAuthenticatedRequest,
  ): Promise<void> {
    await this.inventoryService.remove(id, req.user.userId);
  }

  // Assessment response endpoints
  @ApiOperation({ summary: 'Submit a response to an inventory' })
  @ApiResponse({ status: 201, description: 'Response submitted successfully' })
  @ApiResponse({
    status: 400,
    description: 'Bad request - invalid data or missing consent',
  })
  @RequirePermissions((ability) =>
    ability.can(Action.Create, InventoryResponse),
  )
  @Post('responses')
  async submitResponse(
    @Body() submitDto: SubmitInventoryResponseDto,
    @Req() req: IAuthenticatedRequest,
  ): Promise<InventoryResponse> {
    // Additional LGPD consent check (belt and suspenders)
    if (!submitDto.consentGiven) {
      throw new BadRequestException(
        'Explicit consent is required to process this assessment response',
      );
    }

    return this.inventoryService.submitResponse(
      req.user.userId,
      submitDto,
      req, // Pass request to capture IP for consent logging
    );
  }

  @ApiOperation({ summary: 'Get all responses for the current user' })
  @ApiResponse({ status: 200, description: 'List of user responses' })
  @RequirePermissions((ability) => ability.can(Action.Read, InventoryResponse))
  @Get('responses/me')
  async getUserResponses(
    @Req() req: IAuthenticatedRequest,
  ): Promise<GetInventoryResponseDto[]> {
    const responses = await this.inventoryService.getUserResponses(
      req.user.userId,
    );

    // Transform to DTOs
    return responses.map(
      (response) =>
        new GetInventoryResponseDto({
          id: response.id,
          inventoryId: response.inventoryId,
          inventoryTitle: response.inventory?.title || 'Unknown Assessment',
          responses: response.responses,
          calculatedScores: response.calculatedScores,
          interpretationResults: response.interpretationResults,
          completedAt: response.completedAt,
        }),
    );
  }

  @ApiOperation({ summary: 'Get a specific inventory response' })
  @ApiResponse({ status: 200, description: 'Response details' })
  @ApiResponse({ status: 404, description: 'Response not found' })
  @UseResource(async (request) => {
    const isAdmin = request.user.roles?.includes('admin');
    return await request.inventoryService?.getResponseById(
      request.params.id,
      request.user.userId,
      isAdmin,
    );
  })
  @RequirePermissions((ability) => ability.can(Action.Read, InventoryResponse))
  @Get('responses/:id')
  async getResponseById(
    @Param('id') id: string,
    @Req() req: IAuthenticatedRequest,
  ): Promise<GetInventoryResponseDto> {
    const isAdmin = req.user.roles?.includes('admin');
    const response = await this.inventoryService.getResponseById(
      id,
      req.user.userId,
      isAdmin,
    );

    if (!response) {
      throw new NotFoundException(`Response with ID ${id} not found`);
    }

    // Transform to DTO
    return new GetInventoryResponseDto({
      id: response.id,
      inventoryId: response.inventoryId,
      inventoryTitle: response.inventory?.title || 'Unknown Assessment',
      responses: response.responses,
      calculatedScores: response.calculatedScores,
      interpretationResults: response.interpretationResults,
      completedAt: response.completedAt,
    });
  }

  @ApiOperation({ summary: 'Get all inventory responses (Admin only)' })
  @ApiResponse({ status: 200, description: 'List of all responses' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - insufficient permissions',
  })
  @RequirePermissions((ability) => ability.can(Action.Manage, 'all'))
  @Get('responses')
  async getAllResponses(
    @Req() req: IAuthenticatedRequest,
  ): Promise<GetInventoryResponseDto[]> {
    const isAdmin = req.user.roles?.includes('admin');

    if (!isAdmin) {
      throw new UnauthorizedException(
        'Only administrators can access all responses',
      );
    }

    const responses = await this.inventoryService.getAllResponses(isAdmin);

    // Transform to DTOs
    return responses.map(
      (response) =>
        new GetInventoryResponseDto({
          id: response.id,
          inventoryId: response.inventoryId,
          inventoryTitle: response.inventory?.title || 'Unknown Assessment',
          responses: response.responses,
          calculatedScores: response.calculatedScores,
          interpretationResults: response.interpretationResults,
          completedAt: response.completedAt,
        }),
    );
  }

  @ApiOperation({
    summary: 'Withdraw consent for a specific response (LGPD right)',
  })
  @ApiResponse({ status: 204, description: 'Consent withdrawn successfully' })
  @ApiResponse({ status: 404, description: 'Response not found' })
  @RequirePermissions((ability) =>
    ability.can(Action.Update, InventoryResponse),
  )
  @Delete('responses/:id/consent')
  @HttpCode(HttpStatus.NO_CONTENT)
  async withdrawConsent(
    @Param('id') id: string,
    @Req() req: IAuthenticatedRequest,
  ): Promise<void> {
    await this.inventoryService.withdrawConsent(id, req.user.userId);
  }

  @ApiOperation({
    summary: 'Anonymize all user data (LGPD right to be forgotten)',
  })
  @ApiResponse({
    status: 204,
    description: 'User data anonymized successfully',
  })
  @Delete('responses/anonymize')
  @HttpCode(HttpStatus.NO_CONTENT)
  async anonymizeUserData(@Req() req: IAuthenticatedRequest): Promise<void> {
    await this.inventoryService.anonymizeUserData(req.user.userId);
  }
}
