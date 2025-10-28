-- Seed default roles
-- Engine: PostgreSQL

BEGIN;

INSERT INTO roles (role_name) VALUES
  ('superuser'),
  ('manager'),
  ('supervisor'),
  ('chief'),
  ('driver'),
  ('manpower'),
  ('client')
ON CONFLICT (role_name) DO NOTHING;

COMMIT;
