import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JournalEntry } from './entities/journal.entity';
import { CreateJournalDto } from './dto/create-journal.dto';
import { UpdateJournalDto } from './dto/update-journal.dto';
import { AuditService } from '../../core/audit/audit.service';
import { AuditAction } from '../../core/audit/entities/audit-log.entity';

@Injectable()
export class JournalService {
  private readonly logger = new Logger(JournalService.name);

  constructor(
    @InjectRepository(JournalEntry)
    private readonly journalRepository: Repository<JournalEntry>,
    private readonly auditService: AuditService,
  ) {}

  async create(
    userId: string,
    createJournalDto: CreateJournalDto,
  ): Promise<JournalEntry> {
    try {
      const journalEntry = this.journalRepository.create({
        ...createJournalDto,
        userId,
      });

      const savedEntry = await this.journalRepository.save(journalEntry);

      // Audit journal entry creation
      await this.auditService.logAction({
        userId,
        action: AuditAction.CREATE,
        resource: 'journal_entry',
        resourceId: savedEntry.id,
      });

      return savedEntry;
    } catch (error) {
      this.logger.error(
        `Error creating journal entry: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async findAll(userId: string, isAdmin: boolean): Promise<JournalEntry[]> {
    if (isAdmin) {
      return this.journalRepository.find({
        relations: ['user'],
        order: { createdAt: 'DESC' },
      });
    } else {
      return this.journalRepository.find({
        where: { userId },
        order: { createdAt: 'DESC' },
      });
    }
  }

  async findOne(
    id: string,
    userId: string,
    isAdmin: boolean,
  ): Promise<JournalEntry> {
    const journalEntry = await this.journalRepository.findOne({
      where: { id },
      relations: ['user'],
    });

    if (!journalEntry) {
      throw new NotFoundException(`Journal entry with ID ${id} not found`);
    }

    // Check if user has permission to access this entry
    if (!isAdmin && journalEntry.userId !== userId) {
      throw new ForbiddenException(
        'You can only access your own journal entries',
      );
    }

    // Audit journal entry access
    await this.auditService.logAction({
      userId,
      action: AuditAction.READ,
      resource: 'journal_entry',
      resourceId: id,
    });

    return journalEntry;
  }

  async update(
    id: string,
    userId: string,
    updateJournalDto: UpdateJournalDto,
    isAdmin: boolean,
  ): Promise<JournalEntry> {
    const journalEntry = await this.journalRepository.findOne({
      where: { id },
    });

    if (!journalEntry) {
      throw new NotFoundException(`Journal entry with ID ${id} not found`);
    }

    // Check if user has permission to update this entry
    if (!isAdmin && journalEntry.userId !== userId) {
      throw new ForbiddenException(
        'You can only update your own journal entries',
      );
    }

    // Update fields
    const updatedEntry = this.journalRepository.merge(
      journalEntry,
      updateJournalDto,
    );
    await this.journalRepository.save(updatedEntry);

    // Audit journal entry update
    await this.auditService.logAction({
      userId,
      action: AuditAction.UPDATE,
      resource: 'journal_entry',
      resourceId: id,
    });

    return this.journalRepository.findOne({
      where: { id },
      relations: ['user'],
    });
  }

  async remove(id: string, userId: string, isAdmin: boolean): Promise<void> {
    const journalEntry = await this.journalRepository.findOne({
      where: { id },
    });

    if (!journalEntry) {
      throw new NotFoundException(`Journal entry with ID ${id} not found`);
    }

    // Check if user has permission to delete this entry
    if (!isAdmin && journalEntry.userId !== userId) {
      throw new ForbiddenException(
        'You can only delete your own journal entries',
      );
    }

    await this.journalRepository.remove(journalEntry);

    // Audit journal entry deletion
    await this.auditService.logAction({
      userId,
      action: AuditAction.DELETE,
      resource: 'journal_entry',
      resourceId: id,
    });
  }

  async findByUserId(userId: string): Promise<JournalEntry[]> {
    return this.journalRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }
}
