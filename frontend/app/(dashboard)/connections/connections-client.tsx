'use client';

import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import {
  acceptConnection,
  endConnection,
  rejectConnection,
} from '@/lib/actions/supabase-connections';
import { grantResource, revokeResource } from '@/lib/actions/supabase-shared-grants';
import { SHARED_RESOURCE_LABELS, type SharedResourceType } from '@/lib/schemas/provider-schemas';
import type { Tables } from '@/lib/supabase/database.types';

type Connection = Tables<'patient_provider_connections'> & {
  provider_profile?: {
    id: string;
    name: string | null;
    surname: string | null;
    email: string;
  } | null;
};
type Grant = Tables<'shared_resource_grants'>;

interface Props {
  connections: Connection[];
  grantsByConnection: Record<string, Grant[]>;
}

const RESOURCE_TYPES: SharedResourceType[] = [
  'inventory_responses',
  'dose_logs',
  'todo_items',
  'therapeutic_goals',
  'agenda_items',
];

export default function ConnectionsClient({ connections, grantsByConnection }: Props) {
  const [isPending, startTransition] = useTransition();

  // Local optimistic copy of grants so the patient sees toggles flip immediately.
  // Server is the source of truth; we re-sync on every server action result.
  const [grants, setGrants] = useState<Record<string, Grant[]>>(grantsByConnection);

  const pending = connections.filter((c) => c.status === 'pending');
  const active = connections.filter((c) => c.status === 'active');
  const ended = connections.filter((c) => c.status === 'rejected' || c.status === 'ended');

  function isResourceShared(connectionId: string, resourceType: SharedResourceType): boolean {
    return (grants[connectionId] ?? []).some(
      (g) => g.resource_type === resourceType && g.revoked_at === null,
    );
  }

  function handleAccept(id: string) {
    startTransition(async () => {
      const r = await acceptConnection(id);
      if (r.success) toast.success('Sucesso', { description: r.message });
      else toast.error('Erro', { description: r.message });
    });
  }
  function handleReject(id: string) {
    startTransition(async () => {
      const r = await rejectConnection(id);
      if (r.success) toast.success('Sucesso', { description: r.message });
      else toast.error('Erro', { description: r.message });
    });
  }
  function handleEnd(id: string) {
    if (!confirm('Tem certeza que deseja encerrar esta conexão?')) return;
    startTransition(async () => {
      const r = await endConnection(id);
      if (r.success) toast.success('Sucesso', { description: r.message });
      else toast.error('Erro', { description: r.message });
    });
  }

  function handleToggleResource(
    connectionId: string,
    resourceType: SharedResourceType,
    currentlyShared: boolean,
  ) {
    startTransition(async () => {
      const r = currentlyShared
        ? await revokeResource({ connection_id: connectionId, resource_type: resourceType })
        : await grantResource({ connection_id: connectionId, resource_type: resourceType });

      if (!r.success) {
        toast.error('Erro', { description: r.message });
        return;
      }
      toast.success('Sucesso', { description: r.message });

      // Optimistic local update; refresh on next render via revalidatePath
      setGrants((prev) => {
        const list = prev[connectionId] ?? [];
        if (currentlyShared) {
          return {
            ...prev,
            [connectionId]: list.map((g) =>
              g.resource_type === resourceType && g.revoked_at === null
                ? { ...g, revoked_at: new Date().toISOString() }
                : g,
            ),
          };
        } else {
          return {
            ...prev,
            [connectionId]: [
              ...list,
              {
                id: crypto.randomUUID(),
                connection_id: connectionId,
                resource_type: resourceType,
                granted_at: new Date().toISOString(),
                revoked_at: null,
                revoked_by: null,
              } as Grant,
            ],
          };
        }
      });
    });
  }

  // Stable references for UI usage
  void isPending;
  void pending;
  void active;
  void ended;
  void RESOURCE_TYPES;
  void SHARED_RESOURCE_LABELS;
  void isResourceShared;
  void handleAccept;
  void handleReject;
  void handleEnd;
  void handleToggleResource;

  // #TODO: UI — render three sections:
  //   1. "Convites pendentes" (pending) — for each: provider name/email,
  //      invite_message, [Aceitar] [Rejeitar] buttons (handleAccept, handleReject)
  //   2. "Conexões ativas" (active) — for each:
  //      - provider name/email
  //      - sharing toggles for each RESOURCE_TYPES entry, label from
  //        SHARED_RESOURCE_LABELS, checked state from isResourceShared(id, type),
  //        onChange → handleToggleResource(id, type, currentlyShared)
  //      - [Encerrar conexão] button (handleEnd)
  //   3. "Histórico" (ended) — list with status badge, accepted_at/ended_at dates
  //   - Disable all buttons/toggles when isPending
  //   - Empty states for each section
  return null;
}
