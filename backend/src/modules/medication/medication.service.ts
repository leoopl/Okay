import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  Repository,
  Between,
  LessThanOrEqual,
  MoreThanOrEqual,
  IsNull,
  FindOptionsWhere,
} from 'typeorm';
import { Medication, MedicationForm } from './entities/medication.entity';
import { DoseLog } from './entities/dose-log.entity';
import { DayOfWeek, ScheduleTime } from './entities/schedule-time.entity';
import { CreateMedicationDto } from './dto/create-medication.dto';
import { UpdateMedicationDto } from './dto/update-medication.dto';
import { LogDoseDto } from './dto/log-dose.dto';
import { MedicationResponseDto } from './dto/medication-response.dto';
import { AuditService } from '../../core/audit/audit.service';
import { AuditAction } from '../../core/audit/entities/audit-log.entity';
import { format, startOfDay, endOfDay, subDays } from 'date-fns';

@Injectable()
export class MedicationService {
  private readonly logger = new Logger(MedicationService.name);

  constructor(
    @InjectRepository(Medication)
    private medicationRepository: Repository<Medication>,
    @InjectRepository(DoseLog)
    private doseLogRepository: Repository<DoseLog>,
    @InjectRepository(ScheduleTime)
    private scheduleTimeRepository: Repository<ScheduleTime>,
    private auditService: AuditService,
  ) {}

  /**
   * Create a new medication
   */
  async create(
    userId: string,
    createMedicationDto: CreateMedicationDto,
  ): Promise<MedicationResponseDto> {
    this.logger.log(
      `[Create] Attempting to create medication for user ${userId}`,
    );
    this.logger.debug(`[Create] DTO: ${JSON.stringify(createMedicationDto)}`);

    // First, create the basic medication entity
    const medication = this.medicationRepository.create({
      userId,
      name: createMedicationDto.name,
      dosage: createMedicationDto.dosage,
      form: createMedicationDto.form as MedicationForm,
      startDate: new Date(createMedicationDto.startDate),
      endDate: createMedicationDto.endDate
        ? new Date(createMedicationDto.endDate)
        : null,
      notes: createMedicationDto.notes,
      instructions: createMedicationDto.instructions,
    });

    // Save the medication first to get its ID
    const savedMedication = await this.medicationRepository.save(medication);
    this.logger.log(
      `[Create] Basic medication saved with ID: ${savedMedication.id}`,
    );

    // Then handle schedules separately if provided
    if (
      createMedicationDto.schedule &&
      createMedicationDto.schedule.length > 0
    ) {
      this.logger.log(
        `[Create] Adding ${createMedicationDto.schedule.length} schedule items`,
      );

      // Create schedule entities and set the medicationId
      const scheduleItems = createMedicationDto.schedule.map((item) => {
        return this.scheduleTimeRepository.create({
          medicationId: savedMedication.id,
          time: item.time,
          days: item.days as DayOfWeek[], // Trust the DTO's days format
        });
      });

      // Save the schedule items
      await this.scheduleTimeRepository.save(scheduleItems);
      this.logger.log(`[Create] All schedule items saved`);

      // Set the schedule property for the response
      savedMedication.schedule = scheduleItems;
    } else {
      // Ensure there's an empty array for the response
      savedMedication.schedule = [];
    }

    // Audit the creation
    await this.auditService.logAction({
      userId,
      action: AuditAction.CREATE,
      resource: 'medication',
      resourceId: savedMedication.id,
      details: { name: savedMedication.name },
    });

    return new MedicationResponseDto(savedMedication);
  }

  /**
   * Find all medications for a user
   */
  async findAll(userId: string): Promise<MedicationResponseDto[]> {
    const medications = await this.medicationRepository.find({
      where: { userId },
      relations: ['schedule'],
      order: { createdAt: 'DESC' },
    });
    return medications.map(
      (medication) => new MedicationResponseDto(medication),
    );
  }

  /**
   * Find a specific medication by ID
   */
  async findOne(id: string, userId: string): Promise<MedicationResponseDto> {
    const medication = await this.medicationRepository.findOne({
      where: { id, userId },
      relations: ['schedule'],
    });

    if (!medication) {
      this.logger.warn(
        `[FindOne] Medication ID ${id} not found for user ${userId}`,
      );
      throw new NotFoundException(`Medication with ID ${id} not found`);
    }
    return new MedicationResponseDto(medication);
  }

  /**
   * Update a medication - Revised Logic
   */
  async update(
    id: string,
    userId: string,
    updateMedicationDto: UpdateMedicationDto,
  ): Promise<MedicationResponseDto> {
    this.logger.log(
      `[Update] Attempting update for medication ID: ${id}, User: ${userId}`,
    );
    this.logger.debug(`[Update] DTO: ${JSON.stringify(updateMedicationDto)}`);

    // First check if medication exists
    const existingMedication = await this.medicationRepository.findOne({
      where: { id, userId },
      relations: ['schedule'],
    });

    if (!existingMedication) {
      this.logger.warn(
        `[Update] Medication ID ${id} not found for user ${userId}`,
      );
      throw new NotFoundException(`Medication with ID ${id} not found`);
    }

    // STRATEGY: Split into two operations - update base medication data and handle schedules separately

    // STEP 1: Update medication fields only (no relations)
    // Extract only the medication fields (exclude schedule)
    const { schedule, ...medicationUpdate } = updateMedicationDto;

    // Process date fields if they exist
    if (medicationUpdate.startDate) {
      medicationUpdate.startDate =
        typeof medicationUpdate.startDate === 'string'
          ? new Date(medicationUpdate.startDate)
          : medicationUpdate.startDate;
    }

    if (medicationUpdate.endDate !== undefined) {
      medicationUpdate.endDate = medicationUpdate.endDate
        ? typeof medicationUpdate.endDate === 'string'
          ? new Date(medicationUpdate.endDate)
          : medicationUpdate.endDate
        : null;
    }

    // Only update the medication if there are fields to update
    if (Object.keys(medicationUpdate).length > 0) {
      this.logger.log(
        `[Update] Updating base medication fields: ${Object.keys(medicationUpdate).join(', ')}`,
      );

      // Cast form to MedicationForm if it exists
      if (medicationUpdate.form) {
        medicationUpdate.form = medicationUpdate.form as MedicationForm;
      }

      // Use update method instead of save to avoid loading and potentially cascading relations
      await this.medicationRepository.update(
        { id, userId },
        medicationUpdate as any, // Use type assertion to bypass TypeORM's strict typing
      );

      this.logger.log(`[Update] Successfully updated medication fields`);
    } else {
      this.logger.log(`[Update] No medication fields to update`);
    }

    // STEP 2: Handle schedules separately if provided
    if (schedule !== undefined) {
      this.logger.log(
        `[Update] Schedule array provided with ${schedule.length} items`,
      );

      // Delete existing schedules first
      this.logger.log(
        `[Update] Attempting to delete schedules for medicationId: ${id}`,
      );
      const deleteResult = await this.scheduleTimeRepository.delete({
        medicationId: id,
      });
      this.logger.log(
        `[Update] Deleted ${deleteResult.affected || 0} existing schedule items`,
      );

      // Create new schedules if any are provided
      if (schedule.length > 0) {
        this.logger.log(
          `[Update] Preparing to create ${schedule.length} new schedule items.`,
        );
        const createdSchedules = [];
        for (const item of schedule) {
          const scheduleEntity = this.scheduleTimeRepository.create({
            medicationId: id,
            time: item.time,
            days: item.days.map(
              (day) =>
                DayOfWeek[day.toUpperCase() as keyof typeof DayOfWeek] || day,
            ) as DayOfWeek[],
          });
          this.logger.debug(
            `[Update] Saving new schedule item: ${JSON.stringify(scheduleEntity)}`,
          );
          const savedItem =
            await this.scheduleTimeRepository.save(scheduleEntity);
          this.logger.debug(
            `[Update] Saved schedule item with ID: ${savedItem.id}`,
          );
          createdSchedules.push(savedItem);
        }
        this.logger.log(
          `[Update] Successfully created ${createdSchedules.length} new schedule items.`,
        );
      } else {
        this.logger.log(
          `[Update] Provided schedule array was empty. No new schedules created.`,
        );
      }
    } else {
      this.logger.log(
        `[Update] Schedule not included in update, leaving existing schedules untouched`,
      );
    }

    // STEP 3: Fetch the final updated medication with all relations for the response
    const updatedMedication = await this.medicationRepository.findOne({
      where: { id, userId },
      relations: ['schedule'],
    });

    if (!updatedMedication) {
      this.logger.error(
        `[Update] Failed to fetch updated medication after save`,
      );
      throw new Error('Failed to retrieve updated medication details');
    }

    // Log the final state for debugging
    this.logger.debug(
      `[Update] Final medication state: ${JSON.stringify(updatedMedication)}`,
    );

    // Log the action
    await this.auditService.logAction({
      userId,
      action: AuditAction.UPDATE,
      resource: 'medication',
      resourceId: updatedMedication.id,
      details: { name: updatedMedication.name },
    });

    return new MedicationResponseDto(updatedMedication);
  }

  /**
   * Delete a medication
   */
  async remove(id: string, userId: string): Promise<void> {
    this.logger.log(
      `[Delete] Attempting delete for medication ID: ${id}, User: ${userId}`,
    );
    const medication = await this.medicationRepository.findOneBy({
      id,
      userId,
    });

    if (!medication) {
      this.logger.warn(
        `[Delete] Medication ID ${id} not found for user ${userId}`,
      );
      throw new NotFoundException(`Medication with ID ${id} not found`);
    }

    await this.medicationRepository.remove(medication);
    this.logger.log(`[Delete] Deleted medication ID: ${id}`);

    await this.auditService.logAction({
      userId,
      action: AuditAction.DELETE,
      resource: 'medication',
      resourceId: id,
      details: { name: medication.name },
    });
  }

  /**
   * Log a dose
   */
  async logDose(userId: string, logDoseDto: LogDoseDto): Promise<DoseLog> {
    const medication = await this.medicationRepository.findOneBy({
      id: logDoseDto.medicationId,
      userId,
    });
    if (!medication) {
      throw new NotFoundException(
        `Cannot log dose: Medication ID ${logDoseDto.medicationId} not found for user ${userId}`,
      );
    }

    const doseLog = this.doseLogRepository.create({
      ...logDoseDto,
      userId,
      timestamp: logDoseDto.timestamp
        ? typeof logDoseDto.timestamp === 'string'
          ? new Date(logDoseDto.timestamp)
          : logDoseDto.timestamp
        : new Date(),
      scheduledTime: logDoseDto.scheduledTime,
    });

    const savedDoseLog = await this.doseLogRepository.save(doseLog);

    await this.auditService.logAction({
      userId,
      action: AuditAction.CREATE,
      resource: 'doseLog',
      resourceId: savedDoseLog.id,
      details: { medicationName: medication.name, status: logDoseDto.status },
    });
    return savedDoseLog;
  }

  /**
   * Get dose logs for a user
   */
  async getDoseLogs(
    userId: string,
    medicationId?: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<DoseLog[]> {
    const query: FindOptionsWhere<DoseLog> = { userId };
    if (medicationId) query.medicationId = medicationId;

    if (startDate && endDate) {
      query.timestamp = Between(startOfDay(startDate), endOfDay(endDate));
    } else if (startDate) {
      query.timestamp = MoreThanOrEqual(startOfDay(startDate));
    } else if (endDate) {
      query.timestamp = LessThanOrEqual(endOfDay(endDate));
    }

    return this.doseLogRepository.find({
      where: query,
      relations: ['medication'],
      order: { timestamp: 'DESC' },
    });
  }

  /**
   * Get today's schedule - Revised Logic
   */
  async getTodaySchedule(userId: string): Promise<any[]> {
    const today = new Date();
    const todayStart = startOfDay(today);
    this.logger.log(
      `[Schedule] Getting schedule for user ${userId} on ${todayStart.toISOString()}`,
    );

    // Find all active medications (started before/on today, and either ongoing or ending in the future)
    const activeMedications = await this.medicationRepository.find({
      where: [
        { userId, startDate: LessThanOrEqual(todayStart), endDate: IsNull() }, // Ongoing
        {
          userId,
          startDate: LessThanOrEqual(todayStart),
          endDate: MoreThanOrEqual(todayStart),
        }, // Ends today or later
      ],
      relations: ['schedule'],
    });

    this.logger.log(
      `[Schedule] Found ${activeMedications.length} potentially active medications.`,
    );
    activeMedications.forEach((med) => {
      this.logger.debug(
        `[Schedule] - ${med.name}: ${med.schedule?.length || 0} schedules, Start: ${med.startDate}, End: ${med.endDate || 'ongoing'}`,
      );
    });

    // Get current day of week in a case-insensitive way
    const todayDayName = format(today, 'EEEE'); // e.g., "Monday"
    const todayLowercase = todayDayName.toLowerCase();
    this.logger.log(`[Schedule] Current day of week: ${todayDayName}`);

    // Get logs ONLY for today to check against
    const todayLogs = await this.doseLogRepository.find({
      where: {
        userId,
        timestamp: Between(startOfDay(today), endOfDay(today)),
      },
    });
    this.logger.log(
      `[Schedule] Found ${todayLogs.length} dose logs for today.`,
    );

    const scheduleTasks = [];

    for (const med of activeMedications) {
      if (!med.schedule || med.schedule.length === 0) {
        this.logger.debug(
          `[Schedule] Skipping ${med.name}: no schedules defined.`,
        );
        continue;
      }

      for (const timeSlot of med.schedule) {
        // Convert all days to lowercase for case-insensitive comparison
        const daysList = timeSlot.days.map((d) =>
          typeof d === 'string' ? d.toLowerCase() : '',
        );

        // Check if scheduled for today
        const isScheduledToday = daysList.includes(todayLowercase);

        // Log the matching
        this.logger.debug(
          `[Schedule] Checking ${med.name} at ${timeSlot.time}: days=${daysList.join(',')}, today=${todayLowercase}, match=${isScheduledToday}`,
        );

        if (isScheduledToday) {
          // Check if already logged for this specific time slot
          const alreadyLogged = todayLogs.some(
            (log) =>
              log.medicationId === med.id &&
              log.scheduledTime === timeSlot.time,
          );

          this.logger.debug(
            `[Schedule] ${med.name} at ${timeSlot.time} is for today. Already logged: ${alreadyLogged}`,
          );

          if (!alreadyLogged) {
            scheduleTasks.push({
              medicationId: med.id,
              medicationName: med.name,
              dosage: med.dosage,
              form: med.form,
              instructions: med.instructions,
              time: timeSlot.time,
              scheduledTime: timeSlot.time, // For potential logging use
            });
            this.logger.debug(
              `[Schedule] Added to schedule: ${med.name} at ${timeSlot.time}`,
            );
          }
        }
      }
    }

    // Sort by time
    scheduleTasks.sort((a, b) => a.time.localeCompare(b.time));
    this.logger.log(
      `[Schedule] Final schedule has ${scheduleTasks.length} items`,
    );

    return scheduleTasks;
  }

  /**
   * Get adherence stats
   */
  async getAdherenceStats(
    userId: string,
    medicationId?: string,
    daysBack: number = 30,
  ): Promise<any> {
    const endDate = new Date();
    const startDate = subDays(startOfDay(endDate), daysBack - 1);
    this.logger.log(
      `[Stats] Calculating adherence for user ${userId}, period: ${startDate.toISOString()} to ${endDate.toISOString()}`,
    );

    const logs = await this.getDoseLogs(
      userId,
      medicationId,
      startDate,
      endDate,
    );

    const taken = logs.filter((log) => log.status === 'taken').length;
    const skipped = logs.filter((log) => log.status === 'skipped').length;
    const delayed = logs.filter((log) => log.status === 'delayed').length;
    const totalLogged = logs.length;

    const adherenceRate =
      totalLogged > 0 ? Math.round((taken / totalLogged) * 100) : 0;
    this.logger.log(
      `[Stats] Adherence based on logs: ${adherenceRate}% (T:${taken}, S:${skipped}, D:${delayed}, Total:${totalLogged})`,
    );

    return {
      adherenceRate,
      total: totalLogged,
      taken,
      skipped,
      delayed,
      period: {
        startDate: startDate.toISOString(),
        endDate: endOfDay(endDate).toISOString(),
        days: daysBack,
      },
    };
  }
}
