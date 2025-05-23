import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { JournalEntry } from './entities/journal.entity';
import { AuditService } from '../../core/audit/audit.service';
import { AuditAction } from '../../core/audit/entities/audit-log.entity';
import { EncryptionService } from '../../common/encryption/encryption.service';
import { CreateJournalDto } from './dto/create-journal.dto';
import { JournalEntryResponseDto } from './dto/response-journal.dto';
import { JournalQueryDto } from './dto/query-journal.dto';
import { UpdateJournalDto } from './dto/update-journal.dto';

@Injectable()
export class JournalService {
  private readonly logger = new Logger(JournalService.name);
  private readonly enableEncryption: boolean;

  constructor(
    @InjectRepository(JournalEntry)
    private readonly journalRepository: Repository<JournalEntry>,
    private readonly auditService: AuditService,
    private readonly encryptionService: EncryptionService,
    private readonly configService: ConfigService,
  ) {
    // Enable content encryption for highly sensitive health data
    this.enableEncryption = this.configService.get<boolean>(
      'JOURNAL_ENCRYPTION_ENABLED',
      false,
    );
  }

  /**
   * Create a new journal entry
   * Validates TipTap content and optionally encrypts sensitive data
   */
  async create(
    userId: string,
    createJournalDto: CreateJournalDto,
  ): Promise<JournalEntryResponseDto> {
    try {
      // Parse and validate TipTap content structure
      const parsedContent = this.parseAndValidateTipTapContent(
        createJournalDto.content,
      );

      // Prepare journal entry
      const journalEntry = this.journalRepository.create({
        title: createJournalDto.title,
        userId,
        mood: createJournalDto.mood,
        tags: createJournalDto.tags || [],
        content: parsedContent, // Store as object in database
      });

      // Handle content encryption if enabled
      if (this.enableEncryption) {
        journalEntry.content = await this.encryptContent(parsedContent);
        journalEntry.isContentEncrypted = true;
      }

      const savedEntry = await this.journalRepository.save(journalEntry);

      // Audit journal entry creation
      await this.auditService.logAction({
        userId,
        action: AuditAction.CREATE,
        resource: 'journal_entry',
        resourceId: savedEntry.id,
        details: {
          title: savedEntry.title,
          mood: savedEntry.mood,
          tagsCount: savedEntry.tags?.length || 0,
          isEncrypted: savedEntry.isContentEncrypted,
        },
      });

      // Decrypt content for response if necessary
      const responseEntry = await this.decryptEntryForResponse(savedEntry);
      return new JournalEntryResponseDto(responseEntry);
    } catch (error) {
      this.logger.error(
        `Error creating journal entry for user ${userId}: ${error.message}`,
        error.stack,
      );

      if (error instanceof BadRequestException) {
        throw error;
      }

      throw new InternalServerErrorException('Failed to create journal entry');
    }
  }

  /**
   * Get all journal entries for a user with optional filtering
   */
  async findAll(
    userId: string,
    queryDto: JournalQueryDto,
    isAdmin: boolean = false,
  ): Promise<JournalEntryResponseDto[]> {
    try {
      const queryBuilder = this.createBaseQuery(userId, isAdmin);

      // Apply filters
      this.applyFilters(queryBuilder, queryDto);

      // Apply pagination
      queryBuilder.limit(queryDto.limit || 20).offset(queryDto.offset || 0);

      // Order by creation date (most recent first)
      queryBuilder.orderBy('journal.createdAt', 'DESC');

      const entries = await queryBuilder.getMany();

      // Decrypt entries for response
      const decryptedEntries = await Promise.all(
        entries.map((entry) => this.decryptEntryForResponse(entry)),
      );

      return decryptedEntries.map(
        (entry) => new JournalEntryResponseDto(entry),
      );
    } catch (error) {
      this.logger.error(
        `Error fetching journal entries for user ${userId}: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException('Failed to fetch journal entries');
    }
  }

  /**
   * Get a specific journal entry by ID
   */
  async findOne(
    id: string,
    userId: string,
    isAdmin: boolean = false,
  ): Promise<JournalEntryResponseDto> {
    try {
      const queryBuilder = this.createBaseQuery(userId, isAdmin);
      queryBuilder.andWhere('journal.id = :id', { id });

      const journalEntry = await queryBuilder.getOne();

      if (!journalEntry) {
        throw new NotFoundException(`Journal entry with ID ${id} not found`);
      }

      // Security check: Ensure user can only access their own entries
      if (!isAdmin && journalEntry.userId !== userId) {
        this.logger.warn(
          `User ${userId} attempted to access journal ${id} owned by ${journalEntry.userId}`,
        );
        throw new ForbiddenException('Access denied to this journal entry');
      }

      // Audit journal entry access
      await this.auditService.logAction({
        userId,
        action: AuditAction.READ,
        resource: 'journal_entry',
        resourceId: id,
        details: { accessType: isAdmin ? 'admin' : 'owner' },
      });

      const decryptedEntry = await this.decryptEntryForResponse(journalEntry);
      return new JournalEntryResponseDto(decryptedEntry);
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof ForbiddenException
      ) {
        throw error;
      }

      this.logger.error(
        `Error fetching journal entry ${id}: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException('Failed to fetch journal entry');
    }
  }

  /**
   * Update an existing journal entry
   */
  async update(
    id: string,
    userId: string,
    updateJournalDto: UpdateJournalDto,
    isAdmin: boolean = false,
  ): Promise<JournalEntryResponseDto> {
    try {
      const journalEntry = await this.journalRepository.findOne({
        where: { id },
      });

      if (!journalEntry) {
        throw new NotFoundException(`Journal entry with ID ${id} not found`);
      }

      // Security check
      if (!isAdmin && journalEntry.userId !== userId) {
        this.logger.warn(
          `User ${userId} attempted to update journal ${id} owned by ${journalEntry.userId}`,
        );
        throw new ForbiddenException(
          'Access denied to modify this journal entry',
        );
      }

      // Prepare update data
      const updateData: Partial<JournalEntry> = {};

      if (updateJournalDto.title !== undefined) {
        updateData.title = updateJournalDto.title;
      }

      // Validate content if provided
      if (updateJournalDto.content) {
        const parsedContent = this.parseAndValidateTipTapContent(
          updateJournalDto.content,
        );

        if (this.enableEncryption) {
          updateData.content = await this.encryptContent(parsedContent);
          updateData.isContentEncrypted = true;
        } else {
          updateData.content = parsedContent;
        }
      }

      if (updateJournalDto.tags !== undefined) {
        updateData.tags = updateJournalDto.tags;
      }

      if (updateJournalDto.mood !== undefined) {
        updateData.mood = updateJournalDto.mood;
      }

      if (updateJournalDto.tags !== undefined) {
        updateData.tags = updateJournalDto.tags;
      }

      if (updateJournalDto.mood !== undefined) {
        updateData.mood = updateJournalDto.mood;
      }

      // Update the entry
      await this.journalRepository.update(id, updateData);

      // Fetch updated entry
      const updatedEntry = await this.journalRepository.findOne({
        where: { id },
      });

      // Audit journal entry update
      await this.auditService.logAction({
        userId,
        action: AuditAction.UPDATE,
        resource: 'journal_entry',
        resourceId: id,
        details: {
          updatedFields: Object.keys(updateData),
          isEncrypted: updatedEntry.isContentEncrypted,
        },
      });

      const decryptedEntry = await this.decryptEntryForResponse(updatedEntry);
      return new JournalEntryResponseDto(decryptedEntry);
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof ForbiddenException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }

      this.logger.error(
        `Error updating journal entry ${id}: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException('Failed to update journal entry');
    }
  }

  /**
   * Delete a journal entry
   */
  async remove(
    id: string,
    userId: string,
    isAdmin: boolean = false,
  ): Promise<void> {
    try {
      const journalEntry = await this.journalRepository.findOne({
        where: { id },
      });

      if (!journalEntry) {
        throw new NotFoundException(`Journal entry with ID ${id} not found`);
      }

      // Security check
      if (!isAdmin && journalEntry.userId !== userId) {
        this.logger.warn(
          `User ${userId} attempted to delete journal ${id} owned by ${journalEntry.userId}`,
        );
        throw new ForbiddenException(
          'Access denied to delete this journal entry',
        );
      }

      await this.journalRepository.remove(journalEntry);

      // Audit journal entry deletion
      await this.auditService.logAction({
        userId,
        action: AuditAction.DELETE,
        resource: 'journal_entry',
        resourceId: id,
        details: {
          title: journalEntry.title,
          wasEncrypted: journalEntry.isContentEncrypted,
        },
      });

      this.logger.log(`Journal entry ${id} deleted by user ${userId}`);
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof ForbiddenException
      ) {
        throw error;
      }

      this.logger.error(
        `Error deleting journal entry ${id}: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException('Failed to delete journal entry');
    }
  }

  /**
   * Get journal entries for a specific user (admin only)
   */
  async findByUserId(targetUserId: string): Promise<JournalEntryResponseDto[]> {
    try {
      const entries = await this.journalRepository.find({
        where: { userId: targetUserId },
        order: { createdAt: 'DESC' },
      });

      const decryptedEntries = await Promise.all(
        entries.map((entry) => this.decryptEntryForResponse(entry)),
      );

      return decryptedEntries.map(
        (entry) => new JournalEntryResponseDto(entry),
      );
    } catch (error) {
      this.logger.error(
        `Error fetching journal entries for target user ${targetUserId}: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException(
        'Failed to fetch user journal entries',
      );
    }
  }

  /**
   * Get journal statistics for a user
   */
  async getJournalStatistics(
    userId: string,
    isAdmin: boolean = false,
  ): Promise<any> {
    try {
      const queryBuilder = this.createBaseQuery(userId, isAdmin);

      const [totalEntries, moodStats] = await Promise.all([
        queryBuilder.getCount(),
        this.journalRepository
          .createQueryBuilder('journal')
          .select('journal.mood', 'mood')
          .addSelect('COUNT(*)', 'count')
          .where(isAdmin ? '1=1' : 'journal.userId = :userId', { userId })
          .andWhere('journal.mood IS NOT NULL')
          .groupBy('journal.mood')
          .getRawMany(),
      ]);

      return {
        totalEntries,
        moodDistribution: moodStats,
        lastEntryDate: await this.getLastEntryDate(userId, isAdmin),
      };
    } catch (error) {
      this.logger.error(
        `Error getting journal statistics: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException(
        'Failed to get journal statistics',
      );
    }
  }

  // Private helper methods

  private createBaseQuery(
    userId: string,
    isAdmin: boolean,
  ): SelectQueryBuilder<JournalEntry> {
    const queryBuilder = this.journalRepository
      .createQueryBuilder('journal')
      .leftJoinAndSelect('journal.user', 'user');

    if (!isAdmin) {
      queryBuilder.where('journal.userId = :userId', { userId });
    }

    return queryBuilder;
  }

  private applyFilters(
    queryBuilder: SelectQueryBuilder<JournalEntry>,
    queryDto: JournalQueryDto,
  ): void {
    if (queryDto.search) {
      queryBuilder.andWhere(
        '(journal.title ILIKE :search OR journal.content::text ILIKE :search)',
        { search: `%${queryDto.search}%` },
      );
    }

    if (queryDto.mood) {
      queryBuilder.andWhere('journal.mood = :mood', { mood: queryDto.mood });
    }

    if (queryDto.tags && queryDto.tags.length > 0) {
      queryBuilder.andWhere('journal.tags ?| array[:...tags]', {
        tags: queryDto.tags,
      });
    }
  }

  private parseAndValidateTipTapContent(content: string): object {
    if (!content || typeof content !== 'string') {
      throw new BadRequestException('Content must be a valid JSON string');
    }

    let parsedContent: any;
    try {
      parsedContent = JSON.parse(content);
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (error) {
      throw new BadRequestException('Content must be valid JSON');
    }

    this.validateTipTapContent(parsedContent);
    return parsedContent;
  }

  private validateTipTapContent(content: any): void {
    if (!content || typeof content !== 'object') {
      throw new BadRequestException('Content must be a valid JSON object');
    }

    if (content.type !== 'doc') {
      throw new BadRequestException(
        'Content must be a valid TipTap document with type "doc"',
      );
    }

    if (!Array.isArray(content.content)) {
      throw new BadRequestException('Content must have a valid content array');
    }
  }

  private async encryptContent(content: object): Promise<any> {
    try {
      const contentString = JSON.stringify(content);
      const encryptedData = this.encryptionService.encrypt(contentString);
      return encryptedData;
    } catch (error) {
      this.logger.error(
        `Content encryption failed: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException(
        'Failed to secure journal content',
      );
    }
  }

  private async decryptEntryForResponse(
    entry: JournalEntry,
  ): Promise<JournalEntry> {
    if (!entry.isContentEncrypted) {
      return entry;
    }

    try {
      const decryptedContent = this.encryptionService.decrypt(
        entry.content as any,
      );
      // Modify the existing entry object to preserve the JournalEntry instance
      entry.content = JSON.parse(decryptedContent);
      return entry;
    } catch (error) {
      this.logger.error(
        `Content decryption failed for entry ${entry.id}: ${error.message}`,
        error.stack,
      );
      // Set placeholder content on the existing entry rather than creating a new object
      entry.content = {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [
              { type: 'text', text: '[Content temporarily unavailable]' },
            ],
          },
        ],
      };
      return entry;
    }
  }

  private async getLastEntryDate(
    userId: string,
    isAdmin: boolean,
  ): Promise<Date | null> {
    const queryBuilder = this.journalRepository
      .createQueryBuilder('journal')
      .select('MAX(journal.createdAt)', 'lastEntry');

    if (!isAdmin) {
      queryBuilder.where('journal.userId = :userId', { userId });
    }

    const result = await queryBuilder.getRawOne();
    return result?.lastEntry || null;
  }
}
