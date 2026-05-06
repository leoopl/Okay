'use client';

import { useState } from 'react';
import type { Tables } from '@/lib/supabase/database.types';
import {
  SHARED_RESOURCE_LABELS,
  type SharedResourceType,
} from '@/lib/schemas/provider-schemas';

type ConnectionWithProfile = {
  id: string;
  patient_id: string;
  provider_id: string;
  status: Tables<'patient_provider_connections'>['status'];
  accepted_at: string | null;
  patient_profile?:
    | { id: string; name: string | null; surname: string | null; email: string }
    | { id: string; name: string | null; surname: string | null; email: string }[]
    | null;
};

type DetailState =
  | { kind: 'no-connection'; patientId: string }
  | {
      kind: 'connected';
      connection: ConnectionWithProfile;
      activeGrantTypes: SharedResourceType[];
      inventoryResponses: Tables<'inventory_responses'>[];
      inventoryError?: string;
      doseLogs: any[];
      doseLogsError?: string;
    };

interface Props {
  state: DetailState;
}

export default function PatientDetailClient({ state }: Props) {
  const [activeTab, setActiveTab] = useState<SharedResourceType>('inventory_responses');

  if (state.kind === 'no-connection') {
    void state.patientId;
    // #TODO: UI — render an "Acesso negado" card. Either there is no active
    // connection with this patient OR this user is not the provider on it.
    // Suggest: link back to /patients.
    return null;
  }

  // state.kind === 'connected'
  const profile = Array.isArray(state.connection.patient_profile)
    ? state.connection.patient_profile[0]
    : state.connection.patient_profile;

  const tabs = state.activeGrantTypes; // only show tabs for granted resources

  void profile;
  void tabs;
  void activeTab;
  void setActiveTab;
  void SHARED_RESOURCE_LABELS;

  // #TODO: UI — render:
  //   - Header: patient name (profile.name + profile.surname), patient email,
  //     "Conexão ativa desde {accepted_at}"
  //   - Tabs: one per item in `tabs`, label from SHARED_RESOURCE_LABELS
  //     - controlled by activeTab / setActiveTab
  //   - Tab "inventory_responses": render state.inventoryResponses (or
  //     state.inventoryError if set). Each response: inventory title, completed_at,
  //     calculated_scores summary, interpretation_results.
  //   - Tab "dose_logs": render state.doseLogs (or state.doseLogsError). Each log:
  //     medication name, timestamp, status badge, notes.
  //   - Tabs "todo_items", "therapeutic_goals", "agenda_items": "UI em breve"
  //     placeholders (per plan, deferred to follow-up).
  //   - Empty state when tabs.length === 0: "O paciente ainda não compartilhou
  //     nenhum recurso com você."
  return null;
}
