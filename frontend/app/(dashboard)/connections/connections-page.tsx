import { redirect } from 'next/navigation';
import { getUserWithRolesAndPermissions } from '@/lib/supabase/server';
import { getMyConnections } from '@/lib/actions/supabase-connections';
import { getGrantsForConnection } from '@/lib/actions/supabase-shared-grants';
import ConnectionsClient from './connections-client';
import type { Tables } from '@/lib/supabase/database.types';

export default async function ConnectionsPage() {
  const userData = await getUserWithRolesAndPermissions();
  if (!userData) redirect('/signin?returnUrl=/connections');

  const { asPatient } = await getMyConnections();

  // Pre-fetch grants for ALL active connections so the toggles know their initial state
  // without an extra round-trip in the client. Pending connections don't have grants yet.
  type GrantsByConnection = Record<string, Tables<'shared_resource_grants'>[]>;
  const grantsByConnection: GrantsByConnection = {};
  await Promise.all(
    asPatient
      .filter((c) => c.status === 'active')
      .map(async (c) => {
        grantsByConnection[c.id] = await getGrantsForConnection(c.id);
      }),
  );

  return <ConnectionsClient connections={asPatient} grantsByConnection={grantsByConnection} />;
}
