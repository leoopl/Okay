import {
  Injectable,
  Logger,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Inventory } from './entities/inventory.entity';
import { InventoryResponse } from './entities/inventory-response.entity';
import { CreateInventoryDto } from './dto/create-inventory.dto';
import { UpdateInventoryDto } from './dto/update-inventory.dto';
import { SubmitInventoryResponseDto } from './dto/submit-inventory-response.dto';
import { AuditService } from '../../core/audit/audit.service';
import { AuditAction } from '../../core/audit/entities/audit-log.entity';

@Injectable()
export class InventoryService {
  private readonly logger = new Logger(InventoryService.name);

  constructor(
    @InjectRepository(Inventory)
    private readonly inventoryRepository: Repository<Inventory>,
    @InjectRepository(InventoryResponse)
    private readonly responseRepository: Repository<InventoryResponse>,
    private readonly auditService: AuditService,
  ) {}

  async create(
    createInventoryDto: CreateInventoryDto,
    actorId: string,
  ): Promise<Inventory> {
    try {
      // Check if inventory with the same name already exists
      const existingInventory = await this.inventoryRepository.findOne({
        where: { name: createInventoryDto.name },
      });

      if (existingInventory) {
        throw new ConflictException(
          `Inventory with name "${createInventoryDto.name}" already exists`,
        );
      }

      const inventory = this.inventoryRepository.create(createInventoryDto);
      const savedInventory = await this.inventoryRepository.save(inventory);

      // Audit inventory creation
      await this.auditService.logAction({
        userId: actorId,
        action: AuditAction.CREATE,
        resource: 'inventory',
        resourceId: savedInventory.id,
        details: { name: savedInventory.name },
      });

      return savedInventory;
    } catch (error) {
      this.logger.error(
        `Error creating inventory: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async findAll(): Promise<Inventory[]> {
    return this.inventoryRepository.find();
  }

  async findOne(id: string): Promise<Inventory> {
    const inventory = await this.inventoryRepository.findOne({
      where: { id },
    });

    if (!inventory) {
      throw new NotFoundException(`Inventory with ID ${id} not found`);
    }

    return inventory;
  }

  async update(
    id: string,
    updateInventoryDto: UpdateInventoryDto,
    actorId: string,
  ): Promise<Inventory> {
    const inventory = await this.findOne(id);

    // Update inventory
    const updatedInventory = this.inventoryRepository.merge(
      inventory,
      updateInventoryDto,
    );
    await this.inventoryRepository.save(updatedInventory);

    // Audit inventory update
    await this.auditService.logAction({
      userId: actorId,
      action: AuditAction.UPDATE,
      resource: 'inventory',
      resourceId: id,
      details: {
        name: updatedInventory.name,
        fields: Object.keys(updateInventoryDto).join(', '),
      },
    });

    return this.findOne(id);
  }

  async remove(id: string, actorId: string): Promise<void> {
    const inventory = await this.findOne(id);

    // Check if there are any responses using this inventory
    const responseCount = await this.responseRepository.count({
      where: { inventoryId: id },
    });

    if (responseCount > 0) {
      throw new ConflictException(
        `Cannot delete inventory: ${responseCount} responses exist. Deleting would lose patient data.`,
      );
    }

    await this.inventoryRepository.remove(inventory);

    // Audit inventory deletion
    await this.auditService.logAction({
      userId: actorId,
      action: AuditAction.DELETE,
      resource: 'inventory',
      resourceId: id,
      details: { name: inventory.name },
    });
  }

  async submitResponse(
    userId: string,
    submitDto: SubmitInventoryResponseDto,
  ): Promise<InventoryResponse> {
    // Find the inventory
    const inventory = await this.findOne(submitDto.inventoryId);

    // Calculate the total score
    let totalScore = 0;
    for (const answer of submitDto.answers) {
      totalScore += answer.value;
    }

    // Get the interpretation based on the score
    let interpretation = '';
    for (const scoreRange of inventory.scoreInterpretations) {
      if (
        totalScore >= scoreRange.minScore &&
        totalScore <= scoreRange.maxScore
      ) {
        interpretation = scoreRange.interpretation;
        break;
      }
    }

    // Create the response
    const response = this.responseRepository.create({
      userId,
      inventoryId: submitDto.inventoryId,
      answers: submitDto.answers,
      totalScore,
      interpretation,
    });

    const savedResponse = await this.responseRepository.save(response);

    // Audit response submission
    await this.auditService.logAction({
      userId,
      action: AuditAction.CREATE,
      resource: 'inventory_response',
      resourceId: savedResponse.id,
      details: {
        inventoryId: submitDto.inventoryId,
        inventoryName: inventory.name,
        score: totalScore,
      },
    });

    return savedResponse;
  }

  async getUserResponses(userId: string): Promise<InventoryResponse[]> {
    return this.responseRepository.find({
      where: { userId },
      relations: ['inventory'],
      order: { completedAt: 'DESC' },
    });
  }

  async getResponseById(
    id: string,
    userId: string,
    isAdmin: boolean,
  ): Promise<InventoryResponse> {
    const response = await this.responseRepository.findOne({
      where: { id },
      relations: ['inventory'],
    });

    if (!response) {
      throw new NotFoundException(`Response with ID ${id} not found`);
    }

    // If not admin, ensure user can only access their own responses
    if (!isAdmin && response.userId !== userId) {
      throw new NotFoundException(`Response with ID ${id} not found`);
    }

    // Audit response access
    await this.auditService.logAction({
      userId,
      action: AuditAction.READ,
      resource: 'inventory_response',
      resourceId: id,
    });

    return response;
  }

  async getAllResponses(isAdmin: boolean): Promise<InventoryResponse[]> {
    if (!isAdmin) {
      throw new Error('Only administrators can access all responses');
    }

    return this.responseRepository.find({
      relations: ['inventory', 'user'],
      order: { completedAt: 'DESC' },
    });
  }
}
