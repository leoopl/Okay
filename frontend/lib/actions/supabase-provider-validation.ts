'use server';

import { revalidatePath } from 'next/cache';
import {
  createClient,
  getAuthenticatedUser,
  getUserWithRolesAndPermissions,
  logAuditTrail,
} from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  ValidationRequestSchema,
  type ValidationRequestInput,
} from '@/lib/schemas/provider-schemas';
import type { Tables } from '@/lib/supabase/database.types';

type ValidationRequest = Tables<'provider_validation_requests'>;

export type ProviderValidationResponse = {
  success: boolean;
  message?: string;
  errors?: Record<string, string[]>;
};

export async function submitValidationRequest(
  input: ValidationRequestInput,
): Promise<ProviderValidationResponse> {
  const user = await getAuthenticatedUser();
  if (!user) return { success: false, message: 'Não autenticado' };

  const parsed = ValidationRequestSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, errors: parsed.error.flatten().fieldErrors };
  }
  const data = parsed.data;

  const supabase = await createClient();
  const { data: existing, error: existingErr } = await supabase
    .from('provider_validation_requests')
    .select('id, status')
    .eq('user_id', user.id)
    .eq('status', 'pending')
    .maybeSingle();
  if (existingErr) {
    console.error('Error checking existing validation request:', existingErr);
    return { success: false, message: 'Erro ao verificar solicitação existente' };
  }
  if (existing) {
    return { success: false, message: 'Você já possui uma solicitação pendente' };
  }

  const { data: inserted, error } = await supabase
    .from('provider_validation_requests')
    .insert({
      user_id: user.id,
      council_type: data.council_type,
      council_state: data.council_state,
      council_number: data.council_number,
      full_name: data.full_name,
      specialty: data.specialty ?? null,
      bio: data.bio ?? null,
      document_path: data.document_path ?? null,
    })
    .select('id')
    .single();

  if (error || !inserted) {
    console.error('Error submitting validation request:', error);
    return { success: false, message: 'Erro ao enviar solicitação' };
  }

  await logAuditTrail({
    action: 'provider_validation_requested',
    resource: 'provider_validation_request',
    resourceId: inserted.id,
    details: { council_type: data.council_type, council_state: data.council_state },
  });

  revalidatePath('/profile/professional');
  return { success: true, message: 'Solicitação enviada para análise' };
}

export async function getMyValidationRequest(): Promise<ValidationRequest | null> {
  const user = await getAuthenticatedUser();
  if (!user) return null;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('provider_validation_requests')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error('Error fetching validation request:', error);
    return null;
  }
  return data;
}

export async function listValidationRequests(
  status: 'pending' | 'approved' | 'rejected' | 'all' = 'all',
): Promise<{ data: ValidationRequest[]; error?: string }> {
  const userData = await getUserWithRolesAndPermissions();
  if (!userData || !userData.hasRole('admin')) {
    return { data: [], error: 'Acesso negado' };
  }

  const supabase = await createClient();
  let query = supabase
    .from('provider_validation_requests')
    .select('*')
    .order('created_at', { ascending: false });
  if (status !== 'all') query = query.eq('status', status);

  const { data, error } = await query;
  if (error) {
    console.error('Error listing validation requests:', error);
    return { data: [], error: 'Erro ao carregar solicitações' };
  }
  return { data: data ?? [] };
}

export async function approveRequest(requestId: string): Promise<ProviderValidationResponse> {
  const userData = await getUserWithRolesAndPermissions();
  if (!userData || !userData.hasRole('admin')) {
    return { success: false, message: 'Acesso negado' };
  }

  // W4 PREFLIGHT: assert env var BEFORE any DB mutation. The role swap depends on
  // being able to invalidate the user's session afterwards; without the service-role
  // key we'd commit the swap and leave the user with a stale JWT silently.
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return {
      success: false,
      message: 'Servidor mal configurado: SUPABASE_SERVICE_ROLE_KEY ausente',
    };
  }

  const supabase = await createClient();

  // Look up the request
  const { data: request, error: fetchErr } = await supabase
    .from('provider_validation_requests')
    .select('id, user_id, status')
    .eq('id', requestId)
    .single();
  if (fetchErr || !request) {
    return { success: false, message: 'Solicitação não encontrada' };
  }
  if (request.status !== 'pending') {
    return { success: false, message: 'Solicitação já foi processada' };
  }

  // 1. Mark approved
  const { error: updErr } = await supabase
    .from('provider_validation_requests')
    .update({
      status: 'approved',
      reviewed_by: userData.user.id,
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', requestId);
  if (updErr) {
    console.error('Error approving validation request:', updErr);
    return { success: false, message: 'Erro ao aprovar solicitação' };
  }

  // 2. Atomic role switch via RPC (RPC owns role_removed/role_assigned + cleanup audits)
  const { error: rpcErr } = await supabase.rpc('replace_user_role', {
    p_target_user_id: request.user_id,
    p_new_role_name: 'healthcare_provider',
  });
  if (rpcErr) {
    console.error('Error swapping role:', rpcErr);
    // Roll back the request status update so admin can retry
    await supabase
      .from('provider_validation_requests')
      .update({ status: 'pending', reviewed_by: null, reviewed_at: null })
      .eq('id', requestId);
    return { success: false, message: 'Erro ao alterar a função do usuário' };
  }

  // 3. Invalidate the user's existing sessions so the new role takes effect on next request
  try {
    const admin = createAdminClient();
    await admin.auth.admin.signOut(request.user_id, 'global');
  } catch (signOutErr) {
    // Non-fatal: role switch already committed. User sees the "entre novamente" banner
    // when their stale JWT eventually fails an RLS check.
    console.error('Failed to invalidate user sessions after role switch:', signOutErr);
  }

  // 4. W2 contract: only emit our own domain audit value here (RPC emits role_*)
  await logAuditTrail({
    action: 'provider_validation_approved',
    resource: 'provider_validation_request',
    resourceId: requestId,
    details: { user_id: request.user_id },
  });

  revalidatePath('/admin/provider-validations');
  revalidatePath('/profile/professional');
  return { success: true, message: 'Solicitação aprovada' };
}

export async function rejectRequest(
  requestId: string,
  reason: string,
): Promise<ProviderValidationResponse> {
  const userData = await getUserWithRolesAndPermissions();
  if (!userData || !userData.hasRole('admin')) {
    return { success: false, message: 'Acesso negado' };
  }
  const trimmed = reason?.trim();
  if (!trimmed) {
    return { success: false, message: 'Motivo da rejeição é obrigatório' };
  }

  const supabase = await createClient();
  const { data: request, error: fetchErr } = await supabase
    .from('provider_validation_requests')
    .select('id, user_id, status')
    .eq('id', requestId)
    .single();
  if (fetchErr || !request) {
    return { success: false, message: 'Solicitação não encontrada' };
  }
  if (request.status !== 'pending') {
    return { success: false, message: 'Solicitação já foi processada' };
  }

  const { error } = await supabase
    .from('provider_validation_requests')
    .update({
      status: 'rejected',
      reviewed_by: userData.user.id,
      reviewed_at: new Date().toISOString(),
      rejection_reason: trimmed,
    })
    .eq('id', requestId);

  if (error) {
    console.error('Error rejecting validation request:', error);
    return { success: false, message: 'Erro ao rejeitar solicitação' };
  }

  await logAuditTrail({
    action: 'provider_validation_rejected',
    resource: 'provider_validation_request',
    resourceId: requestId,
    details: { user_id: request.user_id, reason: trimmed },
  });

  revalidatePath('/admin/provider-validations');
  revalidatePath('/profile/professional');
  return { success: true, message: 'Solicitação rejeitada' };
}
