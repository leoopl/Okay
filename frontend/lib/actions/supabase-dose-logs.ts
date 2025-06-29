'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import type { Database } from '@/lib/supabase/database.types';
import { startOfDay, endOfDay, subDays, format } from 'date-fns';

type DoseLog = Database['public']['Tables']['dose_logs']['Row'];
type DoseLogInsert = Database['public']['Tables']['dose_logs']['Insert'];
type DoseStatus = Database['public']['Enums']['dose_status'];
type DayOfWeek = Database['public']['Enums']['day_of_week'];

export interface DoseLogActionResponse {
  success: boolean;
  message?: string;
  error?: string;
  doseLog?: DoseLog;
  doseLogs?: DoseLog[];
}

export interface ScheduleItemResponse {
  medicationId: string;
  medicationName: string;
  dosage: string;
  form: string;
  instructions?: string;
  time: string;
  scheduledTime: string;
}

export interface TodayScheduleResponse {
  success: boolean;
  error?: string;
  schedule?: ScheduleItemResponse[];
}

export interface AdherenceStatsResponse {
  success: boolean;
  error?: string;
  stats?: {
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
  };
}

export interface CreateDoseLogDto {
  medicationId: string;
  status: DoseStatus;
  timestamp: Date | string;
  scheduledTime?: string;
  notes?: string;
}

export async function logDose(data: CreateDoseLogDto): Promise<DoseLogActionResponse> {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return { success: false, error: 'Você precisa estar logado para registrar doses' };
  }

  try {
    // Verify medication belongs to user
    const { data: medication, error: medError } = await supabase
      .from('medications')
      .select('id')
      .eq('id', data.medicationId)
      .eq('user_id', user.id)
      .single();

    if (medError || !medication) {
      return {
        success: false,
        error: 'Medicamento não encontrado',
      };
    }

    const doseLogData: DoseLogInsert = {
      medication_id: data.medicationId,
      user_id: user.id,
      timestamp: typeof data.timestamp === 'string' ? data.timestamp : data.timestamp.toISOString(),
      status: data.status,
      scheduled_time: data.scheduledTime || null,
      notes: data.notes || null,
    };

    const { data: doseLog, error } = await supabase
      .from('dose_logs')
      .insert(doseLogData)
      .select()
      .single();

    if (error) {
      console.error('Error logging dose:', error);
      return {
        success: false,
        error: 'Erro ao registrar dose',
      };
    }

    revalidatePath('/medications');
    return {
      success: true,
      message: 'Dose registrada com sucesso',
      doseLog,
    };
  } catch (error) {
    console.error('Error logging dose:', error);
    return {
      success: false,
      error: 'Ocorreu um erro ao registrar a dose',
    };
  }
}

export async function getDoseLogs(
  medicationId?: string,
  startDate?: Date,
  endDate?: Date,
  daysBack?: number,
): Promise<DoseLogActionResponse> {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return { success: false, error: 'Você precisa estar logado' };
  }

  try {
    let query = supabase
      .from('dose_logs')
      .select('*')
      .eq('user_id', user.id)
      .order('timestamp', { ascending: false });

    if (medicationId) {
      query = query.eq('medication_id', medicationId);
    }

    // Date filtering with proper timezone handling
    if (startDate && endDate) {
      query = query
        .gte('timestamp', startOfDay(startDate).toISOString())
        .lte('timestamp', endOfDay(endDate).toISOString());
    } else if (daysBack) {
      const start = startOfDay(subDays(new Date(), daysBack - 1));
      query = query.gte('timestamp', start.toISOString());
    }

    const { data: doseLogs, error } = await query;

    if (error) {
      console.error('Error fetching dose logs:', error);
      return {
        success: false,
        error: 'Erro ao buscar histórico de doses',
      };
    }

    return {
      success: true,
      doseLogs: doseLogs || [],
    };
  } catch (error) {
    console.error('Error fetching dose logs:', error);
    return {
      success: false,
      error: 'Ocorreu um erro ao buscar o histórico',
    };
  }
}

export async function getTodaySchedule(): Promise<TodayScheduleResponse> {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return { success: false, error: 'Você precisa estar logado' };
  }

  try {
    // Get current day of week
    const today = new Date();
    const dayOfWeek = format(today, 'EEEE').toLowerCase() as DayOfWeek;

    // Fetch active medications with schedules for today
    const { data: medications, error } = await supabase
      .from('medications')
      .select(
        `
        id,
        name,
        dosage,
        form,
        instructions,
        schedule_times!inner (
          id,
          time,
          days
        )
      `,
      )
      .eq('user_id', user.id)
      .or(`end_date.is.null,end_date.gte.${format(today, 'yyyy-MM-dd')}`)
      .lte('start_date', format(today, 'yyyy-MM-dd'));

    if (error) {
      console.error('Error fetching today schedule:', error);
      return {
        success: false,
        error: 'Erro ao buscar agenda de hoje',
      };
    }

    // Filter schedules for today and check if already logged (any status)
    const todayStart = startOfDay(today);
    const todayEnd = endOfDay(today);

    // Get today's dose logs to filter out already logged medications (all statuses)
    const { data: todayLogs } = await supabase
      .from('dose_logs')
      .select('medication_id, scheduled_time, status')
      .eq('user_id', user.id)
      .gte('timestamp', todayStart.toISOString())
      .lte('timestamp', todayEnd.toISOString());

    const loggedMap = new Map(
      todayLogs?.map((log) => [`${log.medication_id}-${log.scheduled_time}`, true]) || [],
    );

    const schedule: ScheduleItemResponse[] = [];

    medications?.forEach((med) => {
      med.schedule_times?.forEach((scheduleTime: any) => {
        if (scheduleTime.days.includes(dayOfWeek)) {
          const key = `${med.id}-${scheduleTime.time}`;
          if (!loggedMap.has(key)) {
            schedule.push({
              medicationId: med.id,
              medicationName: med.name,
              dosage: med.dosage,
              form: med.form,
              instructions: med.instructions || undefined,
              time: scheduleTime.time,
              scheduledTime: scheduleTime.time,
            });
          }
        }
      });
    });

    // Sort by time
    schedule.sort((a, b) => a.time.localeCompare(b.time));

    return {
      success: true,
      schedule,
    };
  } catch (error) {
    console.error('Error fetching today schedule:', error);
    return {
      success: false,
      error: 'Ocorreu um erro ao buscar a agenda',
    };
  }
}

export async function getAdherenceStats(
  medicationId?: string,
  daysBack: number = 7,
): Promise<AdherenceStatsResponse> {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return { success: false, error: 'Você precisa estar logado' };
  }

  try {
    const endDate = endOfDay(new Date());
    const startDate = startOfDay(subDays(endDate, daysBack - 1));

    let query = supabase
      .from('dose_logs')
      .select('status')
      .eq('user_id', user.id)
      .gte('timestamp', startDate.toISOString())
      .lte('timestamp', endDate.toISOString());

    if (medicationId) {
      query = query.eq('medication_id', medicationId);
    }

    const { data: logs, error } = await query;

    if (error) {
      console.error('Error fetching adherence stats:', error);
      return {
        success: false,
        error: 'Erro ao calcular estatísticas',
      };
    }

    // Calculate stats
    const total = logs?.length || 0;
    const taken = logs?.filter((log) => log.status === 'taken').length || 0;
    const skipped = logs?.filter((log) => log.status === 'skipped').length || 0;
    const delayed = logs?.filter((log) => log.status === 'delayed').length || 0;
    const adherenceRate = total > 0 ? Math.round((taken / total) * 100) : 0;

    return {
      success: true,
      stats: {
        adherenceRate,
        total,
        taken,
        skipped,
        delayed,
        period: {
          startDate: format(startDate, 'yyyy-MM-dd'),
          endDate: format(endDate, 'yyyy-MM-dd'),
          days: daysBack,
        },
      },
    };
  } catch (error) {
    console.error('Error calculating adherence stats:', error);
    return {
      success: false,
      error: 'Ocorreu um erro ao calcular as estatísticas',
    };
  }
}
