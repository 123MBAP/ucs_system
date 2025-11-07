-- Migration: add email columns to users and clients
-- Engine: PostgreSQL

-- ========== UP ==========
BEGIN;

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS email VARCHAR(255);

ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS email VARCHAR(255);

-- Helpful indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_clients_email ON clients(email);

COMMIT;

-- ========== DOWN ==========
BEGIN;

DROP INDEX IF EXISTS idx_clients_email;
DROP INDEX IF EXISTS idx_users_email;
ALTER TABLE clients DROP COLUMN IF EXISTS email;
ALTER TABLE users DROP COLUMN IF EXISTS email;

COMMIT;
