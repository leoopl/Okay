'use client';

import { useState, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { submitValidationRequest } from '@/lib/actions/supabase-provider-validation';
import {
  ValidationRequestSchema,
  type ValidationRequestInput,
  BR_UF_CODES,
} from '@/lib/schemas/provider-schemas';
import { createClient } from '@/lib/supabase/client';
import type { Tables } from '@/lib/supabase/database.types';

type ValidationRequest = Tables<'provider_validation_requests'>;

interface Props {
  isProvider: boolean;
  existingRequest: ValidationRequest | null;
  userId: string;
}

export default function ProfessionalValidationClient({
  isProvider,
  existingRequest,
  userId,
}: Props) {
  const [isPending, startTransition] = useTransition();
  const [uploading, setUploading] = useState(false);
  const [uploadedPath, setUploadedPath] = useState<string | null>(null);

  const form = useForm<ValidationRequestInput>({
    resolver: zodResolver(ValidationRequestSchema),
    defaultValues: {
      council_type: 'CRM',
      council_state: 'SP',
      council_number: '',
      full_name: '',
      specialty: '',
      bio: '',
      document_path: '',
    },
  });

  /**
   * Upload license PDF/image to the provider-licenses bucket. Storage RLS requires the
   * path's first folder segment to be auth.uid() — we follow that convention with
   * `<userId>/<request-uuid-or-timestamp>.<ext>`.
   */
  async function handleFileUpload(file: File) {
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Arquivo muito grande', { description: 'Tamanho máximo: 10 MB' });
      return;
    }
    setUploading(true);
    try {
      const supabase = createClient();
      const ext = file.name.split('.').pop() ?? 'pdf';
      const path = `${userId}/${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage
        .from('provider-licenses')
        .upload(path, file, { contentType: file.type, upsert: false });
      if (error) {
        toast.error('Erro no upload', { description: error.message });
        return;
      }
      setUploadedPath(path);
      form.setValue('document_path', path);
      toast.success('Documento enviado');
    } finally {
      setUploading(false);
    }
  }

  function onSubmit(values: ValidationRequestInput) {
    startTransition(async () => {
      const result = await submitValidationRequest(values);
      if (result.success) {
        toast.success('Sucesso', { description: result.message });
        form.reset();
        setUploadedPath(null);
      } else if (result.errors) {
        const first = Object.values(result.errors).flat()[0];
        toast.error('Erro de validação', { description: first });
      } else {
        toast.error('Erro', { description: result.message });
      }
    });
  }

  // Three exclusive UI states:
  //   1. User is already a healthcare_provider → show "you are validated" card
  //   2. There's a pending/approved/rejected existing request → show status card
  //   3. No request and not a provider → show submission form
  const showAlreadyValidated = isProvider;
  const showPendingStatus = !isProvider && existingRequest && existingRequest.status === 'pending';
  const showRejectedStatus =
    !isProvider && existingRequest && existingRequest.status === 'rejected';
  const showForm = !isProvider && (!existingRequest || existingRequest.status === 'rejected');

  // Stable references for UI usage
  void showAlreadyValidated;
  void showPendingStatus;
  void showRejectedStatus;
  void showForm;
  void BR_UF_CODES;
  void uploading;
  void uploadedPath;
  void handleFileUpload;
  void isPending;
  void onSubmit;

  // #TODO: UI — render one of the three states above. Suggested layout:
  //   - card with current status when applicable (existingRequest.status,
  //     reviewed_at, rejection_reason)
  //   - form using react-hook-form (`form`) with fields:
  //       council_type select (CRM | CRP)
  //       council_state select (BR_UF_CODES)
  //       council_number input
  //       full_name input
  //       specialty input (optional)
  //       bio textarea (optional, max 2000)
  //       document upload (handleFileUpload, show uploadedPath)
  //   - submit button: form.handleSubmit(onSubmit), disabled when isPending || uploading
  //   - if showAlreadyValidated: "Você já é um profissional validado" card with no form
  return null;
}
