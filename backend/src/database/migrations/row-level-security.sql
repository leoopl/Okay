-- This file contains SQL to set up row-level security policies in PostgreSQL
-- Run this manually after your database is set up or integrate into migrations

-- Enable row level security on tables
ALTER TABLE journal_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_responses ENABLE ROW LEVEL SECURITY;

-- Create database roles that mirror our application roles
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app_admin') THEN
        CREATE ROLE app_admin;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app_patient') THEN
        CREATE ROLE app_patient;
    END IF;
    
    -- For future therapist role
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app_therapist') THEN
        CREATE ROLE app_therapist;
    END IF;
END
$$;

-- Grant privileges to roles
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_admin;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO app_admin;

-- Patient role gets limited access
GRANT SELECT, INSERT, UPDATE, DELETE ON journal_entries TO app_patient;
GRANT SELECT, INSERT ON inventory_responses TO app_patient;
GRANT SELECT ON inventories TO app_patient;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO app_patient;

-- For future therapist role - example permissions
GRANT SELECT ON journal_entries TO app_therapist;
GRANT SELECT, INSERT, UPDATE ON inventory_responses TO app_therapist;
GRANT SELECT ON inventories TO app_therapist;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO app_therapist;

-- Create policy for journal entries: users can only see their own entries, admins see all
CREATE POLICY journal_user_isolation ON journal_entries
    FOR ALL
    TO app_patient
    USING (userId = current_setting('app.current_user_id')::uuid);

CREATE POLICY journal_admin_access ON journal_entries
    FOR ALL
    TO app_admin
    USING (true);

-- Future therapist policy for journal entries
CREATE POLICY journal_therapist_access ON journal_entries
    FOR SELECT
    TO app_therapist
    USING (userId IN (
        SELECT id FROM users WHERE therapist_id = current_setting('app.current_user_id')::uuid
    ));

-- Create policy for inventory responses: users can only see their own responses, admins see all
CREATE POLICY inventory_response_user_isolation ON inventory_responses
    FOR ALL
    TO app_patient
    USING (userId = current_setting('app.current_user_id')::uuid);

CREATE POLICY inventory_response_admin_access ON inventory_responses
    FOR ALL
    TO app_admin
    USING (true);

-- Future therapist policy for inventory responses
CREATE POLICY inventory_response_therapist_access ON inventory_responses
    FOR ALL
    TO app_therapist
    USING (userId IN (
        SELECT id FROM users WHERE therapist_id = current_setting('app.current_user_id')::uuid
    ));

-- Create function to set user context when connecting
CREATE OR REPLACE FUNCTION set_user_context() RETURNS VOID AS $$
DECLARE
    user_id UUID;
    user_role TEXT;
BEGIN
    -- These values should be set when connection is established
    user_id := current_setting('app.current_user_id', true);
    user_role := current_setting('app.current_user_role', true);
    
    IF user_id IS NOT NULL THEN
        -- Set user ID for policies to use
        PERFORM set_config('app.current_user_id', user_id::text, false);
        
        -- Set role based on app role
        IF user_role = 'admin' THEN
            PERFORM set_role('app_admin');
        ELSIF user_role = 'patient' THEN
            PERFORM set_role('app_patient');
        ELSIF user_role = 'therapist' THEN
            PERFORM set_role('app_therapist');
        ELSE
            -- Default to least privileged role
            PERFORM set_role('app_patient');
        END IF;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Example usage in application:
-- Before executing queries, run:
-- SET app.current_user_id = '123e4567-e89b-12d3-a456-426614174000';
-- SET app.current_user_role = 'patient';
-- SELECT set_user_context();