import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { toast } from 'sonner';
import { isValid } from 'date-fns';
import {
  getMedications,
  createMedication as createMedicationAction,
  updateMedication as updateMedicationAction,
  deleteMedication as deleteMedicationAction,
  type CreateMedicationDto as SupabaseCreateMedicationDto,
  type UpdateMedicationDto as SupabaseUpdateMedicationDto,
} from '@/lib/actions/supabase-medications';
import {
  logDose as logDoseAction,
  getDoseLogs,
  getTodaySchedule,
  getAdherenceStats,
  type CreateDoseLogDto,
} from '@/lib/actions/supabase-dose-logs';
import type { Database } from '@/lib/supabase/database.types';
import { offlineStorage } from '@/store/offline-storage';

// Enums and constants
export enum DayOfWeek {
  MONDAY = 'monday',
  TUESDAY = 'tuesday',
  WEDNESDAY = 'wednesday',
  THURSDAY = 'thursday',
  FRIDAY = 'friday',
  SATURDAY = 'saturday',
  SUNDAY = 'sunday',
}

export const DEFAULT_DAYS_BACK = 7;
export const TIME_FORMAT = 'HH:mm';
export const DATE_FORMAT = 'yyyy-MM-dd';

// Type definitions with better specificity
export type DoseStatus = Database['public']['Enums']['dose_status'];
export type MedicationForm = Database['public']['Enums']['medication_form'];

export interface ScheduleTime {
  id?: string;
  time: string;
  days: DayOfWeek[];
}

export interface Medication {
  id: string;
  name: string;
  dosage: string;
  form: MedicationForm;
  startDate: Date;
  endDate?: Date;
  notes?: string;
  instructions?: string;
  schedule: ScheduleTime[];
  createdAt: Date;
  updatedAt: Date;
  _optimistic?: boolean;
  _syncStatus?: 'pending' | 'synced' | 'error';
}

export interface CreateMedicationDto {
  name: string;
  dosage: string;
  form: MedicationForm;
  startDate: Date | string;
  endDate?: Date | string;
  notes?: string;
  instructions?: string;
  schedule: ScheduleTime[];
}

export interface UpdateMedicationDto {
  name?: string;
  dosage?: string;
  form?: MedicationForm;
  startDate?: Date | string;
  endDate?: Date | string | null;
  notes?: string;
  instructions?: string;
  schedule?: ScheduleTime[];
}

export interface ScheduleItem {
  medicationId: string;
  medicationName: string;
  dosage: string;
  form: MedicationForm;
  instructions?: string;
  time: string;
  scheduledTime: string;
}

export interface DoseLogDto {
  medicationId: string;
  status: DoseStatus;
  timestamp: Date | string;
  scheduledTime?: string;
  notes?: string;
  doseType?: 'scheduled' | 'prn';
  clientId?: string; // Client-generated UUID for idempotent upsert
}

export interface DoseLog {
  id: string;
  medicationId: string;
  timestamp: Date;
  status: DoseStatus;
  notes?: string;
  scheduledTime?: string;
  doseType?: 'scheduled' | 'prn';
  createdAt: Date;
  updatedAt: Date;
  _optimistic?: boolean;
  _syncStatus?: 'pending' | 'synced' | 'error';
}

export interface AdherenceStats {
  adherenceRate: number;
  total: number;
  taken: number;
  skipped: number;
  delayed: number;
  period: {
    startDate: string;
    endDate: string;
    days: number;
  };
}

// Enhanced error types for better error handling
export interface MedicationError {
  type: 'network' | 'validation' | 'server' | 'unknown';
  message: string;
  code?: string;
  timestamp: Date;
}

// Loading states for better UX
export interface LoadingStates {
  medications: boolean;
  todaySchedule: boolean;
  doseLogs: boolean;
  adherenceStats: boolean;
  creating: boolean;
  updating: boolean;
  deleting: boolean;
  logging: boolean;
}

interface MedicationStore {
  // State
  medications: Medication[];
  todaySchedule: ScheduleItem[];
  doseLogs: DoseLog[];
  adherenceStats: AdherenceStats | null;
  loadingStates: LoadingStates;
  errors: Record<string, MedicationError | null>;

  // Actions
  fetchMedications: () => Promise<void>;
  fetchTodaySchedule: () => Promise<void>;
  fetchDoseLogs: (
    medicationId?: string,
    startDate?: Date,
    endDate?: Date,
    daysBack?: number,
  ) => Promise<void>;
  fetchAdherenceStats: (medicationId?: string, daysBack?: number) => Promise<void>;
  createMedication: (data: CreateMedicationDto) => Promise<Medication>;
  updateMedication: (id: string, data: UpdateMedicationDto) => Promise<Medication>;
  deleteMedication: (id: string) => Promise<void>;
  logDose: (data: DoseLogDto) => Promise<DoseLog>;

  // Utility actions
  clearError: (key: string) => void;
  clearAllErrors: () => void;
  resetStore: () => void;
}

// Helper functions
const createMedicationError = (
  type: MedicationError['type'],
  message: string,
  code?: string,
): MedicationError => ({
  type,
  message,
  code,
  timestamp: new Date(),
});

const validateDate = (date: unknown): Date | null => {
  if (!date) return null;
  const parsed = new Date(date as string);
  return isValid(parsed) ? parsed : null;
};

const normalizeScheduleTime = (time: string): string => {
  // Extract only HH:MM part, removing seconds if present
  return time.length > 5 ? time.substring(0, 5) : time;
};

const processMedicationDates = (medication: any): Medication => ({
  ...medication,
  startDate: validateDate(medication.start_date) || new Date(),
  endDate: validateDate(medication.end_date) || undefined,
  createdAt: validateDate(medication.created_at) || new Date(),
  updatedAt: validateDate(medication.updated_at) || new Date(),
  schedule:
    medication.schedule?.map((item: any) => ({
      id: item.id,
      time: normalizeScheduleTime(item.time),
      days: item.days as DayOfWeek[],
    })) || [],
});

const processDoseLog = (log: any): DoseLog => ({
  id: log.id,
  medicationId: log.medication_id,
  timestamp: validateDate(log.timestamp) || new Date(),
  status: log.status,
  notes: log.notes,
  scheduledTime: log.scheduled_time,
  createdAt: validateDate(log.created_at) || new Date(),
  updatedAt: validateDate(log.updated_at) || new Date(),
});

const initialLoadingStates: LoadingStates = {
  medications: false,
  todaySchedule: false,
  doseLogs: false,
  adherenceStats: false,
  creating: false,
  updating: false,
  deleting: false,
  logging: false,
};

export const useMedicationStore = create<MedicationStore>()(
  subscribeWithSelector((set, get) => ({
    // Initial state
    medications: [],
    todaySchedule: [],
    doseLogs: [],
    adherenceStats: null,
    loadingStates: initialLoadingStates,
    errors: {},

    // Actions
    fetchMedications: async () => {
      set((state) => ({
        loadingStates: { ...state.loadingStates, medications: true },
        errors: { ...state.errors, medications: null },
      }));

      try {
        const response = await getMedications();

        if (response.success && response.medications) {
          const medications = response.medications.map(processMedicationDates);

          set((state) => ({
            medications,
            loadingStates: { ...state.loadingStates, medications: false },
          }));
        } else {
          throw new Error(response.error || 'Failed to fetch medications');
        }
      } catch (error: any) {
        // Try to load from offline storage as fallback
        try {
          const cached = await offlineStorage.getAllMedications();
          if (cached.length > 0) {
            const medications = cached.map((m) =>
              processMedicationDates({
                ...m,
                start_date: m.start_date,
                end_date: m.end_date,
                created_at: m.created_at,
                updated_at: m.updated_at,
              }),
            );
            set((state) => ({
              medications,
              loadingStates: { ...state.loadingStates, medications: false },
            }));
            return;
          }
        } catch {
          // IndexedDB unavailable — fall through to error state
        }

        const medicationError = createMedicationError(
          'network',
          error.message || 'Failed to fetch medications',
        );

        set((state) => ({
          errors: { ...state.errors, medications: medicationError },
          loadingStates: { ...state.loadingStates, medications: false },
        }));

        toast.error('Failed to fetch your medications');
        console.error('Error fetching medications:', error);
      }
    },

    fetchTodaySchedule: async () => {
      set((state) => ({
        loadingStates: { ...state.loadingStates, todaySchedule: true },
        errors: { ...state.errors, todaySchedule: null },
      }));

      try {
        const response = await getTodaySchedule();

        if (response.success && response.schedule) {
          // Map response to match ScheduleItem interface
          const scheduleItems: ScheduleItem[] = response.schedule.map((item) => ({
            ...item,
            form: item.form as MedicationForm,
          }));

          set((state) => ({
            todaySchedule: scheduleItems,
            loadingStates: { ...state.loadingStates, todaySchedule: false },
          }));
        } else {
          throw new Error(response.error || "Failed to fetch today's schedule");
        }
      } catch (error: any) {
        const scheduleError = createMedicationError('network', "Failed to fetch today's schedule");

        set((state) => ({
          errors: { ...state.errors, todaySchedule: scheduleError },
          loadingStates: { ...state.loadingStates, todaySchedule: false },
        }));

        toast.error('Failed to fetch your schedule');
        console.error('Error fetching schedule:', error);
      }
    },

    fetchDoseLogs: async (
      medicationId?: string,
      startDate?: Date,
      endDate?: Date,
      daysBack?: number,
    ) => {
      set((state) => ({
        loadingStates: { ...state.loadingStates, doseLogs: true },
        errors: { ...state.errors, doseLogs: null },
      }));

      try {
        const response = await getDoseLogs(medicationId, startDate, endDate, daysBack);

        if (response.success && response.doseLogs) {
          const doseLogs = response.doseLogs.map(processDoseLog);

          set((state) => ({
            doseLogs,
            loadingStates: { ...state.loadingStates, doseLogs: false },
          }));
        } else {
          throw new Error(response.error || 'Failed to fetch dose logs');
        }
      } catch (error: any) {
        const logsError = createMedicationError('network', 'Failed to fetch dose logs');

        set((state) => ({
          errors: { ...state.errors, doseLogs: logsError },
          loadingStates: { ...state.loadingStates, doseLogs: false },
        }));

        console.error('Error fetching dose logs:', error);
      }
    },

    fetchAdherenceStats: async (medicationId?: string, daysBack: number = DEFAULT_DAYS_BACK) => {
      set((state) => ({
        loadingStates: { ...state.loadingStates, adherenceStats: true },
        errors: { ...state.errors, adherenceStats: null },
      }));

      try {
        const response = await getAdherenceStats(medicationId, daysBack);

        if (response.success && response.stats) {
          set((state) => ({
            adherenceStats: response.stats!,
            loadingStates: { ...state.loadingStates, adherenceStats: false },
          }));
        } else {
          throw new Error(response.error || 'Failed to fetch adherence stats');
        }
      } catch (error: any) {
        const statsError = createMedicationError('network', 'Failed to fetch adherence stats');

        set((state) => ({
          errors: { ...state.errors, adherenceStats: statsError },
          loadingStates: { ...state.loadingStates, adherenceStats: false },
        }));

        toast.error('Failed to fetch your adherence statistics');
        console.error('Error fetching adherence stats:', error);
      }
    },

    createMedication: async (data: CreateMedicationDto) => {
      const clientId = crypto.randomUUID();
      const now = new Date();

      // Optimistic update — immediately reflect in UI
      const optimisticMedication: Medication = {
        id: clientId,
        name: data.name,
        dosage: data.dosage,
        form: data.form,
        startDate: new Date(data.startDate as string),
        endDate: data.endDate ? new Date(data.endDate as string) : undefined,
        notes: data.notes,
        instructions: data.instructions,
        schedule: data.schedule,
        createdAt: now,
        updatedAt: now,
        _optimistic: true,
        _syncStatus: 'pending',
      };

      set((state) => ({
        medications: [optimisticMedication, ...state.medications],
        loadingStates: { ...state.loadingStates, creating: true },
        errors: { ...state.errors, creating: null },
      }));

      // Persist optimistic record to IndexedDB
      try {
        await offlineStorage.saveMedication({
          id: clientId,
          user_id: '',
          name: data.name,
          dosage: data.dosage,
          form: data.form,
          start_date: new Date(data.startDate as string).toISOString(),
          end_date: data.endDate ? new Date(data.endDate as string).toISOString() : null,
          notes: data.notes || null,
          instructions: data.instructions || null,
          schedule: data.schedule,
          created_at: now.toISOString(),
          updated_at: now.toISOString(),
          _optimistic: true,
          _syncStatus: 'pending',
        });
      } catch {
        // IndexedDB unavailable — continue online-only
      }

      try {
        const supabaseData: SupabaseCreateMedicationDto = {
          name: data.name,
          dosage: data.dosage,
          form: data.form,
          startDate: data.startDate,
          endDate: data.endDate,
          notes: data.notes,
          instructions: data.instructions,
          schedule: data.schedule.map((s) => ({
            time: s.time,
            days: s.days as any,
          })),
        };

        const response = await createMedicationAction(supabaseData);

        if (response.success && response.medication) {
          const newMedication = processMedicationDates(response.medication);

          // Replace optimistic record with server-confirmed record
          set((state) => ({
            medications: state.medications.map((m) =>
              m.id === clientId ? { ...newMedication, _optimistic: false, _syncStatus: 'synced' } : m,
            ),
            loadingStates: { ...state.loadingStates, creating: false },
          }));

          // Update IndexedDB with server ID
          try {
            await offlineStorage.deleteMedication(clientId);
            await offlineStorage.saveMedication({
              id: newMedication.id,
              user_id: '',
              name: newMedication.name,
              dosage: newMedication.dosage,
              form: newMedication.form,
              start_date: newMedication.startDate.toISOString(),
              end_date: newMedication.endDate?.toISOString() || null,
              notes: newMedication.notes || null,
              instructions: newMedication.instructions || null,
              schedule: newMedication.schedule,
              created_at: newMedication.createdAt.toISOString(),
              updated_at: newMedication.updatedAt.toISOString(),
              _optimistic: false,
              _syncStatus: 'synced',
            });
          } catch {
            // IndexedDB unavailable — continue
          }

          toast.success('Medication added successfully', { richColors: true });
          return newMedication;
        } else {
          throw new Error(response.error || 'Failed to create medication');
        }
      } catch (error: any) {
        // Rollback optimistic update
        set((state) => ({
          medications: state.medications.filter((m) => m.id !== clientId),
          loadingStates: { ...state.loadingStates, creating: false },
          errors: {
            ...state.errors,
            creating: createMedicationError('network', error.message || 'Failed to create medication'),
          },
        }));

        // Mark as error in IndexedDB
        try {
          const cached = await offlineStorage.getMedication(clientId);
          if (cached) {
            await offlineStorage.saveMedication({ ...cached, _syncStatus: 'error' });
          }
        } catch {
          // IndexedDB unavailable
        }

        toast.error('Failed to add medication');
        console.error('Error creating medication:', error);
        throw error;
      }
    },

    updateMedication: async (id: string, data: UpdateMedicationDto) => {
      set((state) => ({
        loadingStates: { ...state.loadingStates, updating: true },
        errors: { ...state.errors, updating: null },
      }));

      try {
        // Convert to Supabase format
        const supabaseData: SupabaseUpdateMedicationDto = {
          name: data.name,
          dosage: data.dosage,
          form: data.form,
          startDate: data.startDate,
          endDate: data.endDate,
          notes: data.notes,
          instructions: data.instructions,
          schedule: data.schedule?.map((s) => ({
            time: s.time,
            days: s.days as any,
          })),
        };

        const response = await updateMedicationAction(id, supabaseData);

        if (response.success && response.medication) {
          const updatedMedication = processMedicationDates(response.medication);

          set((state) => ({
            medications: state.medications.map((med) => (med.id === id ? updatedMedication : med)),
            loadingStates: { ...state.loadingStates, updating: false },
          }));

          toast.success('Medication updated successfully');
          return updatedMedication;
        } else {
          throw new Error(response.error || 'Failed to update medication');
        }
      } catch (error: any) {
        const updateError = createMedicationError(
          'network',
          error.message || 'Failed to update medication',
        );

        set((state) => ({
          errors: { ...state.errors, updating: updateError },
          loadingStates: { ...state.loadingStates, updating: false },
        }));

        toast.error('Failed to update medication');
        console.error('Error updating medication:', error);
        throw error;
      }
    },

    deleteMedication: async (id: string) => {
      set((state) => ({
        loadingStates: { ...state.loadingStates, deleting: true },
        errors: { ...state.errors, deleting: null },
      }));

      try {
        const response = await deleteMedicationAction(id);

        if (response.success) {
          set((state) => ({
            medications: state.medications.filter((med) => med.id !== id),
            loadingStates: { ...state.loadingStates, deleting: false },
          }));

          toast.success('Medication deleted successfully');
        } else {
          throw new Error(response.error || 'Failed to delete medication');
        }
      } catch (error: any) {
        const deleteError = createMedicationError(
          'network',
          error.message || 'Failed to delete medication',
        );

        set((state) => ({
          errors: { ...state.errors, deleting: deleteError },
          loadingStates: { ...state.loadingStates, deleting: false },
        }));

        toast.error('Failed to delete medication');
        console.error('Error deleting medication:', error);
        throw error;
      }
    },

    logDose: async (data: DoseLogDto) => {
      const clientId = data.clientId || crypto.randomUUID();
      const now = new Date();
      const timestampStr =
        typeof data.timestamp === 'string' ? data.timestamp : data.timestamp.toISOString();

      // Optimistic update — immediately reflect in UI
      const optimisticLog: DoseLog = {
        id: clientId,
        medicationId: data.medicationId,
        timestamp: new Date(timestampStr),
        status: data.status,
        notes: data.notes,
        scheduledTime: data.scheduledTime,
        doseType: data.doseType,
        createdAt: now,
        updatedAt: now,
        _optimistic: true,
        _syncStatus: 'pending',
      };

      set((state) => ({
        doseLogs: [optimisticLog, ...state.doseLogs],
        loadingStates: { ...state.loadingStates, logging: true },
        errors: { ...state.errors, logging: null },
      }));

      // Persist to IndexedDB for offline resilience
      try {
        await offlineStorage.saveDoseLog({
          id: clientId,
          medication_id: data.medicationId,
          user_id: '',
          timestamp: timestampStr,
          status: data.status,
          scheduled_time: data.scheduledTime || null,
          notes: data.notes || null,
          dose_type: data.doseType || null,
          created_at: now.toISOString(),
          updated_at: now.toISOString(),
          _optimistic: true,
          _syncStatus: 'pending',
        });
      } catch {
        // IndexedDB unavailable — continue online-only
      }

      try {
        const doseData: CreateDoseLogDto = {
          medicationId: data.medicationId,
          status: data.status,
          timestamp: data.timestamp,
          scheduledTime: data.scheduledTime,
          notes: data.notes,
          doseType: data.doseType,
          clientId,
        };

        const response = await logDoseAction(doseData);

        if (response.success && response.doseLog) {
          const newLog = processDoseLog(response.doseLog);

          // Replace optimistic record with server-confirmed record
          set((state) => ({
            doseLogs: state.doseLogs.map((l) =>
              l.id === clientId ? { ...newLog, _optimistic: false, _syncStatus: 'synced' as const } : l,
            ),
            loadingStates: { ...state.loadingStates, logging: false },
          }));

          // Update IndexedDB
          try {
            await offlineStorage.deleteDoseLog(clientId);
            await offlineStorage.saveDoseLog({
              id: newLog.id,
              medication_id: newLog.medicationId,
              user_id: '',
              timestamp: newLog.timestamp.toISOString(),
              status: newLog.status,
              scheduled_time: newLog.scheduledTime || null,
              notes: newLog.notes || null,
              dose_type: newLog.doseType || null,
              created_at: newLog.createdAt.toISOString(),
              updated_at: newLog.updatedAt.toISOString(),
              _optimistic: false,
              _syncStatus: 'synced',
            });
          } catch {
            // IndexedDB unavailable
          }

          // Refresh related data
          const { fetchTodaySchedule, fetchAdherenceStats } = get();
          await Promise.all([fetchTodaySchedule(), fetchAdherenceStats()]);

          toast.success('Dose logged successfully');
          return newLog;
        } else {
          throw new Error(response.error || 'Failed to log dose');
        }
      } catch (error: any) {
        // Keep the optimistic record but mark as pending (will sync later)
        set((state) => ({
          doseLogs: state.doseLogs.map((l) =>
            l.id === clientId ? { ...l, _syncStatus: 'pending' as const } : l,
          ),
          loadingStates: { ...state.loadingStates, logging: false },
          errors: {
            ...state.errors,
            logging: createMedicationError('network', 'Failed to log dose'),
          },
        }));

        // Mark in IndexedDB as pending for background sync
        try {
          const cached = await offlineStorage.getDoseLog(clientId);
          if (cached) {
            await offlineStorage.saveDoseLog({ ...cached, _syncStatus: 'pending' });
          }
        } catch {
          // IndexedDB unavailable
        }

        toast.error('Dose salva localmente. Será sincronizada quando conectado.');
        console.error('Error logging dose:', error);
        // Don't rethrow — the optimistic log is preserved for later sync
        return optimisticLog;
      }
    },

    // Utility actions
    clearError: (key: string) => {
      set((state) => ({
        errors: { ...state.errors, [key]: null },
      }));
    },

    clearAllErrors: () => {
      set({ errors: {} });
    },

    resetStore: () => {
      set({
        medications: [],
        todaySchedule: [],
        doseLogs: [],
        adherenceStats: null,
        loadingStates: initialLoadingStates,
        errors: {},
      });
    },
  })),
);

// Export computed selectors for better performance
export const useMedicationSelectors = () => {
  const store = useMedicationStore();

  return {
    isLoading: Object.values(store.loadingStates).some(Boolean),
    hasErrors: Object.values(store.errors).some(Boolean),
    activeMedications: store.medications.filter((med) => !med.endDate || med.endDate > new Date()),
    totalMedications: store.medications.length,
  };
};
