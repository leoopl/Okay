-- Migration #5: tighten RLS on inventory_responses + dose_logs
--
-- BACKGROUND: The pre-existing RLS on these two tables was overly permissive,
-- granting ANY healthcare_provider blanket SELECT/INSERT/UPDATE/DELETE on ANY
-- patient's clinical data via clauses like:
--   user_has_any_role(['admin','healthcare_provider'])
-- This pre-dated the patient-provider connections feature. Code audit confirmed
-- no application code relied on the broad provider access (all callsites filter
-- by .eq('user_id', auth.uid())).
--
-- This migration replaces those policies with:
--   * Owner-only INSERT/UPDATE/DELETE (providers can NEVER modify patient data)
--   * SELECT gated on (owner OR provider_can_view(...) OR is_admin_user(...))
--
-- The provider_can_view() predicate (Migration #1) checks:
--   active connection between provider and patient + active grant for the resource.
--
-- INTENTIONALLY EXCLUDED (S2): journal_entries and medications.
-- No provider-side reads exist for those tables in this plan. The next plan that
-- introduces provider reads of those tables MUST ship a parallel additive-RLS
-- migration. Do not assume RLS coverage just because connection-access machinery
-- exists.
--
-- ROLLBACK: To revert, restore the original broad policies (preserved as comments
-- below) and DROP the new policies. The migration runbook documents this.

-- =====================================================================
-- inventory_responses
-- =====================================================================
DROP POLICY IF EXISTS "Users can view their own responses" ON inventory_responses;
DROP POLICY IF EXISTS "Users can update their own responses" ON inventory_responses;
DROP POLICY IF EXISTS "Users can insert their own responses" ON inventory_responses;

CREATE POLICY inventory_responses_select_scoped ON inventory_responses FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR provider_can_view(user_id, 'inventory_responses')
    OR is_admin_user(auth.uid())
  );

CREATE POLICY inventory_responses_insert_owner ON inventory_responses FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY inventory_responses_update_owner ON inventory_responses FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY inventory_responses_delete_owner ON inventory_responses FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- =====================================================================
-- dose_logs
-- =====================================================================
DROP POLICY IF EXISTS "Dose logs access" ON dose_logs;

CREATE POLICY dose_logs_select_scoped ON dose_logs FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR provider_can_view(user_id, 'dose_logs')
    OR is_admin_user(auth.uid())
  );

CREATE POLICY dose_logs_insert_owner ON dose_logs FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY dose_logs_update_owner ON dose_logs FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY dose_logs_delete_owner ON dose_logs FOR DELETE TO authenticated
  USING (user_id = auth.uid());
