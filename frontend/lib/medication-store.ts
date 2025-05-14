import { create } from 'zustand';
import { ApiClient } from './api-client';
import { toast } from 'sonner';
import { format } from 'date-fns';

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
  time: string;
  days: DayOfWeek[];
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
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateMedicationDto {
  name: string;
  dosage: string;
  form: string;
  startDate: Date | string;
  endDate?: Date | string;
  notes?: string;
  instructions?: string;
  schedule: ScheduleTime[];
}

export interface UpdateMedicationDto {
  name?: string;
  dosage?: string;
  form?: string;
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
  form: string;
  instructions?: string;
  time: string;
  scheduledTime: string;
}

export interface DoseLogDto {
  medicationId: string;
  status: 'taken' | 'skipped' | 'delayed';
  timestamp: Date | string;
  scheduledTime?: string;
  notes?: string;
}

export interface DoseLog {
  id: string;
  medicationId: string;
  timestamp: Date;
  status: 'taken' | 'skipped' | 'delayed';
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

interface MedicationStore {
  medications: Medication[];
  todaySchedule: ScheduleItem[];
  doseLogs: DoseLog[];
  adherenceStats: AdherenceStats | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  fetchMedications: () => Promise<void>;
  fetchTodaySchedule: () => Promise<void>;
  fetchDoseLogs: (medicationId?: string, startDate?: Date, endDate?: Date) => Promise<void>;
  fetchAdherenceStats: (medicationId?: string, daysBack?: number) => Promise<void>;
  createMedication: (data: CreateMedicationDto) => Promise<Medication>;
  updateMedication: (id: string, data: UpdateMedicationDto) => Promise<Medication>;
  deleteMedication: (id: string) => Promise<void>;
  logDose: (data: DoseLogDto) => Promise<DoseLog>;
}

export const useMedicationStore = create<MedicationStore>((set, get) => ({
  medications: [],
  todaySchedule: [],
  doseLogs: [],
  adherenceStats: null,
  isLoading: false,
  error: null,

  fetchMedications: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await ApiClient.get<Medication[]>('/medications');

      // Parse dates and normalize time formats in schedules
      const medications = response.map((med) => ({
        ...med,
        startDate: new Date(med.startDate),
        endDate: med.endDate ? new Date(med.endDate) : undefined,
        createdAt: new Date(med.createdAt),
        updatedAt: new Date(med.updatedAt),
        // Normalize schedule time format by removing seconds component
        schedule:
          med.schedule?.map((item) => ({
            ...item,
            time: item.time.substring(0, 5), // Extract only HH:MM part
          })) || [],
      }));

      set({ medications, isLoading: false });
    } catch (error) {
      set({ error: 'Failed to fetch medications', isLoading: false });
      toast.error('Failed to fetch your medications');
      console.error('Error fetching medications:', error);
    }
  },

  fetchTodaySchedule: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await ApiClient.get<ScheduleItem[]>('/medications/schedule/today');
      set({ todaySchedule: response, isLoading: false });
    } catch (error) {
      set({ error: "Failed to fetch today's schedule", isLoading: false });
      toast.error('Failed to fetch your schedule');
      console.error('Error fetching schedule:', error);
    }
  },

  fetchDoseLogs: async (
    medicationId?: string,
    startDate?: Date,
    endDate?: Date,
    daysBack?: number,
  ): Promise<void> => {
    try {
      set({ isLoading: true, error: null });

      let url = '/medications/logs/history';
      const params = new URLSearchParams();

      if (medicationId) {
        params.append('medicationId', medicationId);
      }

      // Either use explicit dates OR daysBack parameter
      if (startDate || endDate) {
        if (startDate) {
          params.append('startDate', format(startDate, 'yyyy-MM-dd'));
        }
        if (endDate) {
          params.append('endDate', format(endDate, 'yyyy-MM-dd'));
        }
      } else if (daysBack) {
        // Use the new daysBack parameter when no explicit dates
        params.append('daysBack', daysBack.toString());
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

  fetchAdherenceStats: async (medicationId?: string, daysBack: number = 30) => {
    set({ isLoading: true, error: null });
    try {
      let url = '/medications/stats/adherence';
      const params = new URLSearchParams();

      if (medicationId) params.append('medicationId', medicationId);
      if (daysBack) params.append('daysBack', daysBack.toString());

      if (params.toString()) {
        url += `?${params.toString()}`;
      }

      const response = await ApiClient.get<AdherenceStats>(url);
      set({ adherenceStats: response, isLoading: false });
    } catch (error) {
      set({ error: 'Failed to fetch adherence stats', isLoading: false });
      toast.error('Failed to fetch your adherence statistics');
      console.error('Error fetching adherence stats:', error);
    }
  },

  createMedication: async (data: CreateMedicationDto) => {
    set({ isLoading: true, error: null });
    try {
      // Format the data for API consumption
      const formattedData = {
        ...data,
        startDate: data.startDate instanceof Date ? data.startDate.toISOString() : data.startDate,
        endDate: data.endDate
          ? data.endDate instanceof Date
            ? data.endDate.toISOString()
            : data.endDate
          : undefined,
      };

      const response = await ApiClient.post<Medication>('/medications', formattedData);

      // Parse dates in the response
      const newMedication = {
        ...response,
        startDate: new Date(response.startDate),
        endDate: response.endDate ? new Date(response.endDate) : undefined,
        createdAt: new Date(response.createdAt),
        updatedAt: new Date(response.updatedAt),
      };

      // Update state with the new medication
      set({
        medications: [newMedication, ...get().medications],
        isLoading: false,
      });

      toast.success('Medication added successfully', {
        richColors: true,
      });
      return newMedication;
    } catch (error) {
      set({ error: 'Failed to create medication', isLoading: false });
      toast.error('Failed to add medication');
      console.error('Error creating medication:', error);
      throw error;
    }
  },

  updateMedication: async (id: string, data: UpdateMedicationDto) => {
    set({ isLoading: true, error: null });
    try {
      // Format date fields
      const formattedData: any = { ...data };

      if (formattedData.startDate) {
        formattedData.startDate =
          formattedData.startDate instanceof Date
            ? formattedData.startDate.toISOString()
            : formattedData.startDate;
      }

      if (formattedData.endDate !== undefined) {
        formattedData.endDate = formattedData.endDate
          ? formattedData.endDate instanceof Date
            ? formattedData.endDate.toISOString()
            : formattedData.endDate
          : null;
      }

      const response = await ApiClient.patch<Medication>(`/medications/${id}`, formattedData);

      // Parse dates in the response
      const updatedMedication = {
        ...response,
        startDate: new Date(response.startDate),
        endDate: response.endDate ? new Date(response.endDate) : undefined,
        createdAt: new Date(response.createdAt),
        updatedAt: new Date(response.updatedAt),
        // Normalize schedule time format
        schedule:
          response.schedule?.map((item) => ({
            ...item,
            time: item.time.substring(0, 5), // Extract only HH:MM part
          })) || [],
      };

      // Update medications array
      set({
        medications: get().medications.map((med) => (med.id === id ? updatedMedication : med)),
        isLoading: false,
      });

      toast.success('Medication updated successfully');
      return updatedMedication;
    } catch (error) {
      set({ error: 'Failed to update medication', isLoading: false });
      toast.error('Failed to update medication');
      console.error('Error updating medication:', error);
      throw error;
    }
  },

  deleteMedication: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      await ApiClient.delete(`/medications/${id}`);

      // Update state by removing the deleted medication
      set({
        medications: get().medications.filter((med) => med.id !== id),
        isLoading: false,
      });

      toast.success('Medication deleted successfully');
    } catch (error) {
      set({ error: 'Failed to delete medication', isLoading: false });
      toast.error('Failed to delete medication');
      console.error('Error deleting medication:', error);
      throw error;
    }
  },

  logDose: async (data: DoseLogDto) => {
    set({ isLoading: true, error: null });
    try {
      // Format timestamp if it's a Date object
      const formattedData = {
        ...data,
        timestamp: data.timestamp instanceof Date ? data.timestamp.toISOString() : data.timestamp,
      };

      const response = await ApiClient.post<DoseLog>('/medications/log-dose', formattedData);

      // Parse dates in the response
      const newLog = {
        ...response,
        timestamp: new Date(response.timestamp),
        createdAt: new Date(response.createdAt),
        updatedAt: new Date(response.updatedAt),
      };

      // Update today's schedule if applicable
      await get().fetchTodaySchedule();

      // Add the new log to the beginning of the dose logs array
      set({
        doseLogs: [newLog, ...get().doseLogs],
        isLoading: false,
      });

      toast.success('Dose logged successfully');
      return newLog;
    } catch (error) {
      set({ error: 'Failed to log dose', isLoading: false });
      toast.error('Failed to log dose');
      console.error('Error logging dose:', error);
      throw error;
    }
  },
}));
