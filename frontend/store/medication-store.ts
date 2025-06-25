import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { toast } from 'sonner';
import { format, isValid } from 'date-fns';
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
}

export interface DoseLog {
  id: string;
  medicationId: string;
  timestamp: Date;
  status: DoseStatus;
  notes?: string;
  scheduledTime?: string;
  createdAt: Date;
  updatedAt: Date;
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

const formatDateForApi = (date: Date | string | undefined): string | undefined => {
  if (!date) return undefined;
  const parsed = typeof date === 'string' ? new Date(date) : date;
  return isValid(parsed) ? format(parsed, DATE_FORMAT) : undefined;
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
      set((state) => ({
        loadingStates: { ...state.loadingStates, creating: true },
        errors: { ...state.errors, creating: null },
      }));

      try {
        // Convert to Supabase format with lowercase enum values
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
            days: s.days as any, // Database expects lowercase day_of_week enum
          })),
        };

        const response = await createMedicationAction(supabaseData);

        if (response.success && response.medication) {
          const newMedication = processMedicationDates(response.medication);

          set((state) => ({
            medications: [newMedication, ...state.medications],
            loadingStates: { ...state.loadingStates, creating: false },
          }));

          toast.success('Medication added successfully', { richColors: true });
          return newMedication;
        } else {
          throw new Error(response.error || 'Failed to create medication');
        }
      } catch (error: any) {
        const createError = createMedicationError(
          'network',
          error.message || 'Failed to create medication',
        );

        set((state) => ({
          errors: { ...state.errors, creating: createError },
          loadingStates: { ...state.loadingStates, creating: false },
        }));

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
      set((state) => ({
        loadingStates: { ...state.loadingStates, logging: true },
        errors: { ...state.errors, logging: null },
      }));

      try {
        const doseData: CreateDoseLogDto = {
          medicationId: data.medicationId,
          status: data.status,
          timestamp: data.timestamp,
          scheduledTime: data.scheduledTime,
          notes: data.notes,
        };

        const response = await logDoseAction(doseData);

        if (response.success && response.doseLog) {
          const newLog = processDoseLog(response.doseLog);

          // Optimistically update related data
          const { fetchTodaySchedule, fetchAdherenceStats } = get();
          await Promise.all([fetchTodaySchedule(), fetchAdherenceStats()]);

          set((state) => ({
            doseLogs: [newLog, ...state.doseLogs],
            loadingStates: { ...state.loadingStates, logging: false },
          }));

          toast.success('Dose logged successfully');
          return newLog;
        } else {
          throw new Error(response.error || 'Failed to log dose');
        }
      } catch (error: any) {
        const logError = createMedicationError('network', 'Failed to log dose');

        set((state) => ({
          errors: { ...state.errors, logging: logError },
          loadingStates: { ...state.loadingStates, logging: false },
        }));

        toast.error('Failed to log dose');
        console.error('Error logging dose:', error);
        throw error;
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
