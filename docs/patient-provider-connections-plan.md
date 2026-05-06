# Patient–Professional Connections — Implementation Plan

A complete, follow-along guide for implementing the Patient–Professional Connections feature in the Okay mental health platform. Each section is self-contained with concrete SQL, code patterns, and references to existing files you should study or copy from.

---

## 1. Overview

### What you're building

A system where:
- Any user can submit a CRM/CRP validation request to become a healthcare provider on the platform.
- An admin manually reviews and approves/rejects requests.
- Approved providers receive a `healthcare_provider` role (additive — they keep their `patient` role too).
- Validated providers can invite patients (by email) to connect.
- Patients accept/reject invites; on accept they choose **per-resource** what to share.
- Patients can have at most **2 active provider connections**; providers have unlimited patients.
- Either side can end a connection at any time.
- Schema is also defined for three future shared workspaces (to-do, therapeutic goals, agenda) — UIs deferred to follow-up tasks.

### Architectural decisions (locked)

| Decision | Choice | Rationale |
|---|---|---|
| Schema target | Supabase only | Matches the de facto pattern — frontend talks to Supabase directly for user data (journal, medication, inventory all live there). No NestJS backend changes. |
| Connection initiation | Provider invites → patient accepts | Mirrors clinical workflows; avoids spam from unsolicited patient requests |
| Sharing model | Patient picks per-resource | LGPD-friendly granular consent; matches privacy-first ethos |
| Shared lists | Schema this round, UI later | Avoid bloating one task; ship the connection primitive first |

### Access enforcement strategy

The codebase currently enforces ownership via **server-action `.eq('user_id', user.id)`** filters. RLS only exists on `dose_log_audit`. This plan does **not** change that pattern for existing tables. Instead:

- **Patient-side server actions** stay unchanged.
- **New provider-side server actions** are separate functions that take `patientId` explicitly and validate via a single helper before reading.
- **All NEW tables added in this plan** will have RLS policies as defense-in-depth (matching the `dose_log_audit` precedent).

### What is NOT in this plan

1. Push notifications for invites — push pipeline is unwired; defer.
2. Email notifications — no email service decision yet; defer.
3. UIs for `todo_items`, `therapeutic_goals`, `agenda_items` — schema only.
4. NestJS backend parity — Supabase-only decision.
5. Realtime subscriptions for live updates — page polls on load for v1.
6. Provider directory / patient-driven search — separate plan.
7. Re-invite/re-approval special UX — works mechanically via status transitions; no special UI.

---

## 2. Data Model

### 2.1 New ENUMs

```sql
CREATE TYPE council_type AS ENUM ('CRM', 'CRP');

CREATE TYPE provider_validation_status AS ENUM ('pending', 'approved', 'rejected');

CREATE TYPE connection_status AS ENUM ('pending', 'active', 'rejected', 'ended');

CREATE TYPE shared_resource_type AS ENUM (
  'inventory_responses',
  'dose_logs',
  'todo_items',
  'therapeutic_goals',
  'agenda_items'
);
```

### 2.2 Extend `audit_action` enum

Postgres ENUM extension is one-way (you can't easily remove values). Document this in the migration header.

```sql
ALTER TYPE audit_action ADD VALUE IF NOT EXISTS 'provider_validation_requested';
ALTER TYPE audit_action ADD VALUE IF NOT EXISTS 'provider_validation_approved';
ALTER TYPE audit_action ADD VALUE IF NOT EXISTS 'provider_validation_rejected';
ALTER TYPE audit_action ADD VALUE IF NOT EXISTS 'connection_invited';
ALTER TYPE audit_action ADD VALUE IF NOT EXISTS 'connection_accepted';
ALTER TYPE audit_action ADD VALUE IF NOT EXISTS 'connection_rejected';
ALTER TYPE audit_action ADD VALUE IF NOT EXISTS 'connection_ended';
ALTER TYPE audit_action ADD VALUE IF NOT EXISTS 'resource_shared';
ALTER TYPE audit_action ADD VALUE IF NOT EXISTS 'resource_share_revoked';
```

### 2.3 Table: `provider_validation_requests`

Tracks users requesting professional validation.

```sql
CREATE TABLE provider_validation_requests (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  council_type      council_type NOT NULL,
  council_state     CHAR(2) NOT NULL,            -- BR UF code: 'SP', 'RJ', etc.
  council_number    TEXT NOT NULL,
  full_name         TEXT NOT NULL,
  specialty         TEXT,
  bio               TEXT,
  document_url      TEXT,                        -- optional license PDF (Supabase Storage)
  status            provider_validation_status NOT NULL DEFAULT 'pending',
  reviewed_by       UUID REFERENCES profiles(id),
  reviewed_at       TIMESTAMPTZ,
  rejection_reason  TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- One pending request per user at a time (allows re-submission after rejection)
CREATE UNIQUE INDEX provider_validation_requests_one_pending_per_user
  ON provider_validation_requests (user_id) WHERE status = 'pending';

-- A given (CRM/CRP, state, number) can only have one approved record globally
CREATE UNIQUE INDEX provider_validation_requests_unique_approved_license
  ON provider_validation_requests (council_type, council_state, council_number)
  WHERE status = 'approved';

CREATE INDEX provider_validation_requests_status_idx
  ON provider_validation_requests (status, created_at);
```

### 2.4 Table: `patient_provider_connections`

Many-to-many between patients and providers, with audit metadata.

```sql
CREATE TABLE patient_provider_connections (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id      UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  provider_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status          connection_status NOT NULL DEFAULT 'pending',
  initiated_by    UUID NOT NULL REFERENCES profiles(id),  -- always provider
  invite_message  TEXT,
  accepted_at     TIMESTAMPTZ,
  rejected_at     TIMESTAMPTZ,
  ended_at        TIMESTAMPTZ,
  ended_by        UUID REFERENCES profiles(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT no_self_connection CHECK (patient_id <> provider_id)
);

-- Only one open connection per (patient, provider) pair
CREATE UNIQUE INDEX patient_provider_connections_unique_open_pair
  ON patient_provider_connections (patient_id, provider_id)
  WHERE status IN ('pending', 'active');

CREATE INDEX patient_provider_connections_patient_idx
  ON patient_provider_connections (patient_id, status);

CREATE INDEX patient_provider_connections_provider_idx
  ON patient_provider_connections (provider_id, status);
```

#### Patient max-2-providers trigger

Server-side action also pre-checks for friendly UX, but trigger is the safety net:

```sql
CREATE OR REPLACE FUNCTION enforce_patient_provider_limit()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status IN ('pending', 'active') THEN
    IF (
      SELECT COUNT(*)
      FROM patient_provider_connections
      WHERE patient_id = NEW.patient_id
        AND status IN ('pending', 'active')
        AND id <> COALESCE(NEW.id, gen_random_uuid())
    ) >= 2 THEN
      RAISE EXCEPTION 'PATIENT_PROVIDER_LIMIT_EXCEEDED'
        USING HINT = 'Patient already has 2 pending or active providers';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER patient_provider_limit_trigger
  BEFORE INSERT OR UPDATE ON patient_provider_connections
  FOR EACH ROW EXECUTE FUNCTION enforce_patient_provider_limit();
```

The server action catches this exact error code and surfaces a Brazilian Portuguese message.

### 2.5 Table: `shared_resource_grants`

Per-resource opt-in. Patient grants/revokes per connection.

```sql
CREATE TABLE shared_resource_grants (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id  UUID NOT NULL REFERENCES patient_provider_connections(id) ON DELETE CASCADE,
  resource_type  shared_resource_type NOT NULL,
  granted_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  revoked_at     TIMESTAMPTZ
);

CREATE UNIQUE INDEX shared_resource_grants_one_active_per_resource
  ON shared_resource_grants (connection_id, resource_type)
  WHERE revoked_at IS NULL;

CREATE INDEX shared_resource_grants_connection_idx
  ON shared_resource_grants (connection_id);
```

### 2.6 Tables: `todo_items`, `therapeutic_goals`, `agenda_items` (schema only)

```sql
CREATE TABLE todo_items (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id  UUID NOT NULL REFERENCES patient_provider_connections(id) ON DELETE CASCADE,
  created_by     UUID NOT NULL REFERENCES profiles(id),
  title          TEXT NOT NULL CHECK (length(title) BETWEEN 1 AND 200),
  description    TEXT,
  is_done        BOOLEAN NOT NULL DEFAULT false,
  done_at        TIMESTAMPTZ,
  done_by        UUID REFERENCES profiles(id),
  due_date       DATE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX todo_items_connection_idx ON todo_items (connection_id, is_done);

CREATE TABLE therapeutic_goals (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id  UUID NOT NULL REFERENCES patient_provider_connections(id) ON DELETE CASCADE,
  created_by     UUID NOT NULL REFERENCES profiles(id),
  title          TEXT NOT NULL CHECK (length(title) BETWEEN 1 AND 200),
  description    TEXT,
  target_date    DATE,
  achieved_at    TIMESTAMPTZ,
  achieved_by    UUID REFERENCES profiles(id),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX therapeutic_goals_connection_idx ON therapeutic_goals (connection_id);

CREATE TABLE agenda_items (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id  UUID NOT NULL REFERENCES patient_provider_connections(id) ON DELETE CASCADE,
  created_by     UUID NOT NULL REFERENCES profiles(id),
  title          TEXT NOT NULL CHECK (length(title) BETWEEN 1 AND 200),
  description    TEXT,
  scheduled_at   TIMESTAMPTZ,
  completed_at   TIMESTAMPTZ,
  completed_by   UUID REFERENCES profiles(id),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX agenda_items_connection_idx ON agenda_items (connection_id, scheduled_at);
```

**Per-item edit/delete rule** (will be enforced in server actions when UIs are built): only the `created_by` user can edit or delete the item. Either party can mark `is_done` / `achieved_at` / `completed_at`.

### 2.7 New role + permissions seed

```sql
-- 1. New role
INSERT INTO roles (name, description, is_default, is_system)
VALUES ('healthcare_provider', 'Validated mental health professional', false, true)
ON CONFLICT (name) DO NOTHING;

-- 2. New permissions
INSERT INTO permissions (name, resource, action, description) VALUES
  ('provider-validation-request:create', 'provider-validation-request', 'create', 'Submit own validation request'),
  ('provider-validation-request:read',   'provider-validation-request', 'read',   'View own validation requests'),
  ('provider-validation-request:manage', 'provider-validation-request', 'manage', 'Approve/reject any request (admin)'),
  ('patient-provider-connection:create', 'patient-provider-connection', 'create', 'Invite a patient'),
  ('patient-provider-connection:read',   'patient-provider-connection', 'read',   'View own connections'),
  ('patient-provider-connection:update', 'patient-provider-connection', 'update', 'Accept/reject/end own connections'),
  ('shared-resource-grant:create',       'shared-resource-grant',       'create', 'Grant resource access'),
  ('shared-resource-grant:delete',       'shared-resource-grant',       'delete', 'Revoke resource access'),
  ('todo-item:create', 'todo-item', 'create', NULL),
  ('todo-item:read',   'todo-item', 'read',   NULL),
  ('todo-item:update', 'todo-item', 'update', NULL),
  ('todo-item:delete', 'todo-item', 'delete', NULL),
  ('therapeutic-goal:create', 'therapeutic-goal', 'create', NULL),
  ('therapeutic-goal:read',   'therapeutic-goal', 'read',   NULL),
  ('therapeutic-goal:update', 'therapeutic-goal', 'update', NULL),
  ('therapeutic-goal:delete', 'therapeutic-goal', 'delete', NULL),
  ('agenda-item:create', 'agenda-item', 'create', NULL),
  ('agenda-item:read',   'agenda-item', 'read',   NULL),
  ('agenda-item:update', 'agenda-item', 'update', NULL),
  ('agenda-item:delete', 'agenda-item', 'delete', NULL)
ON CONFLICT (name) DO NOTHING;

-- 3. Grant patient role: validation-request:create, validation-request:read, connection:read, connection:update,
--    grant:create, grant:delete, all shared-list permissions
WITH patient_role AS (SELECT id FROM roles WHERE name = 'patient'),
     perms AS (
       SELECT id FROM permissions WHERE name IN (
         'provider-validation-request:create',
         'provider-validation-request:read',
         'patient-provider-connection:read',
         'patient-provider-connection:update',
         'shared-resource-grant:create',
         'shared-resource-grant:delete',
         'todo-item:create','todo-item:read','todo-item:update','todo-item:delete',
         'therapeutic-goal:create','therapeutic-goal:read','therapeutic-goal:update','therapeutic-goal:delete',
         'agenda-item:create','agenda-item:read','agenda-item:update','agenda-item:delete'
       )
     )
INSERT INTO role_permissions (role_id, permission_id)
SELECT patient_role.id, perms.id FROM patient_role, perms
ON CONFLICT DO NOTHING;

-- 4. Grant healthcare_provider role: connection:create + read + update,
--    all shared-list permissions, AND the same patient permissions (since they're also a patient)
WITH provider_role AS (SELECT id FROM roles WHERE name = 'healthcare_provider'),
     perms AS (
       SELECT id FROM permissions WHERE name IN (
         'patient-provider-connection:create',
         'patient-provider-connection:read',
         'patient-provider-connection:update',
         'todo-item:create','todo-item:read','todo-item:update','todo-item:delete',
         'therapeutic-goal:create','therapeutic-goal:read','therapeutic-goal:update','therapeutic-goal:delete',
         'agenda-item:create','agenda-item:read','agenda-item:update','agenda-item:delete'
       )
     )
INSERT INTO role_permissions (role_id, permission_id)
SELECT provider_role.id, perms.id FROM provider_role, perms
ON CONFLICT DO NOTHING;

-- 5. Grant admin role: provider-validation-request:manage
--    (admin already has 'all:manage' but explicit is clearer for audits)
WITH admin_role AS (SELECT id FROM roles WHERE name = 'admin'),
     perms AS (SELECT id FROM permissions WHERE name = 'provider-validation-request:manage')
INSERT INTO role_permissions (role_id, permission_id)
SELECT admin_role.id, perms.id FROM admin_role, perms
ON CONFLICT DO NOTHING;
```

### 2.8 RLS Policies

Each new table gets RLS. Pattern below — adapt for each table.

```sql
-- provider_validation_requests
ALTER TABLE provider_validation_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY pvr_select_own_or_admin ON provider_validation_requests
  FOR SELECT
  USING (user_id = auth.uid() OR is_admin_user());

CREATE POLICY pvr_insert_own ON provider_validation_requests
  FOR INSERT
  WITH CHECK (user_id = auth.uid() AND status = 'pending');

CREATE POLICY pvr_update_admin ON provider_validation_requests
  FOR UPDATE
  USING (is_admin_user());

-- patient_provider_connections
ALTER TABLE patient_provider_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY ppc_select_either_party ON patient_provider_connections
  FOR SELECT
  USING (patient_id = auth.uid() OR provider_id = auth.uid() OR is_admin_user());

CREATE POLICY ppc_insert_provider_only ON patient_provider_connections
  FOR INSERT
  WITH CHECK (
    initiated_by = auth.uid()
    AND provider_id = auth.uid()
    AND user_has_role('healthcare_provider')
    AND status = 'pending'
  );

CREATE POLICY ppc_update_either_party ON patient_provider_connections
  FOR UPDATE
  USING (patient_id = auth.uid() OR provider_id = auth.uid() OR is_admin_user());

-- shared_resource_grants
ALTER TABLE shared_resource_grants ENABLE ROW LEVEL SECURITY;

CREATE POLICY srg_select_either_party ON shared_resource_grants
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM patient_provider_connections c
      WHERE c.id = shared_resource_grants.connection_id
        AND (c.patient_id = auth.uid() OR c.provider_id = auth.uid() OR is_admin_user())
    )
  );

CREATE POLICY srg_insert_patient_only ON shared_resource_grants
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM patient_provider_connections c
      WHERE c.id = shared_resource_grants.connection_id
        AND c.patient_id = auth.uid()
        AND c.status = 'active'
    )
  );

CREATE POLICY srg_update_patient_only ON shared_resource_grants
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM patient_provider_connections c
      WHERE c.id = shared_resource_grants.connection_id
        AND c.patient_id = auth.uid()
    )
  );

-- todo_items, therapeutic_goals, agenda_items: same pattern as shared_resource_grants for SELECT.
-- INSERT requires either party of an ACTIVE connection.
-- UPDATE: either party can mark done; only created_by can edit other fields (enforced in server action).
-- DELETE: only created_by.
ALTER TABLE todo_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY ti_select_either_party ON todo_items
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM patient_provider_connections c
      WHERE c.id = todo_items.connection_id
        AND (c.patient_id = auth.uid() OR c.provider_id = auth.uid() OR is_admin_user())
    )
  );

CREATE POLICY ti_insert_active_connection ON todo_items
  FOR INSERT
  WITH CHECK (
    created_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM patient_provider_connections c
      WHERE c.id = todo_items.connection_id
        AND c.status = 'active'
        AND (c.patient_id = auth.uid() OR c.provider_id = auth.uid())
    )
  );

CREATE POLICY ti_update_either_party ON todo_items
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM patient_provider_connections c
      WHERE c.id = todo_items.connection_id
        AND (c.patient_id = auth.uid() OR c.provider_id = auth.uid())
    )
  );

CREATE POLICY ti_delete_creator_only ON todo_items
  FOR DELETE
  USING (created_by = auth.uid());

-- Repeat the same 4 policies for therapeutic_goals and agenda_items.
```

> **Important:** All policies reference `is_admin_user()` and `user_has_role(...)` — these helper functions already exist in your Supabase project (visible in `database.types.ts` Functions section). If they don't, define them or replace with inline subqueries.

---

## 3. Migrations

Create three files under `frontend/supabase/migrations/` with the convention `YYYYMMDDHHMMSS_<name>.sql`:

### 3.1 `<ts>_provider_audit_actions.sql`

Adds the 9 new audit action enum values. Run this **first** so the next migration can use them in seed data if needed.

```sql
-- Migration: extend audit_action enum
-- WARNING: Postgres ENUM additions are one-way. Removing a value requires
-- recreating the type and migrating data.

ALTER TYPE audit_action ADD VALUE IF NOT EXISTS 'provider_validation_requested';
ALTER TYPE audit_action ADD VALUE IF NOT EXISTS 'provider_validation_approved';
ALTER TYPE audit_action ADD VALUE IF NOT EXISTS 'provider_validation_rejected';
ALTER TYPE audit_action ADD VALUE IF NOT EXISTS 'connection_invited';
ALTER TYPE audit_action ADD VALUE IF NOT EXISTS 'connection_accepted';
ALTER TYPE audit_action ADD VALUE IF NOT EXISTS 'connection_rejected';
ALTER TYPE audit_action ADD VALUE IF NOT EXISTS 'connection_ended';
ALTER TYPE audit_action ADD VALUE IF NOT EXISTS 'resource_shared';
ALTER TYPE audit_action ADD VALUE IF NOT EXISTS 'resource_share_revoked';
```

### 3.2 `<ts>_provider_connections_schema.sql`

Tables, ENUMs, indexes, trigger, RLS. Use the SQL blocks in section 2.

### 3.3 `<ts>_provider_role_seed.sql`

Role + permissions + role_permissions wiring. Use the SQL block in section 2.7.

### 3.4 Apply locally

```bash
cd frontend
npx supabase db push          # apply pending migrations
# OR for a clean reset (DESTRUCTIVE — wipes local data):
# npx supabase db reset
```

### 3.5 Regenerate types

After migrations apply:

```bash
cd frontend
npx supabase gen types typescript --project-id <YOUR_PROJECT_ID> > lib/supabase/database.types.ts
# OR for local Supabase:
# npx supabase gen types typescript --local > lib/supabase/database.types.ts
```

Commit the regenerated `database.types.ts`.

---

## 4. Constants & Schemas

### 4.1 New file: `frontend/lib/constants.ts`

```ts
export const MAX_DOCTORS_PER_PATIENT = 2;

export const BR_UF_CODES = [
  'AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG',
  'PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO',
] as const;

export type BrUfCode = (typeof BR_UF_CODES)[number];
```

### 4.2 New file: `frontend/lib/schemas/provider-schemas.ts`

Follow the pattern in `lib/schemas/auth-schemas.ts` — Brazilian Portuguese error messages.

```ts
import { z } from 'zod';
import { BR_UF_CODES } from '@/lib/constants';

export const ValidationRequestSchema = z.object({
  council_type: z.enum(['CRM', 'CRP'], {
    message: 'Selecione o tipo de conselho',
  }),
  council_state: z.enum(BR_UF_CODES, {
    message: 'Selecione o estado',
  }),
  council_number: z
    .string()
    .min(3, 'Número de registro inválido')
    .max(20, 'Número de registro inválido')
    .regex(/^[A-Z0-9./-]+$/i, 'Apenas letras, números e os caracteres . / -'),
  full_name: z.string().min(2, 'Nome completo é obrigatório').max(200),
  specialty: z.string().max(200).optional(),
  bio: z.string().max(2000).optional(),
});
export type ValidationRequestInput = z.infer<typeof ValidationRequestSchema>;

export const ConnectionInviteSchema = z.object({
  patient_email: z.email('E-mail inválido'),
  invite_message: z.string().max(500).optional(),
});
export type ConnectionInviteInput = z.infer<typeof ConnectionInviteSchema>;

export const GrantResourceSchema = z.object({
  connection_id: z.uuid(),
  resource_type: z.enum([
    'inventory_responses',
    'dose_logs',
    'todo_items',
    'therapeutic_goals',
    'agenda_items',
  ]),
});
export type GrantResourceInput = z.infer<typeof GrantResourceSchema>;
```

---

## 5. Server Actions

All new server actions follow the canonical pattern (study `lib/actions/supabase-journal.ts` lines 23-127 for reference):

1. `'use server'` directive
2. `const supabase = await createClient()`
3. `const { data: { user }, error } = await supabase.auth.getUser()` — fail fast if not auth'd
4. Validate input with Zod schema
5. Perform the operation
6. `await logAuditTrail({ action, resource, resourceId, details })` — non-blocking
7. `revalidatePath(...)` if applicable
8. Return `{ success: true, data }` or `{ success: false, error }`

### 5.1 New file: `frontend/lib/actions/supabase-provider-validation.ts`

```ts
'use server';

import { revalidatePath } from 'next/cache';
import { createClient, logAuditTrail, getAuthenticatedUser } from '@/lib/supabase/server';
import { ValidationRequestSchema, type ValidationRequestInput } from '@/lib/schemas/provider-schemas';
import { getRequestMetadata } from '@/lib/actions/supabase-auth';

export async function submitValidationRequest(input: ValidationRequestInput) {
  const supabase = await createClient();
  const user = await getAuthenticatedUser();
  if (!user) return { success: false, error: 'Não autenticado' };

  const parsed = ValidationRequestSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? 'Dados inválidos' };
  }

  // Check if there's already a pending request
  const { data: existing } = await supabase
    .from('provider_validation_requests')
    .select('id')
    .eq('user_id', user.id)
    .eq('status', 'pending')
    .maybeSingle();

  if (existing) {
    return { success: false, error: 'Você já tem uma solicitação pendente' };
  }

  const { data, error } = await supabase
    .from('provider_validation_requests')
    .insert({ user_id: user.id, ...parsed.data })
    .select()
    .single();

  if (error) {
    console.error('submitValidationRequest:', error);
    return { success: false, error: 'Erro ao enviar solicitação' };
  }

  const meta = await getRequestMetadata();
  await logAuditTrail({
    action: 'provider_validation_requested',
    resource: 'provider_validation_request',
    resourceId: data.id,
    details: { council_type: data.council_type, council_state: data.council_state },
    ...meta,
  });

  revalidatePath('/profile/professional');
  return { success: true, data };
}

export async function getMyValidationRequest() {
  const supabase = await createClient();
  const user = await getAuthenticatedUser();
  if (!user) return { success: false, error: 'Não autenticado' };

  const { data, error } = await supabase
    .from('provider_validation_requests')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) return { success: false, error: 'Erro ao buscar solicitação' };
  return { success: true, data };
}

// Admin-only actions
export async function listPendingValidationRequests() {
  const userData = await import('@/lib/supabase/server').then(m => m.getUserWithRolesAndPermissions());
  if (!userData?.hasRole('admin')) {
    return { success: false, error: 'Acesso negado' };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('provider_validation_requests')
    .select('*, profile:profiles!user_id(id, name, surname, email)')
    .eq('status', 'pending')
    .order('created_at', { ascending: true });

  if (error) return { success: false, error: 'Erro ao buscar solicitações' };
  return { success: true, data };
}

export async function approveValidationRequest(requestId: string) {
  const userData = await import('@/lib/supabase/server').then(m => m.getUserWithRolesAndPermissions());
  if (!userData?.hasRole('admin')) {
    return { success: false, error: 'Acesso negado' };
  }
  const adminId = userData.user.id;

  const supabase = await createClient();

  // Fetch the request
  const { data: request, error: fetchError } = await supabase
    .from('provider_validation_requests')
    .select('*')
    .eq('id', requestId)
    .eq('status', 'pending')
    .single();

  if (fetchError || !request) {
    return { success: false, error: 'Solicitação não encontrada' };
  }

  // Update status
  const { error: updateError } = await supabase
    .from('provider_validation_requests')
    .update({
      status: 'approved',
      reviewed_by: adminId,
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', requestId);

  if (updateError) {
    console.error('approveValidationRequest update:', updateError);
    return { success: false, error: 'Erro ao aprovar' };
  }

  // Assign healthcare_provider role
  const { data: role } = await supabase
    .from('roles')
    .select('id')
    .eq('name', 'healthcare_provider')
    .single();

  if (role) {
    await supabase
      .from('user_roles')
      .insert({
        user_id: request.user_id,
        role_id: role.id,
        assigned_by: adminId,
      })
      .onConflict('user_id,role_id');  // ignore if exists — Supabase syntax varies; use upsert if needed
  }

  const meta = await getRequestMetadata();
  await logAuditTrail({
    action: 'provider_validation_approved',
    resource: 'provider_validation_request',
    resourceId: requestId,
    details: { user_id: request.user_id },
    ...meta,
  });
  await logAuditTrail({
    action: 'role_assigned',
    resource: 'user_role',
    resourceId: request.user_id,
    details: { role: 'healthcare_provider', via: 'validation_approval' },
    ...meta,
  });

  revalidatePath('/admin/provider-validations');
  return { success: true };
}

export async function rejectValidationRequest(requestId: string, reason: string) {
  const userData = await import('@/lib/supabase/server').then(m => m.getUserWithRolesAndPermissions());
  if (!userData?.hasRole('admin')) {
    return { success: false, error: 'Acesso negado' };
  }
  const adminId = userData.user.id;

  const supabase = await createClient();
  const { error } = await supabase
    .from('provider_validation_requests')
    .update({
      status: 'rejected',
      reviewed_by: adminId,
      reviewed_at: new Date().toISOString(),
      rejection_reason: reason,
    })
    .eq('id', requestId)
    .eq('status', 'pending');

  if (error) return { success: false, error: 'Erro ao rejeitar' };

  const meta = await getRequestMetadata();
  await logAuditTrail({
    action: 'provider_validation_rejected',
    resource: 'provider_validation_request',
    resourceId: requestId,
    details: { reason },
    ...meta,
  });

  revalidatePath('/admin/provider-validations');
  return { success: true };
}
```

> **Note:** The `.onConflict(...)` syntax above is illustrative — use `.upsert({...}, { onConflict: 'user_id,role_id' })` if `user_roles` allows it, or wrap in a try/catch on the unique-violation error code.

### 5.2 New file: `frontend/lib/actions/supabase-connections.ts`

```ts
'use server';

import { revalidatePath } from 'next/cache';
import { createClient, logAuditTrail, getUserWithRolesAndPermissions } from '@/lib/supabase/server';
import { ConnectionInviteSchema, type ConnectionInviteInput } from '@/lib/schemas/provider-schemas';
import { getRequestMetadata } from '@/lib/actions/supabase-auth';
import { MAX_DOCTORS_PER_PATIENT } from '@/lib/constants';

export async function inviteConnection(input: ConnectionInviteInput) {
  const userData = await getUserWithRolesAndPermissions();
  if (!userData) return { success: false, error: 'Não autenticado' };
  if (!userData.hasRole('healthcare_provider')) {
    return { success: false, error: 'Apenas profissionais validados podem convidar pacientes' };
  }

  const parsed = ConnectionInviteSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? 'Dados inválidos' };
  }

  const supabase = await createClient();

  // Find patient by email
  const { data: patient, error: patientError } = await supabase
    .from('profiles')
    .select('id')
    .eq('email', parsed.data.patient_email.toLowerCase())
    .maybeSingle();

  if (patientError || !patient) {
    return { success: false, error: 'Paciente não encontrado com este e-mail' };
  }

  if (patient.id === userData.user.id) {
    return { success: false, error: 'Você não pode se conectar a si mesmo' };
  }

  // Pre-check patient's connection limit (server-side; trigger is the safety net)
  const { count } = await supabase
    .from('patient_provider_connections')
    .select('id', { count: 'exact', head: true })
    .eq('patient_id', patient.id)
    .in('status', ['pending', 'active']);

  if ((count ?? 0) >= MAX_DOCTORS_PER_PATIENT) {
    return { success: false, error: 'Este paciente já atingiu o limite de profissionais conectados' };
  }

  const { data, error } = await supabase
    .from('patient_provider_connections')
    .insert({
      patient_id: patient.id,
      provider_id: userData.user.id,
      initiated_by: userData.user.id,
      invite_message: parsed.data.invite_message,
      status: 'pending',
    })
    .select()
    .single();

  if (error) {
    if (error.message.includes('PATIENT_PROVIDER_LIMIT_EXCEEDED')) {
      return { success: false, error: 'Este paciente já atingiu o limite de profissionais' };
    }
    if (error.code === '23505') {
      return { success: false, error: 'Já existe um convite ou conexão com este paciente' };
    }
    console.error('inviteConnection:', error);
    return { success: false, error: 'Erro ao enviar convite' };
  }

  const meta = await getRequestMetadata();
  await logAuditTrail({
    action: 'connection_invited',
    resource: 'patient_provider_connection',
    resourceId: data.id,
    details: { patient_id: patient.id },
    ...meta,
  });

  revalidatePath('/patients');
  return { success: true, data };
}

export async function getMyConnections() {
  const userData = await getUserWithRolesAndPermissions();
  if (!userData) return { success: false, error: 'Não autenticado' };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('patient_provider_connections')
    .select(`
      *,
      patient:profiles!patient_id(id, name, surname, email, profile_picture_url),
      provider:profiles!provider_id(id, name, surname, email, profile_picture_url),
      grants:shared_resource_grants(id, resource_type, granted_at, revoked_at)
    `)
    .or(`patient_id.eq.${userData.user.id},provider_id.eq.${userData.user.id}`)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('getMyConnections:', error);
    return { success: false, error: 'Erro ao buscar conexões' };
  }

  return { success: true, data };
}

export async function acceptConnection(connectionId: string) {
  const userData = await getUserWithRolesAndPermissions();
  if (!userData) return { success: false, error: 'Não autenticado' };

  const supabase = await createClient();

  // Verify patient is the one accepting
  const { data: connection, error: fetchError } = await supabase
    .from('patient_provider_connections')
    .select('id, patient_id, status')
    .eq('id', connectionId)
    .single();

  if (fetchError || !connection) return { success: false, error: 'Convite não encontrado' };
  if (connection.patient_id !== userData.user.id) {
    return { success: false, error: 'Apenas o paciente convidado pode aceitar' };
  }
  if (connection.status !== 'pending') {
    return { success: false, error: 'Este convite não está mais pendente' };
  }

  const { error } = await supabase
    .from('patient_provider_connections')
    .update({ status: 'active', accepted_at: new Date().toISOString() })
    .eq('id', connectionId);

  if (error) {
    if (error.message.includes('PATIENT_PROVIDER_LIMIT_EXCEEDED')) {
      return { success: false, error: 'Você já tem 2 profissionais conectados' };
    }
    return { success: false, error: 'Erro ao aceitar convite' };
  }

  const meta = await getRequestMetadata();
  await logAuditTrail({
    action: 'connection_accepted',
    resource: 'patient_provider_connection',
    resourceId: connectionId,
    ...meta,
  });

  revalidatePath('/connections');
  return { success: true };
}

export async function rejectConnection(connectionId: string) {
  const userData = await getUserWithRolesAndPermissions();
  if (!userData) return { success: false, error: 'Não autenticado' };

  const supabase = await createClient();
  const { data: connection, error: fetchError } = await supabase
    .from('patient_provider_connections')
    .select('patient_id, status')
    .eq('id', connectionId)
    .single();

  if (fetchError || !connection) return { success: false, error: 'Convite não encontrado' };
  if (connection.patient_id !== userData.user.id) {
    return { success: false, error: 'Apenas o paciente convidado pode rejeitar' };
  }
  if (connection.status !== 'pending') {
    return { success: false, error: 'Este convite não está mais pendente' };
  }

  const { error } = await supabase
    .from('patient_provider_connections')
    .update({ status: 'rejected', rejected_at: new Date().toISOString() })
    .eq('id', connectionId);

  if (error) return { success: false, error: 'Erro ao rejeitar convite' };

  const meta = await getRequestMetadata();
  await logAuditTrail({
    action: 'connection_rejected',
    resource: 'patient_provider_connection',
    resourceId: connectionId,
    ...meta,
  });

  revalidatePath('/connections');
  return { success: true };
}

export async function endConnection(connectionId: string) {
  const userData = await getUserWithRolesAndPermissions();
  if (!userData) return { success: false, error: 'Não autenticado' };

  const supabase = await createClient();
  const { data: connection, error: fetchError } = await supabase
    .from('patient_provider_connections')
    .select('patient_id, provider_id, status')
    .eq('id', connectionId)
    .single();

  if (fetchError || !connection) return { success: false, error: 'Conexão não encontrada' };
  if (connection.patient_id !== userData.user.id && connection.provider_id !== userData.user.id) {
    return { success: false, error: 'Acesso negado' };
  }
  if (connection.status !== 'active') {
    return { success: false, error: 'Apenas conexões ativas podem ser encerradas' };
  }

  const { error } = await supabase
    .from('patient_provider_connections')
    .update({
      status: 'ended',
      ended_at: new Date().toISOString(),
      ended_by: userData.user.id,
    })
    .eq('id', connectionId);

  if (error) return { success: false, error: 'Erro ao encerrar conexão' };

  const meta = await getRequestMetadata();
  await logAuditTrail({
    action: 'connection_ended',
    resource: 'patient_provider_connection',
    resourceId: connectionId,
    details: { ended_by_role: connection.patient_id === userData.user.id ? 'patient' : 'provider' },
    ...meta,
  });

  revalidatePath('/connections');
  revalidatePath('/patients');
  return { success: true };
}
```

### 5.3 New file: `frontend/lib/actions/supabase-shared-grants.ts`

```ts
'use server';

import { revalidatePath } from 'next/cache';
import { createClient, logAuditTrail, getAuthenticatedUser } from '@/lib/supabase/server';
import { GrantResourceSchema, type GrantResourceInput } from '@/lib/schemas/provider-schemas';
import { getRequestMetadata } from '@/lib/actions/supabase-auth';

export async function grantResource(input: GrantResourceInput) {
  const user = await getAuthenticatedUser();
  if (!user) return { success: false, error: 'Não autenticado' };

  const parsed = GrantResourceSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: 'Dados inválidos' };

  const supabase = await createClient();

  // Verify the connection belongs to this user as patient and is active
  const { data: connection } = await supabase
    .from('patient_provider_connections')
    .select('id, patient_id, status')
    .eq('id', parsed.data.connection_id)
    .single();

  if (!connection || connection.patient_id !== user.id || connection.status !== 'active') {
    return { success: false, error: 'Conexão inválida' };
  }

  // Upsert: re-grant a previously revoked resource by inserting fresh row,
  // OR no-op if active grant already exists (UNIQUE INDEX prevents duplicates)
  const { data: existing } = await supabase
    .from('shared_resource_grants')
    .select('id')
    .eq('connection_id', parsed.data.connection_id)
    .eq('resource_type', parsed.data.resource_type)
    .is('revoked_at', null)
    .maybeSingle();

  if (existing) return { success: true, data: existing };

  const { data, error } = await supabase
    .from('shared_resource_grants')
    .insert({
      connection_id: parsed.data.connection_id,
      resource_type: parsed.data.resource_type,
    })
    .select()
    .single();

  if (error) return { success: false, error: 'Erro ao compartilhar' };

  const meta = await getRequestMetadata();
  await logAuditTrail({
    action: 'resource_shared',
    resource: 'shared_resource_grant',
    resourceId: data.id,
    details: { resource_type: parsed.data.resource_type, connection_id: parsed.data.connection_id },
    ...meta,
  });

  revalidatePath('/connections');
  return { success: true, data };
}

export async function revokeResource(grantId: string) {
  const user = await getAuthenticatedUser();
  if (!user) return { success: false, error: 'Não autenticado' };

  const supabase = await createClient();

  // Verify ownership via connection
  const { data: grant } = await supabase
    .from('shared_resource_grants')
    .select('id, resource_type, connection_id, connection:patient_provider_connections!connection_id(patient_id)')
    .eq('id', grantId)
    .single();

  if (!grant || (grant as any).connection?.patient_id !== user.id) {
    return { success: false, error: 'Acesso negado' };
  }

  const { error } = await supabase
    .from('shared_resource_grants')
    .update({ revoked_at: new Date().toISOString() })
    .eq('id', grantId)
    .is('revoked_at', null);

  if (error) return { success: false, error: 'Erro ao revogar' };

  const meta = await getRequestMetadata();
  await logAuditTrail({
    action: 'resource_share_revoked',
    resource: 'shared_resource_grant',
    resourceId: grantId,
    details: { resource_type: grant.resource_type, connection_id: grant.connection_id },
    ...meta,
  });

  revalidatePath('/connections');
  return { success: true };
}
```

### 5.4 New file: `frontend/lib/actions/connection-access.ts`

Helper used by provider-side reads.

```ts
'use server';

import { createClient } from '@/lib/supabase/server';
import type { Database } from '@/lib/supabase/database.types';

type SharedResourceType = Database['public']['Enums']['shared_resource_type'];

export async function assertProviderCanAccessPatientResource(
  providerId: string,
  patientId: string,
  resourceType: SharedResourceType,
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();

  const { data: connection } = await supabase
    .from('patient_provider_connections')
    .select('id, status')
    .eq('provider_id', providerId)
    .eq('patient_id', patientId)
    .eq('status', 'active')
    .maybeSingle();

  if (!connection) return { ok: false, error: 'Não há conexão ativa com este paciente' };

  const { data: grant } = await supabase
    .from('shared_resource_grants')
    .select('id')
    .eq('connection_id', connection.id)
    .eq('resource_type', resourceType)
    .is('revoked_at', null)
    .maybeSingle();

  if (!grant) return { ok: false, error: 'Este recurso não foi compartilhado' };

  return { ok: true };
}
```

### 5.5 Extend `frontend/lib/actions/supabase-inventories.ts`

Add a new exported action for provider-side reads (do **not** modify existing patient-side queries):

```ts
export async function getInventoryResponsesForPatient(patientId: string) {
  const userData = await getUserWithRolesAndPermissions();
  if (!userData) return { success: false, error: 'Não autenticado' };

  const access = await assertProviderCanAccessPatientResource(
    userData.user.id,
    patientId,
    'inventory_responses',
  );
  if (!access.ok) return { success: false, error: access.error };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('inventory_responses')
    .select('*, inventory:inventories(name, title)')
    .eq('user_id', patientId)
    .is('deleted_at', null)
    .order('completed_at', { ascending: false });

  if (error) return { success: false, error: 'Erro ao buscar respostas' };

  // Audit the read for compliance
  const meta = await getRequestMetadata();
  await logAuditTrail({
    action: 'sensitive_data_access',
    resource: 'inventory_response',
    details: { accessed_user_id: patientId, count: data.length },
    ...meta,
  });

  return { success: true, data };
}
```

### 5.6 Extend `frontend/lib/actions/supabase-dose-logs.ts`

Same pattern:

```ts
export async function getDoseLogsForPatient(
  patientId: string,
  daysBack: number = 30,
) {
  const userData = await getUserWithRolesAndPermissions();
  if (!userData) return { success: false, error: 'Não autenticado' };

  const access = await assertProviderCanAccessPatientResource(
    userData.user.id,
    patientId,
    'dose_logs',
  );
  if (!access.ok) return { success: false, error: access.error };

  const supabase = await createClient();
  const since = new Date();
  since.setDate(since.getDate() - daysBack);

  const { data, error } = await supabase
    .from('dose_logs')
    .select('*, medication:medications(name, dosage, form)')
    .eq('user_id', patientId)
    .gte('timestamp', since.toISOString())
    .order('timestamp', { ascending: false });

  if (error) return { success: false, error: 'Erro ao buscar registros' };

  const meta = await getRequestMetadata();
  await logAuditTrail({
    action: 'sensitive_data_access',
    resource: 'dose_log',
    details: { accessed_user_id: patientId, days_back: daysBack },
    ...meta,
  });

  return { success: true, data };
}
```

---

## 6. UI Pages and Components

### 6.1 Pages to create

| Path | Purpose |
|---|---|
| `app/(dashboard)/profile/professional/page.tsx` | Validation request form (server component, redirects if user already validated or has pending) |
| `app/(dashboard)/connections/page.tsx` | Patient view: pending invites, active connections, sharing toggles |
| `app/(dashboard)/patients/page.tsx` | Provider view: list of connected patients (gated by `healthcare_provider` role) |
| `app/(dashboard)/patients/[patientId]/page.tsx` | Provider's read-only view of one patient's shared resources |
| `app/(admin)/admin/provider-validations/page.tsx` | Admin moderation UI (mirror of `app/(admin)/admin/testimonials/page.tsx`) |

### 6.2 Components to create (under `components/connections/`)

- `validation-request-form.tsx` — RHF + Zod, follows `components/profile/profile-tab.tsx` pattern
- `validation-status-card.tsx` — Shows pending/approved/rejected state
- `connection-invite-form.tsx` — Provider-side form, single email + optional message
- `pending-invite-card.tsx` — Patient-side, with Accept / Reject buttons
- `connection-card.tsx` — Active connection display, both sides, with End button
- `sharing-toggles.tsx` — Per-resource switches; calls `grantResource`/`revokeResource`
- `patient-resource-tabs.tsx` — Provider's tabbed read-only view; tabs visible only for granted resources

### 6.3 Navigation updates

Find your Header/Sidebar (likely `components/Header.tsx` — check for navigation menu). Add:

- "Conexões" link for all authenticated users → `/connections`
- "Pacientes" link visible only when `useUser().hasRole('healthcare_provider')` → `/patients`
- "Validações" admin link inside admin section → `/admin/provider-validations`

### 6.4 Profile page entry point

Modify `app/(dashboard)/profile/page.tsx` to add (conditionally rendered):

```tsx
{!hasRole('healthcare_provider') && (
  <Link href="/profile/professional">
    Sou profissional? Solicitar validação
  </Link>
)}
```

### 6.5 Route protection

Use the existing `ProtectedRoute` (find via `grep -r "ProtectedRoute" frontend/components/`). Examples:

```tsx
// app/(dashboard)/patients/page.tsx
<ProtectedRoute requiredRoles={['healthcare_provider']}>
  {/* ... */}
</ProtectedRoute>

// app/(admin)/admin/provider-validations/page.tsx
<ProtectedRoute requiredRoles={['admin']}>
  {/* ... */}
</ProtectedRoute>
```

If `ProtectedRoute` does not exist, create a `<HealthcareProviderGate>` wrapper using `useUser().hasRole(...)`.

### 6.6 Admin moderation UI

Mirror the existing `app/(admin)/admin/testimonials/page.tsx` (currently stubbed — section 3.6 of the codebase audit) with these adaptations:

- Tabs: Pendentes / Aprovadas / Rejeitadas / Todas
- Card content: full_name, council_type + state + number, specialty, bio, document link
- Actions: Approve (calls `approveValidationRequest`), Reject (calls `rejectValidationRequest` with required reason input)
- Confirmation dialog before approve/reject

---

## 7. Build Sequence

Execute in this order — each step is independently testable:

| # | Step | Verify by |
|---|------|-----------|
| 1 | Apply migration #1 (extend `audit_action` enum) | `SELECT enum_range(NULL::audit_action);` shows new values |
| 2 | Apply migration #2 (schema + trigger + RLS) | Tables exist; insert blocked by RLS unless authenticated |
| 3 | Apply migration #3 (role + permissions seed) | `SELECT * FROM roles WHERE name = 'healthcare_provider'` |
| 4 | Regenerate `database.types.ts` | New types appear; `pnpm type-check` passes |
| 5 | Implement validation-request server actions | Manually test via a test page or `node` REPL |
| 6 | Build `/profile/professional` page + form | Submit a request as patient; appears in DB |
| 7 | Build admin moderation page | Approve a request; verify role assigned in `user_roles` |
| 8 | Implement connection server actions | Test invite/accept flows in DB |
| 9 | Build `/connections` (patient view) and `/patients` (provider view) | E2E invite/accept |
| 10 | Implement grant/revoke server actions | Toggle in UI; row appears/updates |
| 11 | Implement provider-side reads (`getInventoryResponsesForPatient`, etc.) | Provider can/can't see based on grant |
| 12 | Build `/patients/[patientId]` resource tabs | E2E: patient toggles → provider visibility changes |
| 13 | Audit log spot-check | Query `audit_logs` for the 9 new action types |
| 14 | Full smoke test (section 8) | All steps pass |

---

## 8. Verification

### 8.1 Local development

```bash
cd frontend

# Apply migrations
npx supabase db push        # or db reset for clean slate (DESTRUCTIVE)

# Regenerate types
npx supabase gen types typescript --local > lib/supabase/database.types.ts

# Type and lint
pnpm type-check
pnpm lint:ci

# Run dev server (note: --webpack is required, do NOT remove)
pnpm dev
```

### 8.2 Schema sanity checks (psql or Supabase Studio)

```sql
-- Tables
SELECT tablename FROM pg_tables WHERE schemaname = 'public'
  AND tablename IN ('provider_validation_requests', 'patient_provider_connections',
                    'shared_resource_grants', 'todo_items', 'therapeutic_goals', 'agenda_items');

-- ENUMs
SELECT enum_range(NULL::provider_validation_status);
SELECT enum_range(NULL::connection_status);
SELECT enum_range(NULL::shared_resource_type);
SELECT enum_range(NULL::audit_action);  -- should include 9 new values

-- Trigger
SELECT tgname FROM pg_trigger WHERE tgname = 'patient_provider_limit_trigger';

-- RLS
SELECT tablename, rowsecurity FROM pg_tables
  WHERE schemaname = 'public' AND tablename LIKE '%connection%' OR tablename LIKE '%grant%';

-- Role
SELECT * FROM roles WHERE name = 'healthcare_provider';

-- Permissions
SELECT * FROM permissions WHERE resource LIKE 'patient-provider%' OR resource LIKE 'shared-resource%';
```

### 8.3 Trigger test (patient limit)

```sql
-- As patient X with 0 connections, accept 2 invites — both succeed.
-- Attempt a 3rd:
UPDATE patient_provider_connections SET status = 'active' WHERE id = '<3rd_pending_id>';
-- Expected: ERROR: PATIENT_PROVIDER_LIMIT_EXCEEDED
```

### 8.4 RLS test

Using two browser sessions or Supabase JS clients with different JWTs:

- Session A (patient X): `SELECT * FROM patient_provider_connections WHERE patient_id != X` → returns 0 rows
- Session A: `SELECT * FROM shared_resource_grants` → only sees grants for connections involving X
- Session B (provider Y, no connection to X): `SELECT * FROM dose_logs WHERE user_id = X` → 0 rows (because no RLS on dose_logs, but `getDoseLogsForPatient(X)` returns "Não há conexão ativa")

### 8.5 Full E2E smoke test

Two browser sessions:

1. **Provider session**:
   - Sign up as a new user (becomes `patient` role by default)
   - Go to `/profile/professional`, submit CRM/CRP request
   - Wait for admin approval

2. **Admin session**:
   - Login as admin (you'll need to manually grant admin role for testing — `INSERT INTO user_roles (user_id, role_id) SELECT '<admin_user_id>', id FROM roles WHERE name = 'admin'`)
   - Go to `/admin/provider-validations`
   - Approve the request
   - Verify in DB: `SELECT * FROM user_roles WHERE user_id = '<provider_id>'` shows both `patient` and `healthcare_provider`

3. **Provider session** (refresh):
   - Navigate to `/patients` (now visible)
   - Click "Convidar paciente", enter test patient's email, submit
   - Connection row created with status `pending`

4. **Patient session** (different account):
   - Sign up as a new patient
   - Go to `/connections`
   - See the pending invite from the provider
   - Click "Aceitar"
   - Connection now `active`
   - Toggle "Compartilhar respostas de inventário" ON
   - Submit a PHQ-9 questionnaire response

5. **Provider session**:
   - Refresh `/patients` — patient appears in active list
   - Click patient → `/patients/[patientId]`
   - "Inventários" tab shows the PHQ-9 result
   - "Medicações" tab is empty (not granted)

6. **Patient session**:
   - Toggle "Compartilhar respostas de inventário" OFF
   - Provider refresh → "Inventários" tab now shows "Não compartilhado"

7. **Either session**:
   - Click "Encerrar conexão"
   - Connection status becomes `ended`
   - Provider's patient list no longer shows this patient
   - Patient's connection list shows it as ended

### 8.6 Audit log verification

```sql
SELECT action, COUNT(*) FROM audit_logs
WHERE action IN (
  'provider_validation_requested',
  'provider_validation_approved',
  'connection_invited',
  'connection_accepted',
  'resource_shared',
  'resource_share_revoked',
  'connection_ended'
)
GROUP BY action;
```

All 7 actions should have count >= 1 after the smoke test.

---

## 9. Reference: Existing Files to Study

When implementing each piece, study these files for the existing pattern:

| Implementing | Study | Why |
|---|---|---|
| Validation-request status enum + audit columns | `frontend/lib/supabase/database.types.ts` (testimonials), `backend/src/modules/testimonial/testimonial.service.ts` lines 63-103 | Same pending/approved/rejected pattern |
| Admin moderation UI | `frontend/app/(admin)/admin/testimonials/page.tsx` | Tabs, cards, action buttons (currently stubbed but layout is reusable) |
| Server action structure (auth → validate → mutate → audit → revalidate) | `frontend/lib/actions/supabase-journal.ts` lines 23-127 | Canonical pattern |
| RHF + Zod form | `frontend/components/profile/profile-tab.tsx`, `frontend/lib/schemas/profile-schemas.ts` | Form integration with zodResolver |
| Auth helpers usage | `frontend/lib/supabase/server.ts` (`getUserWithRolesAndPermissions`, `logAuditTrail`) | Always use these on server |
| Idempotent upsert (for future-proofing offline sync) | `frontend/lib/actions/supabase-journal.ts` lines 68-83 | `crypto.randomUUID()` + `onConflict: 'id'` |
| Default role assignment on signup | `frontend/lib/actions/supabase-auth.ts` lines 100-176 | Confirm `healthcare_provider` is NOT default (`is_default = false`) |
| Many-to-many with audit metadata | `database.types.ts` lines 627-660 (`user_roles`) | Template for `patient_provider_connections` shape |
| RLS policy pattern | `frontend/supabase/migrations/20260217_p2_medication_offline.sql` lines 46-61 | Only existing RLS in repo |

---

## 10. Risks & Things to Watch

| Risk | Mitigation |
|---|---|
| `database.types.ts` drift after migrations | After every migration, regen and commit before writing app code |
| Patient's existing `inventory_responses` queries leak data | New provider actions are **separate**; don't modify the existing patient-side filters |
| Admin lockout via RLS | Every policy uses `is_admin_user()` escape hatch; verify before committing |
| Trigger raises bare error string | Server actions catch the message and translate to BR-PT |
| User deletes account (CASCADE) | All connections cascade; audit logs persist (`audit_logs` keeps `user_id` only) |
| Audit enum extension is irreversible | Document in migration header; staging review required |
| Provider re-submits after rejection | Allowed via partial unique index `WHERE status = 'pending'` |
| Same license registered to two users | Blocked by partial unique index `WHERE status = 'approved'` |
| Patient sees old data after revoke | Provider-side actions check grant on every read; no caching layer |
| RLS helper functions (`is_admin_user`, `user_has_role`) don't exist | Verify in your Supabase project; create if missing |

---

## 11. Future Follow-ups

Out of scope for this plan but worth tracking:

1. **Push notifications** for new invites, accepts, ends, share grants — once `/api/push-subscriptions` route and `web-push` are wired (CLAUDE.md P6).
2. **Email notifications** to patient on invite — needs email service (transactional email provider; Supabase only sends auth emails).
3. **Realtime updates** on `/connections` and `/patients` — straightforward via Supabase Realtime subscriptions; v1 polls on load.
4. **Todo/Goals/Agenda UIs** with offline sync — extend Zustand stores following `journal-store.ts`; idempotent upserts for offline writes.
5. **Provider directory / patient-side search** — patients browse and request connections from validated providers. Different connection-flow design.
6. **Admin: revoke a provider's validation** — turn `approved` → `rejected` retroactively, end all active connections, remove `healthcare_provider` role.
7. **Connection history view** — show ended connections with timeline.
8. **Per-role audit views** — admin dashboard showing role assignments over time.
