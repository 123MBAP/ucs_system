-- Migration: add chief payment flags to payments tables
-- Engine: PostgreSQL

-- ========== UP ==========
BEGIN;

ALTER TABLE IF NOT EXISTS payments_transactions
  ADD COLUMN IF NOT EXISTS is_paid_by_chief BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS paid_by_chief_id INT NULL REFERENCES users(id) ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE IF NOT EXISTS payments_completed
  ADD COLUMN IF NOT EXISTS is_paid_by_chief BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS paid_by_chief_id INT NULL REFERENCES users(id) ON UPDATE CASCADE ON DELETE SET NULL;

COMMIT;

-- ========== DOWN ==========
BEGIN;

ALTER TABLE IF EXISTS payments_transactions
  DROP COLUMN IF EXISTS paid_by_chief_id,
  DROP COLUMN IF EXISTS is_paid_by_chief;

ALTER TABLE IF EXISTS payments_completed
  DROP COLUMN IF EXISTS paid_by_chief_id,
  DROP COLUMN IF EXISTS is_paid_by_chief;

COMMIT;
