-- Migration: drop plaintext default on clients.password (we'll set bcrypt hash in app)
-- Engine: PostgreSQL

-- ========== UP ==========
BEGIN;

ALTER TABLE clients
  ALTER COLUMN password DROP DEFAULT;

COMMIT;

-- ========== DOWN ==========
BEGIN;

ALTER TABLE clients
  ALTER COLUMN password SET DEFAULT '123';

COMMIT;
