'use client';

import { useEffect, useState, useTransition } from 'react';
import { toast } from 'sonner';
import {
  approveRequest,
  listValidationRequests,
  rejectRequest,
} from '@/lib/actions/supabase-provider-validation';
import { createClient } from '@/lib/supabase/client';
import type { Tables } from '@/lib/supabase/database.types';

type ValidationRequest = Tables<'provider_validation_requests'>;
type StatusFilter = 'pending' | 'approved' | 'rejected' | 'all';

interface Props {
  initialRequests: ValidationRequest[];
  initialError?: string;
}

export default function AdminProviderValidationsClient({
  initialRequests,
  initialError,
}: Props) {
  const [requests, setRequests] = useState<ValidationRequest[]>(initialRequests);
  const [activeTab, setActiveTab] = useState<StatusFilter>('pending');
  const [isPending, startTransition] = useTransition();
  const [rejectionReason, setRejectionReason] = useState<Record<string, string>>({});

  useEffect(() => {
    if (initialError) toast.error('Erro', { description: initialError });
  }, [initialError]);

  async function refresh() {
    const { data, error } = await listValidationRequests('all');
    if (error) toast.error('Erro', { description: error });
    else setRequests(data);
  }

  /**
   * Generate a short-lived signed URL so the admin can preview the uploaded license.
   * Storage RLS already permits admin reads on the bucket.
   */
  async function openDocument(documentPath: string) {
    const supabase = createClient();
    const { data, error } = await supabase.storage
      .from('provider-licenses')
      .createSignedUrl(documentPath, 60 * 5); // 5 minutes
    if (error || !data?.signedUrl) {
      toast.error('Erro', { description: 'Não foi possível abrir o documento' });
      return;
    }
    window.open(data.signedUrl, '_blank');
  }

  function handleApprove(id: string) {
    if (!confirm('Aprovar este profissional? A função do usuário será alterada para healthcare_provider.')) {
      return;
    }
    startTransition(async () => {
      const r = await approveRequest(id);
      if (r.success) {
        toast.success('Sucesso', { description: r.message });
        await refresh();
      } else {
        toast.error('Erro', { description: r.message });
      }
    });
  }

  function handleReject(id: string) {
    const reason = rejectionReason[id]?.trim();
    if (!reason) {
      toast.error('Erro', { description: 'Informe o motivo da rejeição antes de confirmar' });
      return;
    }
    startTransition(async () => {
      const r = await rejectRequest(id, reason);
      if (r.success) {
        toast.success('Sucesso', { description: r.message });
        setRejectionReason((prev) => {
          const next = { ...prev };
          delete next[id];
          return next;
        });
        await refresh();
      } else {
        toast.error('Erro', { description: r.message });
      }
    });
  }

  const filtered = requests.filter((r) => activeTab === 'all' || r.status === activeTab);

  void filtered;
  void isPending;
  void rejectionReason;
  void setRejectionReason;
  void openDocument;
  void handleApprove;
  void handleReject;
  void activeTab;
  void setActiveTab;

  // #TODO: UI — mirror app/(admin)/admin/testimonials/admin-testimonials-client.tsx:
  //   - Tabs: Pendentes (pending) / Aprovados (approved) / Rejeitados (rejected) / Todos (all)
  //     bound to activeTab / setActiveTab
  //   - For each `req` in `filtered`:
  //     - Card with: full_name, council_type / council_state / council_number,
  //       specialty, bio, created_at. Status badge (req.status).
  //     - If document_path: button "Ver documento" → openDocument(req.document_path)
  //     - When req.status === 'pending':
  //       - Textarea bound to rejectionReason[req.id] (setRejectionReason)
  //       - [Aprovar] button (handleApprove(req.id))
  //       - [Rejeitar] button (handleReject(req.id), disabled if reason empty)
  //     - When req.status === 'rejected': show req.rejection_reason
  //     - When req.status === 'approved': show "Aprovado em {req.reviewed_at}"
  //   - Disable all buttons when isPending
  //   - Empty state per tab
  return null;
}
