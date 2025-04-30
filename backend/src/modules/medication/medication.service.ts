import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, LessThanOrEqual, MoreThanOrEqual } from 'typeorm';
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
    // Create medication without schedule first
    const medication = this.medicationRepository.create({
      name: createMedicationDto.name,
      dosage: createMedicationDto.dosage,
      form: createMedicationDto.form as MedicationForm, // Cast to enum type
      startDate: new Date(createMedicationDto.startDate),
      endDate: createMedicationDto.endDate
        ? new Date(createMedicationDto.endDate)
        : undefined,
      notes: createMedicationDto.notes,
      instructions: createMedicationDto.instructions,
      userId, // Make sure userId exists on entity
    });

    // Save to get an ID
    const savedMedication = await this.medicationRepository.save(medication);

    // Create schedule items with the correct medication ID reference
    if (
      createMedicationDto.schedule &&
      createMedicationDto.schedule.length > 0
    ) {
      const scheduleItems = createMedicationDto.schedule.map((item) =>
        this.scheduleTimeRepository.create({
          medicationId: savedMedication.id,
          time: item.time,
          days: item.days as DayOfWeek[], // Type assertion to resolve TypeScript issue
        }),
      );

      // Save schedule times
      await this.scheduleTimeRepository.save(scheduleItems);
    }

    // Fetch the complete medication with schedule for response
    const medicationWithSchedule = await this.medicationRepository.findOne({
      where: { id: savedMedication.id },
      relations: ['schedule'],
    });

    // Audit the creation
    await this.auditService.logAction({
      userId,
      action: AuditAction.CREATE,
      resource: 'medication',
      resourceId: medicationWithSchedule.id,
      details: { name: medicationWithSchedule.name },
    });

    return new MedicationResponseDto(medicationWithSchedule);
  }

  /**
   * Find all medications for a user
   */
  async findAll(userId: string): Promise<MedicationResponseDto[]> {
    const medications = await this.medicationRepository.find({
      where: { userId },
      relations: ['schedule'],
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
      throw new NotFoundException(`Medication with ID ${id} not found`);
    }

    return new MedicationResponseDto(medication);
  }

  /**
   * Update a medication
   */
  async update(
    id: string,
    userId: string,
    updateMedicationDto: UpdateMedicationDto,
  ): Promise<MedicationResponseDto> {
    // Find the medication
    const medication = await this.medicationRepository.findOne({
      where: { id, userId },
      relations: ['schedule'],
    });

    if (!medication) {
      throw new NotFoundException(`Medication with ID ${id} not found`);
    }

    // Update basic fields
    Object.assign(medication, {
      name: updateMedicationDto.name ?? medication.name,
      dosage: updateMedicationDto.dosage ?? medication.dosage,
      form: updateMedicationDto.form ?? medication.form,
      startDate: updateMedicationDto.startDate
        ? new Date(updateMedicationDto.startDate)
        : medication.startDate,
      endDate: updateMedicationDto.endDate
        ? new Date(updateMedicationDto.endDate)
        : medication.endDate,
      notes: updateMedicationDto.notes ?? medication.notes,
      instructions: updateMedicationDto.instructions ?? medication.instructions,
    });

    // Save the basic medication fields
    await this.medicationRepository.save(medication);

    // Handle schedule updates if provided
    if (updateMedicationDto.schedule) {
      // Remove existing schedule times
      await this.scheduleTimeRepository.delete({ medicationId: id });

      // Create and save new schedule times
      if (updateMedicationDto.schedule.length > 0) {
        const scheduleItems = updateMedicationDto.schedule.map((item) =>
          this.scheduleTimeRepository.create({
            medicationId: id,
            time: item.time,
            days: item.days as DayOfWeek[], // Type assertion
          }),
        );

        await this.scheduleTimeRepository.save(scheduleItems);
      }
    }

    // Fetch the updated medication with schedule
    const updatedMedication = await this.medicationRepository.findOne({
      where: { id },
      relations: ['schedule'],
    });

    // Audit the update
    await this.auditService.logAction({
      userId,
      action: AuditAction.UPDATE,
      resource: 'medication',
      resourceId: id,
      details: { name: updatedMedication.name },
    });

    return new MedicationResponseDto(updatedMedication);
  }

  /**
   * Delete a medication
   */
  async remove(id: string, userId: string): Promise<void> {
    // Find the medication
    const medication = await this.medicationRepository.findOne({
      where: { id, userId },
    });

    if (!medication) {
      throw new NotFoundException(`Medication with ID ${id} not found`);
    }

    // Delete the medication (cascade will delete schedules)
    await this.medicationRepository.remove(medication);

    // Audit the deletion
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
    // Find the medication
    const medication = await this.medicationRepository.findOne({
      where: { id: logDoseDto.medicationId, userId },
    });

    if (!medication) {
      throw new NotFoundException(
        `Medication with ID ${logDoseDto.medicationId} not found`,
      );
    }

    // Create the dose log
    const doseLog = this.doseLogRepository.create({
      ...logDoseDto,
      userId,
      timestamp: new Date(logDoseDto.timestamp),
    });

    // Save and audit
    const savedDoseLog = await this.doseLogRepository.save(doseLog);

    await this.auditService.logAction({
      userId,
      action: AuditAction.CREATE,
      resource: 'doseLog',
      resourceId: savedDoseLog.id,
      details: {
        medicationId: logDoseDto.medicationId,
        medicationName: medication.name,
        status: logDoseDto.status,
      },
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
    const query: any = { userId };

    if (medicationId) {
      query.medicationId = medicationId;
    }

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
   * Get today's schedule
   */
  async getTodaySchedule(userId: string): Promise<any[]> {
    // Get all active medications for the user
    const medications = await this.medicationRepository.find({
      where: {
        userId,
        startDate: LessThanOrEqual(new Date()),
        // Only include medications that haven't ended or haven't reached end date
        endDate: MoreThanOrEqual(new Date()),
      },
      relations: ['schedule'],
    });

    const today = new Date();
    const dayOfWeek = format(today, 'EEEE') as any; // e.g., "Monday"

    // Get today's dose logs
    const todayLogs = await this.doseLogRepository.find({
      where: {
        userId,
        timestamp: Between(startOfDay(today), endOfDay(today)),
      },
    });

    // Prepare the schedule
    const todaySchedule = [];

    for (const medication of medications) {
      for (const scheduleTime of medication.schedule) {
        // Check if this time is scheduled for today
        if (scheduleTime.days.includes(dayOfWeek)) {
          // Check if it's already been logged
          const alreadyLogged = todayLogs.some(
            (log) =>
              log.medicationId === medication.id &&
              log.scheduledTime === scheduleTime.time,
          );

          // Only include if not already logged
          if (!alreadyLogged) {
            todaySchedule.push({
              medicationId: medication.id,
              medicationName: medication.name,
              dosage: medication.dosage,
              form: medication.form,
              instructions: medication.instructions,
              time: scheduleTime.time,
              scheduledTime: scheduleTime.time,
            });
          }
        }
      }
    }

    // Sort by time
    return todaySchedule.sort((a, b) => a.time.localeCompare(b.time));
  }

  /**
   * Get adherence stats
   */
  async getAdherenceStats(
    userId: string,
    medicationId?: string,
    daysBack: number = 30,
  ): Promise<any> {
    const startDate = subDays(new Date(), daysBack);
    const endDate = new Date();

    // Get all logs in the date range
    const logs = await this.getDoseLogs(
      userId,
      medicationId,
      startDate,
      endDate,
    );

    // Count by status
    const taken = logs.filter((log) => log.status === 'taken').length;
    const skipped = logs.filter((log) => log.status === 'skipped').length;
    const delayed = logs.filter((log) => log.status === 'delayed').length;
    const total = logs.length;

    // Calculate adherence rate
    const adherenceRate = total > 0 ? Math.round((taken / total) * 100) : 0;

    return {
      adherenceRate,
      total,
      taken,
      skipped,
      delayed,
      period: {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        days: daysBack,
      },
    };
  }
}
