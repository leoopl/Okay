import { create } from 'zustand';
import { ApiClient } from './api-client';
import { format, parseISO } from 'date-fns';

// Define enum type for better type checking
export enum DayOfWeek {
  MONDAY = 'Monday',
  TUESDAY = 'Tuesday',
  WEDNESDAY = 'Wednesday',
  THURSDAY = 'Thursday',
  FRIDAY = 'Friday',
  SATURDAY = 'Saturday',
  SUNDAY = 'Sunday',
}

export interface ScheduleTime {
  id?: string;
  time: string; // HH:MM format
  days: DayOfWeek[]; // Days of the week this time applies to
}

export interface DoseLog {
  id?: string;
  medicationId: string;
  timestamp: Date;
  status: 'taken' | 'skipped' | 'delayed';
  notes?: string;
  scheduledTime?: string;
}

export interface Medication {
  id: string;
  name: string;
  dosage: string;
  form: string;
  startDate: Date;
  endDate?: Date;
  notes?: string;
  instructions?: string;
  schedule: ScheduleTime[];
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

export interface ScheduleItem {
  medicationId: string;
  medicationName: string;
  dosage: string;
  form: string;
  instructions?: string;
  time: string;
  scheduledTime: string;
}

interface MedicationState {
  medications: Medication[];
  doseLogs: DoseLog[];
  todaySchedule: ScheduleItem[];
  adherenceStats: AdherenceStats | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  fetchMedications: () => Promise<void>;
  fetchTodaySchedule: () => Promise<void>;
  fetchDoseLogs: (medicationId?: string, startDate?: Date, endDate?: Date) => Promise<void>;
  fetchAdherenceStats: (medicationId?: string, daysBack?: number) => Promise<void>;
  createMedication: (medication: Omit<Medication, 'id'>) => Promise<void>;
  updateMedication: (id: string, medication: Partial<Medication>) => Promise<void>;
  deleteMedication: (id: string) => Promise<void>;
  logDose: (log: Omit<DoseLog, 'id'>) => Promise<void>;
}

export const useMedicationStore = create<MedicationState>((set, get) => ({
  medications: [],
  doseLogs: [],
  todaySchedule: [],
  adherenceStats: null,
  isLoading: false,
  error: null,

  fetchMedications: async (): Promise<void> => {
    try {
      set({ isLoading: true, error: null });
      const medications = await ApiClient.get<Medication[]>('/medications');

      // Convert date strings to Date objects
      const formattedMedications = medications.map((med: Medication) => ({
        ...med,
        startDate: new Date(med.startDate),
        endDate: med.endDate ? new Date(med.endDate) : undefined,
      }));

      set({ medications: formattedMedications, isLoading: false });
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      console.error('Error fetching medications:', error);
    }
  },

  fetchTodaySchedule: async (): Promise<void> => {
    try {
      set({ isLoading: true, error: null });
      const schedule = await ApiClient.get<ScheduleItem[]>('/medications/schedule/today');
      set({ todaySchedule: schedule, isLoading: false });
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      console.error("Error fetching today's schedule:", error);
    }
  },

  fetchDoseLogs: async (medicationId?: string, startDate?: Date, endDate?: Date): Promise<void> => {
    try {
      set({ isLoading: true, error: null });

      let url = '/medications/logs/history';
      const params = new URLSearchParams();

      if (medicationId) {
        params.append('medicationId', medicationId);
      }

      if (startDate) {
        params.append('startDate', format(startDate, 'yyyy-MM-dd'));
      }

      if (endDate) {
        params.append('endDate', format(endDate, 'yyyy-MM-dd'));
      }

      const queryString = params.toString();
      if (queryString) {
        url += `?${queryString}`;
      }

      const logs = await ApiClient.get<DoseLog[]>(url);

      // Convert date strings to Date objects
      const formattedLogs = logs.map((log: DoseLog) => ({
        ...log,
        timestamp: new Date(log.timestamp),
      }));

      set({ doseLogs: formattedLogs, isLoading: false });
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      console.error('Error fetching dose logs:', error);
    }
  },

  fetchAdherenceStats: async (medicationId?: string, daysBack: number = 30): Promise<void> => {
    try {
      set({ isLoading: true, error: null });

      let url = '/medications/stats/adherence';
      const params = new URLSearchParams();

      if (medicationId) {
        params.append('medicationId', medicationId);
      }

      params.append('daysBack', daysBack.toString());

      const stats = await ApiClient.get<AdherenceStats>(`${url}?${params.toString()}`);
      set({ adherenceStats: stats, isLoading: false });
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      console.error('Error fetching adherence stats:', error);
    }
  },

  createMedication: async (medication: Omit<Medication, 'id'>): Promise<void> => {
    try {
      set({ isLoading: true, error: null });

      // Format dates for API
      const formattedMedication = {
        name: medication.name,
        dosage: medication.dosage,
        form: medication.form,
        startDate:
          typeof medication.startDate === 'string'
            ? medication.startDate
            : medication.startDate.toISOString(),
        endDate: medication.endDate
          ? typeof medication.endDate === 'string'
            ? medication.endDate
            : medication.endDate.toISOString()
          : undefined,
        notes: medication.notes,
        instructions: medication.instructions,
        // Ensure schedule is properly formatted
        schedule: medication.schedule.map((item) => ({
          time: item.time,
          days: item.days, // Send days as strings that match expected enum values
        })),
      };

      console.log('Sending medication data:', JSON.stringify(formattedMedication));

      const newMedication = await ApiClient.post<Medication>('/medications', formattedMedication);

      // Convert date strings back to Date objects
      const formattedNewMedication = {
        ...newMedication,
        startDate: new Date(newMedication.startDate),
        endDate: newMedication.endDate ? new Date(newMedication.endDate) : undefined,
      };

      set((state) => ({
        medications: [...state.medications, formattedNewMedication],
        isLoading: false,
      }));

      // Refresh schedule
      get().fetchTodaySchedule();
    } catch (error: any) {
      console.error('Error creating medication:', error);
      set({ error: error.message, isLoading: false });
    }
  },

  updateMedication: async (id: string, medication: Partial<Medication>): Promise<void> => {
    try {
      set({ isLoading: true, error: null });

      console.log('STORE: Original medication update data:', JSON.stringify(medication));
      console.log('STORE: Update includes schedule?', medication.schedule !== undefined);

      // Format dates for API
      const formattedMedication = {
        ...medication,
        startDate: medication.startDate
          ? typeof medication.startDate === 'string'
            ? medication.startDate
            : medication.startDate.toISOString()
          : undefined,
        endDate: medication.endDate
          ? typeof medication.endDate === 'string'
            ? medication.endDate
            : medication.endDate.toISOString()
          : undefined,
        // Ensure schedule is properly formatted if present (matching createMedication logic)
        schedule: medication.schedule
          ? medication.schedule.map((item) => ({
              time: item.time,
              days: item.days, // Send days exactly as they are
            }))
          : undefined,
      };

      console.log(
        'STORE: Formatted medication data being sent to API:',
        JSON.stringify(formattedMedication),
      );

      const updatedMedication = await ApiClient.patch<Medication>(
        `/medications/${id}`,
        formattedMedication,
      );

      console.log('STORE: Response from API after update:', JSON.stringify(updatedMedication));

      // Convert date strings back to Date objects
      const formattedUpdatedMedication = {
        ...updatedMedication,
        startDate: new Date(updatedMedication.startDate),
        endDate: updatedMedication.endDate ? new Date(updatedMedication.endDate) : undefined,
      };

      set((state) => ({
        medications: state.medications.map((med) =>
          med.id === id ? formattedUpdatedMedication : med,
        ),
        isLoading: false,
      }));

      // Refresh schedule
      get().fetchTodaySchedule();
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      console.error('Error updating medication:', error);
    }
  },

  deleteMedication: async (id: string): Promise<void> => {
    try {
      set({ isLoading: true, error: null });
      await ApiClient.delete(`/medications/${id}`);

      set((state) => ({
        medications: state.medications.filter((med) => med.id !== id),
        isLoading: false,
      }));

      // Refresh schedule
      get().fetchTodaySchedule();
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      console.error('Error deleting medication:', error);
    }
  },

  logDose: async (log: Omit<DoseLog, 'id'>): Promise<void> => {
    try {
      set({ isLoading: true, error: null });

      // Format timestamp for API
      const formattedLog = {
        ...log,
        timestamp: log.timestamp.toISOString(),
      };

      const newLog = await ApiClient.post<DoseLog>('/medications/log-dose', formattedLog);

      // Convert date string back to Date object
      const formattedNewLog = {
        ...newLog,
        timestamp: new Date(newLog.timestamp),
      };

      set((state) => ({
        doseLogs: [formattedNewLog, ...state.doseLogs],
        isLoading: false,
      }));

      // Refresh schedule and stats
      get().fetchTodaySchedule();
      get().fetchAdherenceStats();
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      console.error('Error logging dose:', error);
    }
  },
}));
