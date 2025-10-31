-- Migration: add supervisor_id to manpower_assignments and allow NULL zone_id
-- Engine: PostgreSQL

-- ========== UP ==========
BEGIN;

ALTER TABLE manpower_assignments
  ADD COLUMN IF NOT EXISTS supervisor_id INT NULL REFERENCES users(id) ON UPDATE CASCADE ON DELETE SET NULL;

-- Make zone_id nullable to allow manpower records without a zone
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'manpower_assignments' AND column_name = 'zone_id'
  ) THEN
    ALTER TABLE manpower_assignments ALTER COLUMN zone_id DROP NOT NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_manpower_assignments_supervisor_id ON manpower_assignments(supervisor_id);

COMMIT;

-- ========== DOWN ==========
BEGIN;

DROP INDEX IF EXISTS idx_manpower_assignments_supervisor_id;
ALTER TABLE manpower_assignments DROP COLUMN IF EXISTS supervisor_id;
-- Note: not restoring NOT NULL on zone_id to avoid breaking data

COMMIT;
