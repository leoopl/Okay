import { redirect } from 'next/navigation';
import { getUserWithRolesAndPermissions } from '@/lib/supabase/server';
import { getMyConnections } from '@/lib/actions/supabase-connections';
import PatientsClient from './patients-client';

export default async function PatientsPage() {
  const userData = await getUserWithRolesAndPermissions();
  if (!userData) redirect('/signin?returnUrl=/patients');
  if (!userData.hasRole('healthcare_provider')) redirect('/unauthorized');

  const { asProvider } = await getMyConnections();

  return <PatientsClient connections={asProvider} />;
}
