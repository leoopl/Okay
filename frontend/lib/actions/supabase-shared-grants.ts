'use server';

import { revalidatePath } from 'next/cache';
import {
  createClient,
  getAuthenticatedUser,
  logAuditTrail,
} from '@/lib/supabase/server';
import { GrantResourceSchema } from '@/lib/schemas/provider-schemas';
import type { Tables } from '@/lib/supabase/database.types';
import type { SharedResourceType } from '@/lib/schemas/provider-schemas';

export type SharedResourceGrant = Tables<'shared_resource_grants'>;

export type GrantResult = {
  success: boolean;
  message?: string;
};

/**
 * Patient grants the calling provider access to a resource type. Only the patient on
 * the connection can grant. RLS enforces this; we also check explicitly for friendly
 * errors.
 */
export async function grantResource(input: {
  connection_id: string;
  resource_type: SharedResourceType;
}): Promise<GrantResult> {
  const user = await getAuthenticatedUser();
  if (!user) return { success: false, message: 'Não autenticado' };

  const parsed = GrantResourceSchema.safeParse(input);
  if (!parsed.success) {
    const first = Object.values(parsed.error.flatten().fieldErrors).flat()[0];
    return { success: false, message: first ?? 'Dados inválidos' };
  }

  const supabase = await createClient();

  // Verify the connection exists, the user is the patient, and it's active.
  const { data: connection, error: connErr } = await supabase
    .from('patient_provider_connections')
    .select('id, patient_id, status')
    .eq('id', parsed.data.connection_id)
    .maybeSingle();

  if (connErr || !connection) {
    return { success: false, message: 'Conexão não encontrada' };
  }
  if (connection.patient_id !== user.id) {
    return { success: false, message: 'Apenas o paciente pode compartilhar recursos' };
  }
  if (connection.status !== 'active') {
    return { success: false, message: 'A conexão precisa estar ativa para compartilhar recursos' };
  }

  // Insert grant; unique partial index prevents double-active rows for the same
  // (connection_id, resource_type).
  const { error: insertErr } = await supabase.from('shared_resource_grants').insert({
    connection_id: parsed.data.connection_id,
    resource_type: parsed.data.resource_type,
  });

  if (insertErr) {
    if (insertErr.code === '23505') {
      // Active grant already exists — idempotent success
      return { success: true, message: 'Recurso já compartilhado' };
    }
    console.error('Grant insert failed:', insertErr);
    return { success: false, message: 'Erro ao compartilhar recurso' };
  }

  await logAuditTrail({
    action: 'resource_shared',
    resource: 'shared_resource_grant',
    resourceId: parsed.data.connection_id,
    details: { resource_type: parsed.data.resource_type },
  });

  revalidatePath('/connections');
  revalidatePath('/patients');
  return { success: true, message: 'Recurso compartilhado' };
}

/**
 * Patient revokes a previously-granted resource. RLS narrow-update policy enforces
 * revoked_at IS NULL → revoked_at IS NOT NULL only (no un-revoke).
 */
export async function revokeResource(input: {
  connection_id: string;
  resource_type: SharedResourceType;
}): Promise<GrantResult> {
  const user = await getAuthenticatedUser();
  if (!user) return { success: false, message: 'Não autenticado' };

  const parsed = GrantResourceSchema.safeParse(input);
  if (!parsed.success) {
    const first = Object.values(parsed.error.flatten().fieldErrors).flat()[0];
    return { success: false, message: first ?? 'Dados inválidos' };
  }

  const supabase = await createClient();

  // Find the active grant
  const { data: grant, error: findErr } = await supabase
    .from('shared_resource_grants')
    .select('id, connection_id, resource_type, revoked_at')
    .eq('connection_id', parsed.data.connection_id)
    .eq('resource_type', parsed.data.resource_type)
    .is('revoked_at', null)
    .maybeSingle();

  if (findErr) {
    console.error('Grant lookup failed:', findErr);
    return { success: false, message: 'Erro ao localizar concessão' };
  }
  if (!grant) {
    return { success: false, message: 'Nenhum compartilhamento ativo encontrado' };
  }

  const { error: updErr } = await supabase
    .from('shared_resource_grants')
    .update({ revoked_at: new Date().toISOString(), revoked_by: user.id })
    .eq('id', grant.id);

  if (updErr) {
    console.error('Grant revoke failed:', updErr);
    return { success: false, message: 'Erro ao revogar compartilhamento' };
  }

  await logAuditTrail({
    action: 'resource_share_revoked',
    resource: 'shared_resource_grant',
    resourceId: parsed.data.connection_id,
    details: { resource_type: parsed.data.resource_type },
  });

  revalidatePath('/connections');
  revalidatePath('/patients');
  return { success: true, message: 'Compartilhamento revogado' };
}

/**
 * Returns the active grants for a connection, observed as either party.
 */
export async function getGrantsForConnection(
  connectionId: string,
): Promise<SharedResourceGrant[]> {
  const user = await getAuthenticatedUser();
  if (!user) return [];

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('shared_resource_grants')
    .select('*')
    .eq('connection_id', connectionId)
    .order('granted_at', { ascending: false });
  if (error) {
    console.error('Failed to load grants:', error);
    return [];
  }
  return data ?? [];
}
