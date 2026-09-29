-- P2: Medication Offline Support — Schema Changes
-- Apply this migration to Supabase before deploying the P2 code changes.
--
-- Changes:
--   1. Add dose_type enum (scheduled | prn) to public schema
--   2. Add dose_type column to dose_logs (nullable for backwards compatibility)
--   3. Create dose_log_audit table for scheduled dose conflict tracking
--   4. Create partial unique index for scheduled dose deduplication
--   5. RLS policies for dose_log_audit

-- 1. Create dose_type enum (idempotent)
DO $$ BEGIN
  CREATE TYPE public.dose_type AS ENUM ('scheduled', 'prn');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- 2. Add dose_type column to dose_logs
--    Nullable: existing rows retain NULL (treated as PRN on sync)
ALTER TABLE public.dose_logs
  ADD COLUMN IF NOT EXISTS dose_type public.dose_type;

-- 3. Create dose_log_audit table
--    Records previous state before a scheduled dose upsert overwrites an existing row.
--    No write UI needed — server writes on conflict; caregiver/patient scenario recovery path.
CREATE TABLE IF NOT EXISTS public.dose_log_audit (
  id             uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  dose_log_id    uuid NOT NULL REFERENCES public.dose_logs(id) ON DELETE CASCADE,
  previous_data  jsonb NOT NULL,
  overwritten_at timestamptz NOT NULL DEFAULT now(),
  overwritten_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE
);

-- 4. Partial unique index for scheduled dose server-side deduplication.
--    Allows upsert to resolve duplicates when the same scheduled dose is logged twice
--    (e.g., multi-device or retry after offline). PRN doses are excluded (they are
--    append-only and may legitimately appear multiple times on the same day).
--
--    NOTE: IndexedDB does NOT enforce uniqueness on non-keyPath compound indexes.
--    This server-side index is the sole dedup enforcement point for scheduled doses.
--    The day is taken in UTC: `timestamp` is timestamptz, and a plain ::date cast depends on
--    the session TimeZone, which Postgres rejects in an index ("must be marked IMMUTABLE").
--    UTC matches the day range used by logDose in lib/actions/supabase-dose-logs.ts.
CREATE UNIQUE INDEX IF NOT EXISTS dose_logs_scheduled_dedup_idx
  ON public.dose_logs (medication_id, scheduled_time, ((timestamp AT TIME ZONE 'UTC')::date))
  WHERE dose_type = 'scheduled' AND scheduled_time IS NOT NULL;

-- 5. RLS policies for dose_log_audit
ALTER TABLE public.dose_log_audit ENABLE ROW LEVEL SECURITY;

-- Users can view their own audit records (for support/debugging)
DROP POLICY IF EXISTS "Users can view own audit records" ON public.dose_log_audit;
CREATE POLICY "Users can view own audit records"
  ON public.dose_log_audit
  FOR SELECT
  TO authenticated
  USING (overwritten_by = (SELECT auth.uid()));

-- logDose writes audit records with the signed-in user's client (not the service role),
-- so users may insert audit rows only for their own dose logs. Rows are append-only:
-- there are no UPDATE or DELETE policies.
DROP POLICY IF EXISTS "No direct client inserts on audit" ON public.dose_log_audit;
DROP POLICY IF EXISTS "Users can audit own dose logs" ON public.dose_log_audit;
CREATE POLICY "Users can audit own dose logs"
  ON public.dose_log_audit
  FOR INSERT
  TO authenticated
  WITH CHECK (
    overwritten_by = (SELECT auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.dose_logs d
      WHERE d.id = dose_log_id AND d.user_id = (SELECT auth.uid())
    )
  );
