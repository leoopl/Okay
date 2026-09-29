-- Migration #4: provider permissions seed + role_permissions wiring
--
-- Adds new permissions for the connections feature, wires role_permissions, and
-- inherits patient CRUD permissions onto healthcare_provider as a SNAPSHOT (W10).
-- The healthcare_provider role itself already exists in this project; the migration
-- aborts loudly (S2) if that's not true.
--
-- Snapshot semantics: if patient role permissions evolve later, run a follow-up
-- migration to re-sync inheritance. This migration does NOT establish a live mirror.

-- S2: fail-fast guard
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM roles WHERE name = 'healthcare_provider') THEN
    RAISE EXCEPTION 'expected healthcare_provider role to exist; aborting migration';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM roles WHERE name = 'patient') THEN
    RAISE EXCEPTION 'expected patient role to exist; aborting migration';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM roles WHERE name = 'admin') THEN
    RAISE EXCEPTION 'expected admin role to exist; aborting migration';
  END IF;
END $$;

-- 1. New permissions
INSERT INTO permissions (name, resource, action, description) VALUES
  ('provider-validation-request:create', 'provider-validation-request', 'create', 'Submeter solicitação de validação profissional própria'),
  ('provider-validation-request:read',   'provider-validation-request', 'read',   'Visualizar solicitações de validação próprias'),
  ('provider-validation-request:manage', 'provider-validation-request', 'manage', 'Aprovar/rejeitar solicitações de validação (admin)'),
  ('patient-provider-connection:create', 'patient-provider-connection', 'create', 'Convidar paciente para uma conexão'),
  ('patient-provider-connection:read',   'patient-provider-connection', 'read',   'Visualizar conexões próprias'),
  ('patient-provider-connection:update', 'patient-provider-connection', 'update', 'Aceitar/rejeitar/encerrar conexão'),
  ('shared-resource-grant:create',       'shared-resource-grant',       'create', 'Compartilhar recurso com profissional'),
  ('shared-resource-grant:read',         'shared-resource-grant',       'read',   'Visualizar concessões de compartilhamento'),
  ('shared-resource-grant:delete',       'shared-resource-grant',       'delete', 'Revogar compartilhamento de recurso'),
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

-- 2. Wire role_permissions
-- Helper inline: assign permission p to role r
WITH new_perms AS (
  SELECT p.id AS perm_id, r.id AS role_id
  FROM permissions p, roles r
  WHERE
    -- patient gets validation request perms (any signed-in user can request)
    (r.name = 'patient' AND p.name IN (
      'provider-validation-request:create',
      'provider-validation-request:read',
      'patient-provider-connection:read',
      'patient-provider-connection:update',
      'shared-resource-grant:create',
      'shared-resource-grant:read',
      'shared-resource-grant:delete',
      'todo-item:create','todo-item:read','todo-item:update','todo-item:delete',
      'therapeutic-goal:create','therapeutic-goal:read','therapeutic-goal:update','therapeutic-goal:delete',
      'agenda-item:create','agenda-item:read','agenda-item:update','agenda-item:delete'
    ))
    -- admin gets manage + read for validation requests
    OR (r.name = 'admin' AND p.name IN (
      'provider-validation-request:read',
      'provider-validation-request:manage',
      'patient-provider-connection:read',
      'shared-resource-grant:read'
    ))
    -- healthcare_provider gets connections + grants:read + shared-list perms
    OR (r.name = 'healthcare_provider' AND p.name IN (
      'provider-validation-request:read',
      'patient-provider-connection:create',
      'patient-provider-connection:read',
      'patient-provider-connection:update',
      'shared-resource-grant:read',
      'todo-item:create','todo-item:read','todo-item:update','todo-item:delete',
      'therapeutic-goal:create','therapeutic-goal:read','therapeutic-goal:update','therapeutic-goal:delete',
      'agenda-item:create','agenda-item:read','agenda-item:update','agenda-item:delete'
    ))
)
INSERT INTO role_permissions (role_id, permission_id)
SELECT role_id, perm_id FROM new_perms
ON CONFLICT DO NOTHING;

-- 3. SNAPSHOT (W10): inherit ALL current patient permissions onto healthcare_provider
-- so providers retain self-tracking capabilities (journal, medication, inventory_response CRUD)
-- after the role switch.
INSERT INTO role_permissions (role_id, permission_id)
SELECT
  (SELECT id FROM roles WHERE name = 'healthcare_provider'),
  rp.permission_id
FROM role_permissions rp
JOIN roles r ON r.id = rp.role_id
WHERE r.name = 'patient'
ON CONFLICT DO NOTHING;
