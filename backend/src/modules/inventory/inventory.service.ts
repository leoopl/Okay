import {
  Injectable,
  Logger,
  NotFoundException,
  ConflictException,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Request } from 'express';

import { Inventory } from './entities/inventory.entity';
import { InventoryResponse } from './entities/inventory-response.entity';
import { CreateInventoryDto } from './dto/create-inventory.dto';
import { UpdateInventoryDto } from './dto/update-inventory.dto';
import { SubmitInventoryResponseDto } from './dto/submit-inventory-response.dto';
import { AuditService } from '../../core/audit/audit.service';
import { AuditAction } from '../../core/audit/entities/audit-log.entity';
import {
  Question,
  UserResponseOption,
  InterpretationResult,
  CalculatedScores,
} from './interfaces/inventory.interface';

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

  // Method to submit inventory responses with validation
  async submitResponse(
    userId: string,
    submitDto: SubmitInventoryResponseDto,
    req?: Request,
  ): Promise<InventoryResponse> {
    // LGPD Compliance: Check consent - reject if not given
    if (!submitDto.consentGiven) {
      throw new BadRequestException(
        'Explicit consent must be given to process this assessment response',
      );
    }

    // Find the inventory
    const inventory = await this.findOne(submitDto.inventoryId);

    // Input Validation: Validate completeness and options
    this.validateResponseCompleteness(inventory.questions, submitDto.responses);
    this.validateResponseOptions(inventory.questions, submitDto.responses);

    // Enrich response data with question titles and option labels for better readability
    this.enrichResponseData(inventory.questions, submitDto.responses);

    // Scoring Logic: Calculate scores based on inventory type
    const calculatedScores = this.calculateScores(
      inventory,
      submitDto.responses,
    );

    // 💬 Interpretation Logic: Generate interpretation based on scores
    const interpretationResults = this.generateInterpretation(
      inventory,
      calculatedScores,
    );

    // Create the response entity
    const response = this.responseRepository.create({
      userId,
      inventoryId: submitDto.inventoryId,
      responses: submitDto.responses,
      calculatedScores,
      interpretationResults,
      consentGiven: submitDto.consentGiven,
      ipAddress: req?.ip, // Store IP for consent audit trail
    });

    const savedResponse = await this.responseRepository.save(response);

    // 🗃️ Audit and Logging: Record the submission
    await this.auditService.logAction({
      userId,
      action: AuditAction.CREATE,
      resource: 'inventory_response',
      resourceId: savedResponse.id,
      details: {
        inventoryId: submitDto.inventoryId,
        inventoryName: inventory.name,
        scores: calculatedScores,
        consentGiven: submitDto.consentGiven,
      },
    });

    return savedResponse;
  }

  // Validation methods
  private validateResponseCompleteness(
    questions: Question[],
    responses: UserResponseOption[],
  ): void {
    // Create a set of question IDs from the inventory
    const questionIds = new Set(questions.map((q) => q.id));

    // Create a set of question IDs from the responses
    const responseQuestionIds = new Set(responses.map((r) => r.questionId));

    // Check if all required questions have been answered
    if (questionIds.size !== responseQuestionIds.size) {
      // Find which questions are missing
      const missingQuestions = [...questionIds].filter(
        (id) => !responseQuestionIds.has(id),
      );

      throw new BadRequestException(
        `Incomplete assessment: missing responses for questions: ${missingQuestions.join(', ')}`,
      );
    }
  }

  private validateResponseOptions(
    questions: Question[],
    responses: UserResponseOption[],
  ): void {
    // Create a map of question ID to valid option values
    const validOptionsByQuestion = new Map<string, Set<number>>();

    for (const question of questions) {
      validOptionsByQuestion.set(
        question.id,
        new Set(question.options.map((opt) => opt.value)),
      );
    }

    // Check if all responses have valid option values
    for (const response of responses) {
      const validOptions = validOptionsByQuestion.get(response.questionId);

      if (!validOptions) {
        throw new BadRequestException(
          `Response contains an answer to question ${response.questionId} which is not in the assessment`,
        );
      }

      if (!validOptions.has(response.optionValue)) {
        throw new BadRequestException(
          `Invalid option value ${response.optionValue} for question ${response.questionId}`,
        );
      }
    }
  }

  // Enrich responses with question titles and option labels
  private enrichResponseData(
    questions: Question[],
    responses: UserResponseOption[],
  ): void {
    // Create maps for quick lookup
    const questionMap = new Map<string, Question>();
    for (const question of questions) {
      questionMap.set(question.id, question);
    }

    // Add titles and option labels to responses
    for (const response of responses) {
      const question = questionMap.get(response.questionId);
      if (question) {
        response.questionTitle = question.title;

        // Find the matching option to get its label
        const option = question.options.find(
          (opt) => opt.value === response.optionValue,
        );
        if (option) {
          response.optionLabel = option.label;
        }
      }
    }
  }

  // Scoring methods
  private calculateScores(
    inventory: Inventory,
    responses: UserResponseOption[],
  ): CalculatedScores {
    // Create a response map for easy access
    const responseMap = new Map<string, number>();
    for (const response of responses) {
      responseMap.set(response.questionId, response.optionValue);
    }

    // For assessments with subscales (like DASS-21)
    const subscaleScores: { [key: string]: number } = {};
    let totalScore = 0;

    // Process each question based on inventory type
    for (const question of inventory.questions) {
      const response = responseMap.get(question.id);
      if (response === undefined) continue;

      let questionScore: number;

      // Handle reverse scoring if needed (like in PSS-10)
      if (question.reverseScore) {
        // Find the max value for this question to calculate reverse score
        const maxValue = Math.max(...question.options.map((opt) => opt.value));
        questionScore = maxValue - response;
      } else {
        questionScore = response;
      }

      // Add to total score
      totalScore += questionScore;

      // If there are subscales, add to the appropriate subscale
      if (question.subscale) {
        subscaleScores[question.subscale] =
          (subscaleScores[question.subscale] || 0) + questionScore;
      }
    }

    // Create result object
    const result: CalculatedScores = { total: totalScore };

    // Add subscale scores if present
    if (Object.keys(subscaleScores).length > 0) {
      Object.assign(result, subscaleScores);
    }

    return result;
  }

  private generateInterpretation(
    inventory: Inventory,
    scores: CalculatedScores,
  ): InterpretationResult {
    const { scoring } = inventory;
    const result: InterpretationResult = {
      label: '',
      recommendation: '',
      subscaleInterpretations: {},
    };

    // Handle overall interpretation if present
    if (scoring.interpretation) {
      for (const range of scoring.interpretation) {
        if (
          scores.total !== undefined &&
          scores.total >= range.min &&
          scores.total <= range.max
        ) {
          result.label = range.label;
          result.recommendation = range.recommendation;
          break;
        }
      }
    }

    // Handle subscale interpretations if present
    if (scoring.subscales) {
      result.subscaleInterpretations = {};

      for (const [subscaleName, subscaleScore] of Object.entries(scores)) {
        // Skip the total score
        if (subscaleName === 'total') continue;

        // Skip if no matching subscale in scoring
        if (!scoring.subscales[subscaleName]) continue;

        // Find the matching range for this subscale score
        const subscaleRanges = scoring.subscales[subscaleName].interpretation;
        for (const range of subscaleRanges) {
          if (
            subscaleScore !== undefined &&
            subscaleScore >= range.min &&
            subscaleScore <= range.max
          ) {
            result.subscaleInterpretations[subscaleName] = {
              label: range.label,
              recommendation: range.recommendation,
            };
            break;
          }
        }
      }
    }

    return result;
  }

  // Get a specific inventory response
  async getResponseById(
    id: string,
    userId: string,
    isAdmin: boolean,
  ): Promise<InventoryResponse | null> {
    const response = await this.responseRepository.findOne({
      where: { id },
      relations: ['inventory'],
    });

    if (!response) {
      return null;
    }

    // Data isolation: Ensure user can only access their own responses
    if (!isAdmin && response.userId !== userId) {
      // Return null rather than throwing exception to avoid leaking information
      return null;
    }

    // LGPD Compliance: Check consent status
    if (!response.consentGiven) {
      // For admins, show that consent was withdrawn but still return basic data
      if (isAdmin) {
        // Mark the response as consent withdrawn in interpretation
        if (!response.interpretationResults) {
          response.interpretationResults = {
            label: 'CONSENT_WITHDRAWN',
            recommendation:
              'User has withdrawn consent for this assessment data',
          };
        } else {
          response.interpretationResults.label =
            'CONSENT_WITHDRAWN - ' + response.interpretationResults.label;
        }
        return response;
      }

      // For regular users, completely hide withdrawn consent data
      return null;
    }

    // Audit access to response data
    await this.auditService.logAction({
      userId,
      action: AuditAction.READ,
      resource: 'inventory_response',
      resourceId: id,
      details: { isAdmin },
    });

    return response;
  }

  // Get user's responses - added LGPD compliance check
  async getUserResponses(userId: string): Promise<InventoryResponse[]> {
    return this.responseRepository.find({
      where: {
        userId,
        consentGiven: true, // Only return responses where consent was given
      },
      relations: ['inventory'],
      order: { completedAt: 'DESC' },
    });
  }

  // Get all responses - admin only - with LGPD compliance indicators
  async getAllResponses(isAdmin: boolean): Promise<InventoryResponse[]> {
    if (!isAdmin) {
      throw new UnauthorizedException(
        'Only administrators can access all responses',
      );
    }

    const responses = await this.responseRepository.find({
      relations: ['inventory', 'user'],
      order: { completedAt: 'DESC' },
    });

    // Mark responses where consent was withdrawn for admin review
    for (const response of responses) {
      if (!response.consentGiven) {
        if (!response.interpretationResults) {
          response.interpretationResults = {
            label: 'CONSENT_WITHDRAWN',
            recommendation:
              'User has withdrawn consent for this assessment data',
          };
        } else {
          response.interpretationResults.label =
            'CONSENT_WITHDRAWN - ' + response.interpretationResults.label;
        }
      }
    }

    return responses;
  }

  // Method to withdraw consent (LGPD requirement)
  async withdrawConsent(responseId: string, userId: string): Promise<void> {
    const response = await this.responseRepository.findOne({
      where: { id: responseId },
    });

    if (!response) {
      throw new NotFoundException(`Response with ID ${responseId} not found`);
    }

    // Ensure user can only modify their own responses
    if (response.userId !== userId) {
      throw new NotFoundException(`Response with ID ${responseId} not found`);
    }

    // Update consent flag
    response.consentGiven = false;
    await this.responseRepository.save(response);

    // Audit consent withdrawal for transparency
    await this.auditService.logAction({
      userId,
      action: AuditAction.CONSENT_UPDATED,
      resource: 'inventory_response',
      resourceId: responseId,
      details: {
        consentWithdrawn: true,
        timestamp: new Date(),
      },
    });
  }

  // Method to anonymize a user's data (LGPD requirement)
  async anonymizeUserData(userId: string): Promise<void> {
    const responses = await this.responseRepository.find({
      where: { userId },
    });

    for (const response of responses) {
      // Clear identifying information but keep aggregate data
      // This approach maintains research value while respecting privacy

      // Remove question titles and option labels from responses
      response.responses.forEach((answer) => {
        delete answer.questionTitle;
        delete answer.optionLabel;
      });

      // Set user ID to anonymized placeholder
      response.userId = 'anonymized';

      // Clear IP address
      response.ipAddress = null;

      await this.responseRepository.save(response);
    }

    // Audit anonymization
    await this.auditService.logAction({
      userId,
      action: 'DATA_ANONYMIZED' as any,
      resource: 'user',
      resourceId: userId,
      details: {
        responsesAnonymized: responses.length,
        timestamp: new Date(),
      },
    });
  }

  // Import inventory from JSON (for importing your assessment schemas)
  async importFromJson(jsonData: any, actorId: string): Promise<Inventory> {
    try {
      // Basic validation of the imported data
      if (
        !jsonData.name ||
        !jsonData.title ||
        !jsonData.questions ||
        !jsonData.scoring
      ) {
        throw new BadRequestException(
          'Invalid inventory data: missing required fields',
        );
      }

      // Check if inventory with this name already exists
      const existingInventory = await this.inventoryRepository.findOne({
        where: { name: jsonData.name },
      });

      if (existingInventory) {
        throw new ConflictException(
          `Inventory with name "${jsonData.id}" already exists`,
        );
      }

      // Transform the JSON data to match our entity structure
      const inventoryData: CreateInventoryDto = {
        name: jsonData.name,
        title: jsonData.title,
        description: jsonData.description || '',
        disclaimer: jsonData.disclaimer,
        version: jsonData.version,
        source: jsonData.source,
        questions: jsonData.questions.map((q) => ({
          id: q.id,
          title: q.title,
          subscale: q.subscale,
          reverseScore: q.reverseScore,
          options: q.options,
        })),
        scoring: jsonData.scoring,
      };

      return this.create(inventoryData, actorId);
    } catch (error) {
      this.logger.error(
        `Error importing inventory: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }
}
