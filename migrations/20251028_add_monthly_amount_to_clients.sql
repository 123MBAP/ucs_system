-- Migration: add monthly_amount to clients
-- Engine: PostgreSQL

-- ========== UP ==========
BEGIN;

ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS monthly_amount NUMERIC(12,2) NULL;

COMMIT;

-- ========== DOWN ==========
BEGIN;

ALTER TABLE clients
  DROP COLUMN IF EXISTS monthly_amount;

COMMIT;
