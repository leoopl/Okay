import { redirect } from 'next/navigation';
import { createClient, getUserWithRolesAndPermissions } from '@/lib/supabase/server';
import { getInventoryResponsesForPatient } from '@/lib/actions/supabase-inventories';
import { getDoseLogsForPatient } from '@/lib/actions/supabase-dose-logs';
import { getGrantsForConnection } from '@/lib/actions/supabase-shared-grants';
import PatientDetailClient from './patient-detail-client';

interface PageProps {
  params: Promise<{ patientId: string }>;
}

export default async function PatientDetailPage({ params }: PageProps) {
  const { patientId } = await params;

  const userData = await getUserWithRolesAndPermissions();
  if (!userData) redirect('/signin');
  if (!userData.hasRole('healthcare_provider')) redirect('/unauthorized');

  const supabase = await createClient();

  // Look up the active connection — single source of truth for which grants exist.
  const { data: connection } = await supabase
    .from('patient_provider_connections')
    .select(
      'id, patient_id, provider_id, status, accepted_at, patient_profile:profiles!patient_provider_connections_patient_id_fkey(id, name, surname, email)',
    )
    .eq('provider_id', userData.user.id)
    .eq('patient_id', patientId)
    .eq('status', 'active')
    .maybeSingle();

  if (!connection) {
    return <PatientDetailClient state={{ kind: 'no-connection', patientId }} />;
  }

  const grants = await getGrantsForConnection(connection.id);
  const activeGrantTypes = new Set(
    grants.filter((g) => g.revoked_at === null).map((g) => g.resource_type),
  );

  // Pre-fetch the granted resources in parallel — RLS ensures we only see what's
  // actually shared. The helpers also throw friendly errors if the access predicate
  // changes between this fetch and the data load (race condition).
  const [inventoryRes, doseRes] = await Promise.all([
    activeGrantTypes.has('inventory_responses')
      ? getInventoryResponsesForPatient(patientId)
      : Promise.resolve({ success: true, responses: [], error: undefined }),
    activeGrantTypes.has('dose_logs')
      ? getDoseLogsForPatient(patientId)
      : Promise.resolve({ success: true, logs: [], error: undefined }),
  ]);

  return (
    <PatientDetailClient
      state={{
        kind: 'connected',
        connection,
        activeGrantTypes: Array.from(activeGrantTypes),
        inventoryResponses: inventoryRes.responses,
        inventoryError: inventoryRes.error,
        doseLogs: doseRes.logs,
        doseLogsError: doseRes.error,
      }}
    />
  );
}
