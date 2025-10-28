-- Migration: add password to clients with default '123'
-- Engine: PostgreSQL

-- ========== UP ==========
BEGIN;

ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS password TEXT NOT NULL DEFAULT '123';

COMMIT;

-- ========== DOWN ==========
BEGIN;

ALTER TABLE clients
  DROP COLUMN IF EXISTS password;

COMMIT;
