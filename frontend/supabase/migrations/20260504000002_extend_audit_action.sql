-- Migration #2: extend audit_action enum
--
-- ALTER TYPE … ADD VALUE cannot run inside a transaction in PG <12. Each ADD VALUE
-- is wrapped in DO $$ … EXCEPTION WHEN duplicate_object so a partial re-run is safe.
-- Each statement runs as its own transaction (Supabase migration runner respects this).
--
-- IRREVERSIBLE: Postgres does not support DROP VALUE on enum types without recreating
-- the type. Adding values is a one-way operation.

DO $$ BEGIN
  ALTER TYPE audit_action ADD VALUE 'provider_validation_requested';
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TYPE audit_action ADD VALUE 'provider_validation_approved';
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TYPE audit_action ADD VALUE 'provider_validation_rejected';
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TYPE audit_action ADD VALUE 'connection_invited';
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TYPE audit_action ADD VALUE 'connection_accepted';
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TYPE audit_action ADD VALUE 'connection_rejected';
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TYPE audit_action ADD VALUE 'connection_ended';
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TYPE audit_action ADD VALUE 'resource_shared';
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TYPE audit_action ADD VALUE 'resource_share_revoked';
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
