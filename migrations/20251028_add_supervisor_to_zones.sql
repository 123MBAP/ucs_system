-- Migration: add supervisor_id to zones
-- Engine: PostgreSQL

-- ========== UP ==========
BEGIN;

ALTER TABLE zones
  ADD COLUMN IF NOT EXISTS supervisor_id INT NULL REFERENCES users(id) ON UPDATE CASCADE ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_zones_supervisor_id ON zones(supervisor_id);

COMMIT;

-- ========== DOWN ==========
BEGIN;

DROP INDEX IF EXISTS idx_zones_supervisor_id;
ALTER TABLE zones DROP COLUMN IF EXISTS supervisor_id;

COMMIT;
