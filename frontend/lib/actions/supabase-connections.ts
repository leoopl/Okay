'use server';

import { revalidatePath } from 'next/cache';
import { createClient, getUserWithRolesAndPermissions, logAuditTrail } from '@/lib/supabase/server';
import { ConnectionInviteSchema, MAX_DOCTORS_PER_PATIENT } from '@/lib/schemas/provider-schemas';
import type { Tables } from '@/lib/supabase/database.types';

export type Connection = Tables<'patient_provider_connections'>;

export type ConnectionResult = {
  success: boolean;
  message?: string;
  connectionId?: string;
};

type ConnectionRow = Connection & {
  patient_profile?: {
    id: string;
    name: string | null;
    surname: string | null;
    email: string;
  } | null;
  provider_profile?: {
    id: string;
    name: string | null;
    surname: string | null;
    email: string;
  } | null;
};

/**
 * Patient invites pinned per S6: rejects if email doesn't match a profile, OR matches
 * a profile but no role row, OR matches a profile whose role is not 'patient'.
 * Server-side check fires friendly errors before falling through to DB triggers.
 */
export async function inviteConnection(input: {
  patient_email: string;
  invite_message?: string;
}): Promise<ConnectionResult> {
  const userData = await getUserWithRolesAndPermissions();
  if (!userData) return { success: false, message: 'Não autenticado' };
  if (!userData.hasRole('healthcare_provider')) {
    return { success: false, message: 'Apenas profissionais validados podem convidar pacientes' };
  }

  const parsed = ConnectionInviteSchema.safeParse(input);
  if (!parsed.success) {
    const first = Object.values(parsed.error.flatten().fieldErrors).flat()[0];
    return { success: false, message: first ?? 'Dados inválidos' };
  }

  const supabase = await createClient();

  // Look up patient by email
  const { data: patient, error: lookupErr } = await supabase
    .from('profiles')
    .select('id, email')
    .eq('email', parsed.data.patient_email)
    .maybeSingle();

  if (lookupErr) {
    console.error('Patient lookup failed:', lookupErr);
    return { success: false, message: 'Erro ao buscar paciente' };
  }
  if (!patient) {
    return {
      success: false,
      message: 'Paciente não encontrado. Peça para que ele se cadastre primeiro.',
    };
  }

  // Verify invitee is a patient (S6: reject if no role or wrong role)
  const { data: roleRows, error: roleErr } = await supabase
    .from('user_roles')
    .select('roles!inner(name)')
    .eq('user_id', patient.id);

  if (roleErr) {
    console.error('Role lookup failed:', roleErr);
    return { success: false, message: 'Erro ao verificar perfil do paciente' };
  }
  type RoleRow = { roles: { name: string } | { name: string }[] };
  const roleNames = (roleRows ?? []).flatMap((r: RoleRow) => {
    const rs = r.roles;
    return Array.isArray(rs) ? rs.map((x) => x.name) : rs ? [rs.name] : [];
  });

  if (roleNames.length === 0) {
    return {
      success: false,
      message: 'Paciente não encontrado. Peça para que ele se cadastre primeiro.',
    };
  }
  if (!roleNames.includes('patient')) {
    return { success: false, message: 'Este usuário não é um paciente' };
  }

  // Pre-check the 2-active-or-pending limit (DB trigger is the safety net)
  const { count, error: countErr } = await supabase
    .from('patient_provider_connections')
    .select('id', { count: 'exact', head: true })
    .eq('patient_id', patient.id)
    .in('status', ['pending', 'active']);
  if (countErr) {
    console.error('Connection count check failed:', countErr);
    return { success: false, message: 'Erro ao verificar conexões existentes' };
  }
  if ((count ?? 0) >= MAX_DOCTORS_PER_PATIENT) {
    return {
      success: false,
      message: `O paciente já possui o máximo de ${MAX_DOCTORS_PER_PATIENT} conexões`,
    };
  }

  // Insert (DB triggers verify role invariants and limit)
  const { data: inserted, error: insertErr } = await supabase
    .from('patient_provider_connections')
    .insert({
      patient_id: patient.id,
      provider_id: userData.user.id,
      initiated_by: userData.user.id,
      invite_message: parsed.data.invite_message ?? null,
    })
    .select('id')
    .single();

  if (insertErr) {
    console.error('Connection insert failed:', insertErr);
    if (insertErr.message?.includes('PATIENT_PROVIDER_LIMIT_EXCEEDED')) {
      return {
        success: false,
        message: `O paciente já possui o máximo de ${MAX_DOCTORS_PER_PATIENT} conexões`,
      };
    }
    if (insertErr.message?.includes('INVITEE_NOT_PATIENT')) {
      return { success: false, message: 'Este usuário não é um paciente' };
    }
    if (insertErr.message?.includes('INVITER_NOT_PROVIDER')) {
      return { success: false, message: 'Apenas profissionais validados podem convidar pacientes' };
    }
    if (insertErr.code === '23505') {
      return {
        success: false,
        message: 'Você já possui uma conexão pendente ou ativa com este paciente',
      };
    }
    return { success: false, message: 'Erro ao enviar convite' };
  }

  await logAuditTrail({
    action: 'connection_invited',
    resource: 'patient_provider_connection',
    resourceId: inserted!.id,
    details: { patient_id: patient.id },
  });

  revalidatePath('/patients');
  revalidatePath('/connections');
  return { success: true, message: 'Convite enviado', connectionId: inserted!.id };
}

/**
 * S2: returns connections split by perspective so /connections (patient) and /patients
 * (provider) routes consume different keys without re-querying.
 */
export async function getMyConnections(): Promise<{
  asPatient: ConnectionRow[];
  asProvider: ConnectionRow[];
}> {
  const userData = await getUserWithRolesAndPermissions();
  if (!userData) return { asPatient: [], asProvider: [] };

  const supabase = await createClient();

  const [patientSide, providerSide] = await Promise.all([
    supabase
      .from('patient_provider_connections')
      .select(
        '*, provider_profile:profiles!patient_provider_connections_provider_id_fkey(id, name, surname, email)',
      )
      .eq('patient_id', userData.user.id)
      .order('created_at', { ascending: false }),
    supabase
      .from('patient_provider_connections')
      .select(
        '*, patient_profile:profiles!patient_provider_connections_patient_id_fkey(id, name, surname, email)',
      )
      .eq('provider_id', userData.user.id)
      .order('created_at', { ascending: false }),
  ]);

  if (patientSide.error)
    console.error('Failed to load patient-side connections:', patientSide.error);
  if (providerSide.error)
    console.error('Failed to load provider-side connections:', providerSide.error);

  return {
    asPatient: (patientSide.data ?? []) as ConnectionRow[],
    asProvider: (providerSide.data ?? []) as ConnectionRow[],
  };
}

export async function acceptConnection(connectionId: string): Promise<ConnectionResult> {
  const userData = await getUserWithRolesAndPermissions();
  if (!userData) return { success: false, message: 'Não autenticado' };

  const supabase = await createClient();

  // Verify the user is the patient on this connection (state-machine trigger also checks)
  const { data: connection, error: fetchErr } = await supabase
    .from('patient_provider_connections')
    .select('id, patient_id, provider_id, status')
    .eq('id', connectionId)
    .maybeSingle();

  if (fetchErr || !connection) {
    return { success: false, message: 'Conexão não encontrada' };
  }
  if (connection.patient_id !== userData.user.id) {
    return { success: false, message: 'Apenas o paciente pode aceitar o convite' };
  }
  if (connection.status !== 'pending') {
    return { success: false, message: 'Convite já foi processado' };
  }

  const { error: updErr } = await supabase
    .from('patient_provider_connections')
    .update({ status: 'active' })
    .eq('id', connectionId);

  if (updErr) {
    console.error('Accept connection failed:', updErr);
    return { success: false, message: 'Erro ao aceitar convite' };
  }

  await logAuditTrail({
    action: 'connection_accepted',
    resource: 'patient_provider_connection',
    resourceId: connectionId,
    details: { provider_id: connection.provider_id },
  });

  revalidatePath('/connections');
  revalidatePath('/patients');
  return { success: true, message: 'Convite aceito' };
}

export async function rejectConnection(connectionId: string): Promise<ConnectionResult> {
  const userData = await getUserWithRolesAndPermissions();
  if (!userData) return { success: false, message: 'Não autenticado' };

  const supabase = await createClient();
  const { data: connection, error: fetchErr } = await supabase
    .from('patient_provider_connections')
    .select('id, patient_id, provider_id, status')
    .eq('id', connectionId)
    .maybeSingle();

  if (fetchErr || !connection) {
    return { success: false, message: 'Conexão não encontrada' };
  }
  if (connection.patient_id !== userData.user.id) {
    return { success: false, message: 'Apenas o paciente pode rejeitar o convite' };
  }
  if (connection.status !== 'pending') {
    return { success: false, message: 'Convite já foi processado' };
  }

  const { error: updErr } = await supabase
    .from('patient_provider_connections')
    .update({ status: 'rejected' })
    .eq('id', connectionId);

  if (updErr) {
    console.error('Reject connection failed:', updErr);
    return { success: false, message: 'Erro ao rejeitar convite' };
  }

  await logAuditTrail({
    action: 'connection_rejected',
    resource: 'patient_provider_connection',
    resourceId: connectionId,
    details: { provider_id: connection.provider_id },
  });

  revalidatePath('/connections');
  revalidatePath('/patients');
  return { success: true, message: 'Convite rejeitado' };
}

export async function endConnection(connectionId: string): Promise<ConnectionResult> {
  const userData = await getUserWithRolesAndPermissions();
  if (!userData) return { success: false, message: 'Não autenticado' };

  const supabase = await createClient();
  const { data: connection, error: fetchErr } = await supabase
    .from('patient_provider_connections')
    .select('id, patient_id, provider_id, status')
    .eq('id', connectionId)
    .maybeSingle();

  if (fetchErr || !connection) {
    return { success: false, message: 'Conexão não encontrada' };
  }
  const isParty =
    connection.patient_id === userData.user.id || connection.provider_id === userData.user.id;
  if (!isParty) {
    return { success: false, message: 'Você não faz parte desta conexão' };
  }
  if (connection.status === 'rejected' || connection.status === 'ended') {
    return { success: false, message: 'Conexão já encerrada' };
  }

  const { error: updErr } = await supabase
    .from('patient_provider_connections')
    .update({ status: 'ended' })
    .eq('id', connectionId);

  if (updErr) {
    console.error('End connection failed:', updErr);
    return { success: false, message: 'Erro ao encerrar conexão' };
  }

  const endedByRole = connection.patient_id === userData.user.id ? 'patient' : 'provider';
  await logAuditTrail({
    action: 'connection_ended',
    resource: 'patient_provider_connection',
    resourceId: connectionId,
    details: { ended_by_role: endedByRole },
  });

  revalidatePath('/connections');
  revalidatePath('/patients');
  return { success: true, message: 'Conexão encerrada' };
}
