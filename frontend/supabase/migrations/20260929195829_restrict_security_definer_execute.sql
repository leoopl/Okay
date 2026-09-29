-- Restrict who can call SECURITY DEFINER functions through the Data API (/rest/v1/rpc).
--
-- Supabase grants EXECUTE to anon and authenticated directly (not only via PUBLIC), so the
-- earlier `REVOKE ... FROM PUBLIC` statements left these functions callable while signed out.
-- Flagged by the security advisors (lints 0028 / 0029).
--
-- Deliberately NOT changed: is_admin_or_owner, user_has_role and user_has_any_role. RLS policies
-- that apply to anon (role "public") call them, e.g. the public testimonials read policy;
-- revoking anon would make those reads fail with "permission denied for function".

-- 1. Trigger functions: never meant to be called directly. Postgres checks EXECUTE only when a
--    trigger is created, not when it fires, so existing triggers keep working.
REVOKE EXECUTE ON FUNCTION public.assign_default_role() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.enforce_connection_immutable_columns() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.enforce_connection_transitions() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.enforce_invitee_is_patient() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.enforce_patient_provider_limit() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_consent_update() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_profile_deletion() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_user_deletion() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_user_update() FROM PUBLIC, anon, authenticated;

-- 2. Functions that only make sense for a signed-in user: remove anon, keep authenticated.
--    Each already checks auth.uid() internally; this removes the signed-out entry point.
REVOKE EXECUTE ON FUNCTION public.replace_user_role(uuid, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.mark_todo_done(uuid, boolean) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.mark_goal_achieved(uuid, boolean) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.mark_agenda_completed(uuid, boolean) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_user_roles() FROM PUBLIC, anon;
-- is_admin_user is only referenced by policies scoped TO authenticated.
REVOKE EXECUTE ON FUNCTION public.is_admin_user(uuid) FROM PUBLIC, anon;
