-- Migration #6: fix pre-existing is_admin_user variable-conflict bug
--
-- BUG: The original is_admin_user(user_id uuid) function had a parameter name that
-- collided with the column user_roles.user_id. Under default plpgsql.variable_conflict
-- settings, the WHERE clause `WHERE ur.user_id = user_id` failed to resolve correctly,
-- and the function's `EXCEPTION WHEN OTHERS THEN RETURN false` masked the failure.
-- Result: is_admin_user always returned false, even for legitimate admins.
--
-- This was a sleeping bug because the only existing caller was via the testimonials
-- RLS policy, which used `user_has_role('admin')` instead. The new RLS policies and
-- the replace_user_role RPC depend on is_admin_user; they would have silently denied
-- everyone without this fix.
--
-- FIX: Add `#variable_conflict use_variable` directive so the parameter wins over the
-- column reference. Drop the EXCEPTION-WHEN-OTHERS swallow so future bugs surface.
-- Keep the parameter name `user_id` and default `auth.uid()` to preserve external
-- signature compatibility with any caller using named arguments.

CREATE OR REPLACE FUNCTION public.is_admin_user(user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
#variable_conflict use_variable
DECLARE
  v_is_admin boolean := false;
BEGIN
  IF user_id IS NULL THEN
    RETURN false;
  END IF;
  SELECT EXISTS (
    SELECT 1
    FROM user_roles ur
    JOIN roles r ON ur.role_id = r.id
    WHERE ur.user_id = user_id
      AND r.name = 'admin'
  ) INTO v_is_admin;
  RETURN v_is_admin;
END;
$$;
