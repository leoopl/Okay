'use server';

import { createClient, getAuthenticatedUser } from '@/lib/supabase/server';
import type { SharedResourceType } from '@/lib/schemas/provider-schemas';

export type ConnectionAccessError =
  | 'NOT_AUTHENTICATED'
  | 'NOT_PROVIDER'
  | 'NO_ACTIVE_CONNECTION'
  | 'NO_GRANT';

export class ConnectionAccessException extends Error {
  constructor(public code: ConnectionAccessError, message?: string) {
    super(message ?? code);
    this.name = 'ConnectionAccessException';
  }
}

/**
 * Verify that the calling user (must be healthcare_provider) has an active connection
 * to the given patient AND an active grant for the requested resource type.
 *
 * Returns connection metadata on success. Throws ConnectionAccessException on denial.
 *
 * Mirrors the SQL `provider_can_view()` predicate in Migration #1. The two must stay
 * in sync — RLS on inventory_responses/dose_logs uses the SQL predicate; this helper
 * provides the friendly Brazilian Portuguese error path before RLS would silently
 * return zero rows.
 */
export async function assertProviderCanAccessPatientResource(args: {
  patientId: string;
  resourceType: SharedResourceType;
}): Promise<{ connectionId: string; providerId: string }> {
  const user = await getAuthenticatedUser();
  if (!user) throw new ConnectionAccessException('NOT_AUTHENTICATED');

  const supabase = await createClient();

  // Single round-trip: select the active connection joined with an active grant.
  const { data, error } = await supabase
    .from('patient_provider_connections')
    .select('id, provider_id, status, shared_resource_grants!inner(resource_type, revoked_at)')
    .eq('provider_id', user.id)
    .eq('patient_id', args.patientId)
    .eq('status', 'active')
    .eq('shared_resource_grants.resource_type', args.resourceType)
    .is('shared_resource_grants.revoked_at', null)
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error('connection-access lookup failed:', error);
    throw new ConnectionAccessException('NO_ACTIVE_CONNECTION');
  }
  if (!data) {
    throw new ConnectionAccessException('NO_GRANT');
  }
  return { connectionId: data.id, providerId: data.provider_id };
}
