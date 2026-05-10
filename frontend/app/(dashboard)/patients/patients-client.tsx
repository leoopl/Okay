'use client';

import { useState, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { toast } from 'sonner';
import { endConnection, inviteConnection } from '@/lib/actions/supabase-connections';
import { ConnectionInviteSchema, type ConnectionInviteInput } from '@/lib/schemas/provider-schemas';
import type { Tables } from '@/lib/supabase/database.types';

type Connection = Tables<'patient_provider_connections'> & {
  patient_profile?: {
    id: string;
    name: string | null;
    surname: string | null;
    email: string;
  } | null;
};

interface Props {
  connections: Connection[];
}

export default function PatientsClient({ connections }: Props) {
  const [isPending, startTransition] = useTransition();
  const [showInviteForm, setShowInviteForm] = useState(false);

  const inviteForm = useForm<ConnectionInviteInput>({
    resolver: zodResolver(ConnectionInviteSchema),
    defaultValues: { patient_email: '', invite_message: '' },
  });

  const pending = connections.filter((c) => c.status === 'pending');
  const active = connections.filter((c) => c.status === 'active');
  const ended = connections.filter((c) => c.status === 'rejected' || c.status === 'ended');

  function onInvite(values: ConnectionInviteInput) {
    startTransition(async () => {
      const result = await inviteConnection(values);
      if (result.success) {
        toast.success('Sucesso', { description: result.message });
        inviteForm.reset();
        setShowInviteForm(false);
      } else {
        toast.error('Erro', { description: result.message });
      }
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

  void isPending;
  void pending;
  void active;
  void ended;
  void inviteForm;
  void showInviteForm;
  void setShowInviteForm;
  void onInvite;
  void handleEnd;
  void Link;

  // #TODO: UI — render:
  //   - "Convidar paciente" button → toggles showInviteForm
  //   - When showInviteForm: form with patient_email, invite_message, submit button
  //     (inviteForm.handleSubmit(onInvite), disabled when isPending)
  //   - "Convites pendentes" section (pending) — patient email/name, invite_message,
  //     [Cancelar convite] button (handleEnd)
  //   - "Pacientes ativos" section (active) — for each:
  //     <Link href={`/patients/${c.patient_id}`}>{patient name}</Link>
  //     [Encerrar conexão] button (handleEnd)
  //   - "Histórico" section (ended) — read-only list with status + dates
  //   - Empty states everywhere
  return null;
}
