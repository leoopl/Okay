'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import type { Database } from '@/lib/supabase/types';

type Medication = Database['public']['Tables']['medications']['Row'];
type MedicationInsert = Database['public']['Tables']['medications']['Insert'];
type MedicationUpdate = Database['public']['Tables']['medications']['Update'];
type MedicationForm = Database['public']['Enums']['medication_form'];

export interface MedicationActionResponse {
  success: boolean;
  message?: string;
  error?: string;
  medication?: Medication;
  medications?: Medication[];
}

export interface ScheduleTime {
  id?: string;
  time: string;
  days: string[];
}

export interface CreateMedicationDto {
  name: string;
  dosage: string;
  form: MedicationForm;
  startDate: Date | string;
  endDate?: Date | string;
  notes?: string;
  instructions?: string;
  schedule?: ScheduleTime[];
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

export async function getMedications(): Promise<MedicationActionResponse> {
  const supabase = await createClient();

  // Get current user
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.user) {
    return { success: false, error: 'Você precisa estar logado para visualizar medicamentos' };
  }

  try {
    const { data: medications, error } = await supabase
      .from('medications')
      .select('*')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching medications:', error);
      return {
        success: false,
        error: 'Erro ao buscar medicamentos',
      };
    }

    return {
      success: true,
      medications: medications || [],
    };
  } catch (error) {
    console.error('Error fetching medications:', error);
    return {
      success: false,
      error: 'Ocorreu um erro ao buscar os medicamentos. Tente novamente mais tarde.',
    };
  }
}

export async function createMedication(
  data: CreateMedicationDto,
): Promise<MedicationActionResponse> {
  const supabase = await createClient();

  // Get current user
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.user) {
    return { success: false, error: 'Você precisa estar logado para criar medicamentos' };
  }

  try {
    // Prepare medication data
    const medicationData: MedicationInsert = {
      user_id: session.user.id,
      name: data.name,
      dosage: data.dosage,
      form: data.form,
      start_date:
        typeof data.startDate === 'string'
          ? data.startDate
          : data.startDate.toISOString().split('T')[0],
      end_date: data.endDate
        ? typeof data.endDate === 'string'
          ? data.endDate
          : data.endDate.toISOString().split('T')[0]
        : null,
      notes: data.notes || null,
      instructions: data.instructions || null,
    };

    // Insert medication
    const { data: medication, error } = await supabase
      .from('medications')
      .insert(medicationData)
      .select()
      .single();

    if (error) {
      console.error('Error creating medication:', error);
      return {
        success: false,
        error: 'Erro ao criar medicamento',
      };
    }

    revalidatePath('/medications');
    return {
      success: true,
      message: 'Medicamento criado com sucesso',
      medication,
    };
  } catch (error) {
    console.error('Error creating medication:', error);
    return {
      success: false,
      error: 'Ocorreu um erro ao criar o medicamento. Tente novamente mais tarde.',
    };
  }
}

export async function updateMedication(
  medicationId: string,
  data: UpdateMedicationDto,
): Promise<MedicationActionResponse> {
  const supabase = await createClient();

  // Get current user
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.user) {
    return { success: false, error: 'Você precisa estar logado para atualizar medicamentos' };
  }

  try {
    // First, verify the medication belongs to the user
    const { data: existingMedication, error: fetchError } = await supabase
      .from('medications')
      .select('*')
      .eq('id', medicationId)
      .eq('user_id', session.user.id)
      .single();

    if (fetchError || !existingMedication) {
      return {
        success: false,
        error: 'Medicamento não encontrado ou você não tem permissão para editá-lo',
      };
    }

    // Prepare update data
    const updateData: MedicationUpdate = {
      updated_at: new Date().toISOString(),
    };

    if (data.name !== undefined) updateData.name = data.name;
    if (data.dosage !== undefined) updateData.dosage = data.dosage;
    if (data.form !== undefined) updateData.form = data.form;
    if (data.startDate !== undefined) {
      updateData.start_date =
        typeof data.startDate === 'string'
          ? data.startDate
          : data.startDate.toISOString().split('T')[0];
    }
    if (data.endDate !== undefined) {
      updateData.end_date = data.endDate
        ? typeof data.endDate === 'string'
          ? data.endDate
          : data.endDate.toISOString().split('T')[0]
        : null;
    }
    if (data.notes !== undefined) updateData.notes = data.notes || null;
    if (data.instructions !== undefined) updateData.instructions = data.instructions || null;

    // Update medication
    const { data: medication, error } = await supabase
      .from('medications')
      .update(updateData)
      .eq('id', medicationId)
      .eq('user_id', session.user.id)
      .select()
      .single();

    if (error) {
      console.error('Error updating medication:', error);
      return {
        success: false,
        error: 'Erro ao atualizar medicamento',
      };
    }

    revalidatePath('/medications');
    return {
      success: true,
      message: 'Medicamento atualizado com sucesso',
      medication,
    };
  } catch (error) {
    console.error('Error updating medication:', error);
    return {
      success: false,
      error: 'Ocorreu um erro ao atualizar o medicamento. Tente novamente mais tarde.',
    };
  }
}

export async function deleteMedication(medicationId: string): Promise<MedicationActionResponse> {
  const supabase = await createClient();

  // Get current user
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.user) {
    return { success: false, error: 'Você precisa estar logado para deletar medicamentos' };
  }

  try {
    // Delete medication (with user verification)
    const { error } = await supabase
      .from('medications')
      .delete()
      .eq('id', medicationId)
      .eq('user_id', session.user.id);

    if (error) {
      console.error('Error deleting medication:', error);
      return {
        success: false,
        error: 'Erro ao deletar medicamento',
      };
    }

    revalidatePath('/medications');
    return {
      success: true,
      message: 'Medicamento deletado com sucesso',
    };
  } catch (error) {
    console.error('Error deleting medication:', error);
    return {
      success: false,
      error: 'Ocorreu um erro ao deletar o medicamento. Tente novamente mais tarde.',
    };
  }
}

export async function getMedication(medicationId: string): Promise<MedicationActionResponse> {
  const supabase = await createClient();

  // Get current user
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.user) {
    return { success: false, error: 'Você precisa estar logado para visualizar o medicamento' };
  }

  try {
    const { data: medication, error } = await supabase
      .from('medications')
      .select('*')
      .eq('id', medicationId)
      .eq('user_id', session.user.id)
      .single();

    if (error || !medication) {
      return {
        success: false,
        error: 'Medicamento não encontrado ou você não tem permissão para visualizá-lo',
      };
    }

    return {
      success: true,
      medication,
    };
  } catch (error) {
    console.error('Error fetching medication:', error);
    return {
      success: false,
      error: 'Ocorreu um erro ao buscar o medicamento. Tente novamente mais tarde.',
    };
  }
}
