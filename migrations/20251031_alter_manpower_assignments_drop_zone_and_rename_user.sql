-- Migration: drop zone_id and rename user_id -> manpower_id in manpower_assignments
-- Engine: PostgreSQL

-- ========== UP ==========
BEGIN;

-- Drop zone index if it exists
DROP INDEX IF EXISTS idx_manpower_assignments_zone_id;

-- Rename user_id to manpower_id (keep PK semantics)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'manpower_assignments' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE manpower_assignments RENAME COLUMN user_id TO manpower_id;
  END IF;
END $$;

-- Drop zone_id column if exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'manpower_assignments' AND column_name = 'zone_id'
  ) THEN
    ALTER TABLE manpower_assignments DROP COLUMN zone_id;
  END IF;
END $$;

-- Ensure primary key on manpower_id
DO $$
DECLARE
  pk_name text;
BEGIN
  SELECT tc.constraint_name INTO pk_name
  FROM information_schema.table_constraints tc
  WHERE tc.table_name='manpower_assignments' AND tc.constraint_type='PRIMARY KEY';

  IF pk_name IS NULL THEN
    ALTER TABLE manpower_assignments ADD PRIMARY KEY (manpower_id);
  END IF;
END $$;

COMMIT;

-- ========== DOWN ==========
BEGIN;

-- Remove PK (optional; depends on previous state). We'll keep PK on manpower_id.
-- Recreate zone_id column (nullable to avoid data loss) and index; rename manpower_id back to user_id
ALTER TABLE manpower_assignments ADD COLUMN IF NOT EXISTS zone_id INT NULL REFERENCES zones(id) ON UPDATE CASCADE ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_manpower_assignments_zone_id ON manpower_assignments(zone_id);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'manpower_assignments' AND column_name = 'manpower_id'
  ) THEN
    ALTER TABLE manpower_assignments RENAME COLUMN manpower_id TO user_id;
  END IF;
END $$;

COMMIT;
