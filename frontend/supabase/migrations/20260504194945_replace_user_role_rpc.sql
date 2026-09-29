-- Migration #3: replace_user_role RPC
--
-- AUDIT OWNERSHIP CONTRACT (W2): This function is the SOLE emitter of `role_removed`,
-- `role_assigned`, and the cleanup-branch `connection_ended` audit entries for the
-- role-switch flow. Server actions calling this RPC MUST NOT also emit those values;
-- they own only their own domain values (e.g. `provider_validation_approved`).
--
-- W1 CONNECTION CLEANUP: When promoting a user TO `healthcare_provider`, any active
-- or pending connections where this user was the PATIENT are auto-ended in the same
-- transaction, and their grants revoked. After the switch, the user is no longer a
-- patient; leaving those rows active would let the OLD provider continue reading
-- their data.
--
-- C2 SELF-AUTHORIZE: SECURITY DEFINER bypasses RLS, so the function MUST gate access
-- explicitly. The is_admin_user() check is the gate.

CREATE OR REPLACE FUNCTION replace_user_role(
  p_target_user_id uuid,
  p_new_role_name text
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_new_role_id uuid;
  v_old_role_name text;
  v_ended_count int := 0;
BEGIN
  IF NOT is_admin_user(auth.uid()) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  IF p_target_user_id IS NULL OR p_new_role_name IS NULL THEN
    RAISE EXCEPTION 'invalid arguments';
  END IF;

  SELECT id INTO v_new_role_id FROM roles WHERE name = p_new_role_name;
  IF v_new_role_id IS NULL THEN
    RAISE EXCEPTION 'role not found: %', p_new_role_name;
  END IF;

  SELECT r.name INTO v_old_role_name FROM user_roles ur
    JOIN roles r ON r.id = ur.role_id WHERE ur.user_id = p_target_user_id LIMIT 1;

  -- W1: end this user's old patient-side connections + revoke grants when promoting.
  IF p_new_role_name = 'healthcare_provider' THEN
    UPDATE patient_provider_connections
      SET status = 'ended', ended_at = now(), ended_by = auth.uid(), updated_at = now()
      WHERE patient_id = p_target_user_id
        AND status IN ('pending', 'active');
    GET DIAGNOSTICS v_ended_count = ROW_COUNT;

    UPDATE shared_resource_grants
      SET revoked_at = now(), revoked_by = auth.uid()
      WHERE connection_id IN (
        SELECT id FROM patient_provider_connections WHERE patient_id = p_target_user_id
      ) AND revoked_at IS NULL;

    IF v_ended_count > 0 THEN
      INSERT INTO audit_logs (user_id, action, resource, resource_id, details)
        VALUES (auth.uid(), 'connection_ended', 'patient_provider_connection',
                p_target_user_id::text,
                jsonb_build_object('reason', 'role_switch_to_provider',
                                   'count', v_ended_count));
    END IF;
  END IF;

  -- Atomic role swap (single transaction)
  DELETE FROM user_roles WHERE user_id = p_target_user_id;
  INSERT INTO user_roles (user_id, role_id, assigned_by)
    VALUES (p_target_user_id, v_new_role_id, auth.uid());

  -- W2 contract: ONLY this RPC emits these values for role-switch flows.
  IF v_old_role_name IS NOT NULL THEN
    INSERT INTO audit_logs (user_id, action, resource, resource_id, details)
      VALUES (auth.uid(), 'role_removed', 'user_roles', p_target_user_id::text,
              jsonb_build_object('removed_role', v_old_role_name,
                                 'ended_connections', v_ended_count));
  END IF;
  INSERT INTO audit_logs (user_id, action, resource, resource_id, details)
    VALUES (auth.uid(), 'role_assigned', 'user_roles', p_target_user_id::text,
            jsonb_build_object('assigned_role', p_new_role_name));
END $$;

REVOKE ALL ON FUNCTION replace_user_role(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION replace_user_role(uuid, text) TO authenticated;
