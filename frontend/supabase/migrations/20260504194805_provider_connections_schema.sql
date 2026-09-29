-- Migration #1: Patient–Professional Connections schema
--
-- Adds: ENUMs, tables, indexes, triggers, RLS policies, state-flip RPC family,
-- provider_can_view predicate, and the provider-licenses storage bucket + policies.
--
-- Depends on: roles, profiles, audit_logs, is_admin_user(), user_has_role().
-- Followed by: <ts2>_extend_audit_action.sql (adds new audit values referenced by RPC #3).

-- =====================================================================
-- 1. ENUMs
-- =====================================================================
DO $$ BEGIN
  CREATE TYPE council_type AS ENUM ('CRM', 'CRP');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE provider_validation_status AS ENUM ('pending', 'approved', 'rejected');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE connection_status AS ENUM ('pending', 'active', 'rejected', 'ended');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE shared_resource_type AS ENUM (
    'inventory_responses',
    'dose_logs',
    'todo_items',
    'therapeutic_goals',
    'agenda_items'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- =====================================================================
-- 2. provider_validation_requests
-- =====================================================================
CREATE TABLE IF NOT EXISTS provider_validation_requests (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  council_type     council_type NOT NULL,
  council_state    TEXT NOT NULL CHECK (council_state = ANY (ARRAY[
    'AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB',
    'PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'
  ])),
  council_number   TEXT NOT NULL CHECK (length(council_number) BETWEEN 4 AND 20),
  full_name        TEXT NOT NULL CHECK (length(full_name) BETWEEN 3 AND 200),
  specialty        TEXT,
  bio              TEXT CHECK (bio IS NULL OR length(bio) <= 2000),
  document_path    TEXT,
  status           provider_validation_status NOT NULL DEFAULT 'pending',
  reviewed_by      UUID REFERENCES profiles(id),
  reviewed_at      TIMESTAMPTZ,
  rejection_reason TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS provider_validation_requests_one_pending_per_user
  ON provider_validation_requests (user_id) WHERE status = 'pending';
CREATE UNIQUE INDEX IF NOT EXISTS provider_validation_requests_unique_approved_license
  ON provider_validation_requests (council_type, council_state, council_number)
  WHERE status = 'approved';
CREATE INDEX IF NOT EXISTS provider_validation_requests_status_idx
  ON provider_validation_requests (status, created_at DESC);

-- =====================================================================
-- 3. patient_provider_connections
-- =====================================================================
CREATE TABLE IF NOT EXISTS patient_provider_connections (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id      UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  provider_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status          connection_status NOT NULL DEFAULT 'pending',
  initiated_by    UUID NOT NULL REFERENCES profiles(id),
  invite_message  TEXT CHECK (invite_message IS NULL OR length(invite_message) <= 500),
  accepted_at     TIMESTAMPTZ,
  rejected_at     TIMESTAMPTZ,
  ended_at        TIMESTAMPTZ,
  ended_by        UUID REFERENCES profiles(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT no_self_connection CHECK (patient_id <> provider_id)
);

CREATE UNIQUE INDEX IF NOT EXISTS patient_provider_connections_unique_open_pair
  ON patient_provider_connections (patient_id, provider_id)
  WHERE status IN ('pending', 'active');
CREATE INDEX IF NOT EXISTS patient_provider_connections_patient_idx
  ON patient_provider_connections (patient_id, status);
CREATE INDEX IF NOT EXISTS patient_provider_connections_provider_idx
  ON patient_provider_connections (provider_id, status);

-- =====================================================================
-- 4. shared_resource_grants
-- =====================================================================
CREATE TABLE IF NOT EXISTS shared_resource_grants (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id UUID NOT NULL REFERENCES patient_provider_connections(id) ON DELETE CASCADE,
  resource_type shared_resource_type NOT NULL,
  granted_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  revoked_at    TIMESTAMPTZ,
  revoked_by    UUID REFERENCES profiles(id)
);

CREATE UNIQUE INDEX IF NOT EXISTS shared_resource_grants_one_active_per_resource
  ON shared_resource_grants (connection_id, resource_type)
  WHERE revoked_at IS NULL;
CREATE INDEX IF NOT EXISTS shared_resource_grants_connection_idx
  ON shared_resource_grants (connection_id);

-- =====================================================================
-- 5. shared list tables (schema only — UIs deferred)
-- =====================================================================
CREATE TABLE IF NOT EXISTS todo_items (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id UUID NOT NULL REFERENCES patient_provider_connections(id) ON DELETE CASCADE,
  created_by    UUID NOT NULL REFERENCES profiles(id),
  title         TEXT NOT NULL CHECK (length(title) BETWEEN 1 AND 200),
  description   TEXT,
  is_done       BOOLEAN NOT NULL DEFAULT false,
  done_at       TIMESTAMPTZ,
  done_by       UUID REFERENCES profiles(id),
  due_date      DATE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS todo_items_connection_idx ON todo_items (connection_id, is_done);

CREATE TABLE IF NOT EXISTS therapeutic_goals (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id UUID NOT NULL REFERENCES patient_provider_connections(id) ON DELETE CASCADE,
  created_by    UUID NOT NULL REFERENCES profiles(id),
  title         TEXT NOT NULL CHECK (length(title) BETWEEN 1 AND 200),
  description   TEXT,
  target_date   DATE,
  achieved_at   TIMESTAMPTZ,
  achieved_by   UUID REFERENCES profiles(id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS therapeutic_goals_connection_idx ON therapeutic_goals (connection_id);

CREATE TABLE IF NOT EXISTS agenda_items (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id UUID NOT NULL REFERENCES patient_provider_connections(id) ON DELETE CASCADE,
  created_by    UUID NOT NULL REFERENCES profiles(id),
  title         TEXT NOT NULL CHECK (length(title) BETWEEN 1 AND 200),
  description   TEXT,
  scheduled_at  TIMESTAMPTZ,
  completed_at  TIMESTAMPTZ,
  completed_by  UUID REFERENCES profiles(id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS agenda_items_connection_idx ON agenda_items (connection_id, scheduled_at);

-- =====================================================================
-- 6. updated_at triggers (reuse existing handle_updated_at)
-- =====================================================================
DROP TRIGGER IF EXISTS provider_validation_requests_updated_at ON provider_validation_requests;
CREATE TRIGGER provider_validation_requests_updated_at
  BEFORE UPDATE ON provider_validation_requests
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

DROP TRIGGER IF EXISTS patient_provider_connections_updated_at ON patient_provider_connections;
CREATE TRIGGER patient_provider_connections_updated_at
  BEFORE UPDATE ON patient_provider_connections
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

DROP TRIGGER IF EXISTS todo_items_updated_at ON todo_items;
CREATE TRIGGER todo_items_updated_at
  BEFORE UPDATE ON todo_items
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

DROP TRIGGER IF EXISTS therapeutic_goals_updated_at ON therapeutic_goals;
CREATE TRIGGER therapeutic_goals_updated_at
  BEFORE UPDATE ON therapeutic_goals
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

DROP TRIGGER IF EXISTS agenda_items_updated_at ON agenda_items;
CREATE TRIGGER agenda_items_updated_at
  BEFORE UPDATE ON agenda_items
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

-- =====================================================================
-- 7. enforce_patient_provider_limit (max 2 active+pending per patient)
-- =====================================================================
CREATE OR REPLACE FUNCTION enforce_patient_provider_limit()
RETURNS TRIGGER LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  IF NEW.status IN ('pending', 'active') THEN
    IF (SELECT COUNT(*) FROM public.patient_provider_connections
        WHERE patient_id = NEW.patient_id
          AND status IN ('pending', 'active')
          AND id <> COALESCE(NEW.id, gen_random_uuid())) >= 2 THEN
      RAISE EXCEPTION 'PATIENT_PROVIDER_LIMIT_EXCEEDED'
        USING HINT = 'O paciente já possui 2 conexões ativas ou pendentes';
    END IF;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS patient_provider_limit_trigger ON patient_provider_connections;
CREATE TRIGGER patient_provider_limit_trigger
  BEFORE INSERT OR UPDATE OF status, patient_id ON patient_provider_connections
  FOR EACH ROW EXECUTE FUNCTION enforce_patient_provider_limit();

-- =====================================================================
-- 8. enforce_invitee_is_patient (and inviter is provider) — INSERT only
-- =====================================================================
CREATE OR REPLACE FUNCTION enforce_invitee_is_patient()
RETURNS TRIGGER LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.user_roles ur
      JOIN public.roles r ON r.id = ur.role_id
      WHERE ur.user_id = NEW.patient_id AND r.name = 'patient'
    ) THEN
      RAISE EXCEPTION 'INVITEE_NOT_PATIENT'
        USING HINT = 'Apenas usuários com perfil de paciente podem ser convidados';
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM public.user_roles ur
      JOIN public.roles r ON r.id = ur.role_id
      WHERE ur.user_id = NEW.provider_id AND r.name = 'healthcare_provider'
    ) THEN
      RAISE EXCEPTION 'INVITER_NOT_PROVIDER';
    END IF;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS patient_provider_role_invariants ON patient_provider_connections;
CREATE TRIGGER patient_provider_role_invariants
  BEFORE INSERT ON patient_provider_connections
  FOR EACH ROW EXECUTE FUNCTION enforce_invitee_is_patient();

-- =====================================================================
-- 9. enforce_connection_transitions (state-machine on status UPDATE)
-- =====================================================================
CREATE OR REPLACE FUNCTION enforce_connection_transitions()
RETURNS TRIGGER LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_actor uuid := auth.uid();
BEGIN
  IF NEW.status IS NOT DISTINCT FROM OLD.status THEN
    RETURN NEW;
  END IF;

  IF OLD.status IN ('rejected', 'ended') THEN
    RAISE EXCEPTION 'CONNECTION_TERMINAL_STATE'
      USING HINT = 'Conexões rejeitadas ou encerradas não podem ser reativadas';
  END IF;

  IF OLD.status = 'pending' AND NEW.status = 'active' THEN
    IF v_actor IS DISTINCT FROM OLD.patient_id THEN
      RAISE EXCEPTION 'INVALID_TRANSITION_ACTOR'
        USING HINT = 'Apenas o paciente pode aceitar o convite';
    END IF;
    NEW.accepted_at := COALESCE(NEW.accepted_at, now());
    RETURN NEW;
  END IF;

  IF OLD.status = 'pending' AND NEW.status = 'rejected' THEN
    IF v_actor IS DISTINCT FROM OLD.patient_id THEN
      RAISE EXCEPTION 'INVALID_TRANSITION_ACTOR';
    END IF;
    NEW.rejected_at := COALESCE(NEW.rejected_at, now());
    RETURN NEW;
  END IF;

  IF (OLD.status = 'pending' OR OLD.status = 'active') AND NEW.status = 'ended' THEN
    IF v_actor IS DISTINCT FROM OLD.patient_id
       AND v_actor IS DISTINCT FROM OLD.provider_id THEN
      IF NOT public.is_admin_user(v_actor) THEN
        RAISE EXCEPTION 'INVALID_TRANSITION_ACTOR';
      END IF;
    END IF;
    NEW.ended_at := COALESCE(NEW.ended_at, now());
    NEW.ended_by := COALESCE(NEW.ended_by, v_actor);
    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'INVALID_CONNECTION_TRANSITION % -> %', OLD.status, NEW.status;
END $$;

DROP TRIGGER IF EXISTS patient_provider_connection_state_machine ON patient_provider_connections;
CREATE TRIGGER patient_provider_connection_state_machine
  BEFORE UPDATE OF status ON patient_provider_connections
  FOR EACH ROW EXECUTE FUNCTION enforce_connection_transitions();

-- =====================================================================
-- 10. provider_can_view predicate (S1: SECURITY INVOKER)
-- =====================================================================
CREATE OR REPLACE FUNCTION provider_can_view(
  p_patient_id uuid,
  p_resource shared_resource_type
) RETURNS boolean
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM patient_provider_connections c
    JOIN shared_resource_grants g ON g.connection_id = c.id
    WHERE c.provider_id = auth.uid()
      AND c.patient_id = p_patient_id
      AND c.status = 'active'
      AND g.resource_type = p_resource
      AND g.revoked_at IS NULL
  );
$$;
REVOKE ALL ON FUNCTION provider_can_view(uuid, shared_resource_type) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION provider_can_view(uuid, shared_resource_type) TO authenticated;

-- =====================================================================
-- 11. State-flip RPC family
-- =====================================================================
CREATE OR REPLACE FUNCTION mark_todo_done(p_item_id uuid, p_done boolean DEFAULT TRUE)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public'
AS $$
DECLARE v_connection_id uuid;
BEGIN
  SELECT connection_id INTO v_connection_id FROM todo_items WHERE id = p_item_id;
  IF v_connection_id IS NULL THEN RAISE EXCEPTION 'todo_item not found'; END IF;
  IF NOT EXISTS (
    SELECT 1 FROM patient_provider_connections c
    WHERE c.id = v_connection_id AND c.status = 'active'
      AND (c.patient_id = auth.uid() OR c.provider_id = auth.uid())
  ) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;
  UPDATE todo_items
    SET is_done = p_done,
        done_at = CASE WHEN p_done THEN now() ELSE NULL END,
        done_by = CASE WHEN p_done THEN auth.uid() ELSE NULL END,
        updated_at = now()
    WHERE id = p_item_id;
END $$;
REVOKE ALL ON FUNCTION mark_todo_done(uuid, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION mark_todo_done(uuid, boolean) TO authenticated;

CREATE OR REPLACE FUNCTION mark_goal_achieved(p_goal_id uuid, p_achieved boolean DEFAULT TRUE)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public'
AS $$
DECLARE v_connection_id uuid;
BEGIN
  SELECT connection_id INTO v_connection_id FROM therapeutic_goals WHERE id = p_goal_id;
  IF v_connection_id IS NULL THEN RAISE EXCEPTION 'therapeutic_goal not found'; END IF;
  IF NOT EXISTS (
    SELECT 1 FROM patient_provider_connections c
    WHERE c.id = v_connection_id AND c.status = 'active'
      AND (c.patient_id = auth.uid() OR c.provider_id = auth.uid())
  ) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;
  UPDATE therapeutic_goals
    SET achieved_at = CASE WHEN p_achieved THEN now() ELSE NULL END,
        achieved_by = CASE WHEN p_achieved THEN auth.uid() ELSE NULL END,
        updated_at = now()
    WHERE id = p_goal_id;
END $$;
REVOKE ALL ON FUNCTION mark_goal_achieved(uuid, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION mark_goal_achieved(uuid, boolean) TO authenticated;

CREATE OR REPLACE FUNCTION mark_agenda_completed(p_agenda_id uuid, p_completed boolean DEFAULT TRUE)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public'
AS $$
DECLARE v_connection_id uuid;
BEGIN
  SELECT connection_id INTO v_connection_id FROM agenda_items WHERE id = p_agenda_id;
  IF v_connection_id IS NULL THEN RAISE EXCEPTION 'agenda_item not found'; END IF;
  IF NOT EXISTS (
    SELECT 1 FROM patient_provider_connections c
    WHERE c.id = v_connection_id AND c.status = 'active'
      AND (c.patient_id = auth.uid() OR c.provider_id = auth.uid())
  ) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;
  UPDATE agenda_items
    SET completed_at = CASE WHEN p_completed THEN now() ELSE NULL END,
        completed_by = CASE WHEN p_completed THEN auth.uid() ELSE NULL END,
        updated_at = now()
    WHERE id = p_agenda_id;
END $$;
REVOKE ALL ON FUNCTION mark_agenda_completed(uuid, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION mark_agenda_completed(uuid, boolean) TO authenticated;

-- =====================================================================
-- 12. RLS — provider_validation_requests
-- =====================================================================
ALTER TABLE provider_validation_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY pvr_select ON provider_validation_requests FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR is_admin_user(auth.uid()));

-- INSERT: only own row, and document_path (if set) must be inside auth.uid()'s folder.
CREATE POLICY pvr_insert ON provider_validation_requests FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND (document_path IS NULL OR document_path LIKE auth.uid()::text || '/%')
  );

CREATE POLICY pvr_update_admin ON provider_validation_requests FOR UPDATE TO authenticated
  USING (is_admin_user(auth.uid()))
  WITH CHECK (is_admin_user(auth.uid()));

-- =====================================================================
-- 13. RLS — patient_provider_connections (W3 narrow UPDATE)
-- =====================================================================
ALTER TABLE patient_provider_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY ppc_select ON patient_provider_connections FOR SELECT TO authenticated
  USING (
    patient_id = auth.uid() OR provider_id = auth.uid() OR is_admin_user(auth.uid())
  );

CREATE POLICY ppc_insert ON patient_provider_connections FOR INSERT TO authenticated
  WITH CHECK (
    provider_id = auth.uid()
    AND user_has_role('healthcare_provider')
    AND initiated_by = auth.uid()
  );

CREATE POLICY ppc_update_party ON patient_provider_connections FOR UPDATE TO authenticated
  USING (
    patient_id = auth.uid() OR provider_id = auth.uid() OR is_admin_user(auth.uid())
  )
  WITH CHECK (
    patient_id = auth.uid() OR provider_id = auth.uid() OR is_admin_user(auth.uid())
  );

-- W3: column-immutability trigger. RLS WITH CHECK can't reference OLD, so block
-- non-status, non-updated_at column changes here. State-machine trigger fires only
-- BEFORE UPDATE OF status, so a sneaky UPDATE that touches invite_message etc. would
-- otherwise slip through.
CREATE OR REPLACE FUNCTION enforce_connection_immutable_columns()
RETURNS TRIGGER LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  IF NEW.patient_id     IS DISTINCT FROM OLD.patient_id     THEN RAISE EXCEPTION 'IMMUTABLE_COLUMN: patient_id'; END IF;
  IF NEW.provider_id    IS DISTINCT FROM OLD.provider_id    THEN RAISE EXCEPTION 'IMMUTABLE_COLUMN: provider_id'; END IF;
  IF NEW.initiated_by   IS DISTINCT FROM OLD.initiated_by   THEN RAISE EXCEPTION 'IMMUTABLE_COLUMN: initiated_by'; END IF;
  IF NEW.invite_message IS DISTINCT FROM OLD.invite_message THEN RAISE EXCEPTION 'IMMUTABLE_COLUMN: invite_message'; END IF;
  IF NEW.created_at     IS DISTINCT FROM OLD.created_at     THEN RAISE EXCEPTION 'IMMUTABLE_COLUMN: created_at'; END IF;
  -- accepted_at / rejected_at / ended_at / ended_by are mutable: the state-machine
  -- trigger writes them legitimately during status transitions. Allow any value the
  -- caller sets here; the state-machine trigger runs BEFORE UPDATE OF status and
  -- will overwrite with COALESCE(NEW.*, now()) on legitimate transitions.
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS patient_provider_connection_immutable_cols ON patient_provider_connections;
CREATE TRIGGER patient_provider_connection_immutable_cols
  BEFORE UPDATE ON patient_provider_connections
  FOR EACH ROW EXECUTE FUNCTION enforce_connection_immutable_columns();

-- DELETE not allowed by RLS (cleanup goes through replace_user_role admin RPC).

-- =====================================================================
-- 14. RLS — shared_resource_grants (W2/S1 narrow revoke-only UPDATE)
-- =====================================================================
ALTER TABLE shared_resource_grants ENABLE ROW LEVEL SECURITY;

CREATE POLICY srg_select ON shared_resource_grants FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM patient_provider_connections c
      WHERE c.id = connection_id
        AND (c.patient_id = auth.uid() OR c.provider_id = auth.uid())
    )
    OR is_admin_user(auth.uid())
  );

CREATE POLICY srg_insert ON shared_resource_grants FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM patient_provider_connections c
      WHERE c.id = connection_id AND c.patient_id = auth.uid() AND c.status = 'active'
    )
  );

CREATE POLICY srg_update_revoke_only ON shared_resource_grants FOR UPDATE TO authenticated
  USING (
    revoked_at IS NULL
    AND EXISTS (
      SELECT 1 FROM patient_provider_connections c
      WHERE c.id = connection_id AND c.patient_id = auth.uid()
    )
  )
  WITH CHECK (
    revoked_at IS NOT NULL
    AND revoked_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM patient_provider_connections c
      WHERE c.id = connection_id AND c.patient_id = auth.uid()
    )
  );

-- =====================================================================
-- 15. RLS — shared list tables (todo / goals / agenda)
-- =====================================================================
ALTER TABLE todo_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY todo_items_select ON todo_items FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM patient_provider_connections c
      WHERE c.id = connection_id
        AND (c.patient_id = auth.uid() OR c.provider_id = auth.uid())
    )
    OR is_admin_user(auth.uid())
  );

CREATE POLICY todo_items_insert ON todo_items FOR INSERT TO authenticated
  WITH CHECK (
    created_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM patient_provider_connections c
      WHERE c.id = connection_id AND c.status = 'active'
        AND (c.patient_id = auth.uid() OR c.provider_id = auth.uid())
    )
  );

CREATE POLICY todo_items_update_owner ON todo_items FOR UPDATE TO authenticated
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

CREATE POLICY todo_items_delete ON todo_items FOR DELETE TO authenticated
  USING (created_by = auth.uid());

-- therapeutic_goals: same pattern
ALTER TABLE therapeutic_goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY therapeutic_goals_select ON therapeutic_goals FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM patient_provider_connections c
      WHERE c.id = connection_id
        AND (c.patient_id = auth.uid() OR c.provider_id = auth.uid())
    )
    OR is_admin_user(auth.uid())
  );
CREATE POLICY therapeutic_goals_insert ON therapeutic_goals FOR INSERT TO authenticated
  WITH CHECK (
    created_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM patient_provider_connections c
      WHERE c.id = connection_id AND c.status = 'active'
        AND (c.patient_id = auth.uid() OR c.provider_id = auth.uid())
    )
  );
CREATE POLICY therapeutic_goals_update_owner ON therapeutic_goals FOR UPDATE TO authenticated
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());
CREATE POLICY therapeutic_goals_delete ON therapeutic_goals FOR DELETE TO authenticated
  USING (created_by = auth.uid());

-- agenda_items: same pattern
ALTER TABLE agenda_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY agenda_items_select ON agenda_items FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM patient_provider_connections c
      WHERE c.id = connection_id
        AND (c.patient_id = auth.uid() OR c.provider_id = auth.uid())
    )
    OR is_admin_user(auth.uid())
  );
CREATE POLICY agenda_items_insert ON agenda_items FOR INSERT TO authenticated
  WITH CHECK (
    created_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM patient_provider_connections c
      WHERE c.id = connection_id AND c.status = 'active'
        AND (c.patient_id = auth.uid() OR c.provider_id = auth.uid())
    )
  );
CREATE POLICY agenda_items_update_owner ON agenda_items FOR UPDATE TO authenticated
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());
CREATE POLICY agenda_items_delete ON agenda_items FOR DELETE TO authenticated
  USING (created_by = auth.uid());

-- =====================================================================
-- 16. provider-licenses storage bucket + policies
-- =====================================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'provider-licenses', 'provider-licenses', false, 10485760,
  ARRAY['application/pdf','image/jpeg','image/png']
)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Users upload own license" ON storage.objects;
CREATE POLICY "Users upload own license" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'provider-licenses'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "Users view own license" ON storage.objects;
CREATE POLICY "Users view own license" ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'provider-licenses'
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR is_admin_user(auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users delete own license" ON storage.objects;
CREATE POLICY "Users delete own license" ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'provider-licenses'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
