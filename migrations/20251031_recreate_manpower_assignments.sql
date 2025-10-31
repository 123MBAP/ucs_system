-- Safe migration for Supabase: recreate manpower_assignments with id, manpower_id, supervisor_id, created_at
BEGIN;

-- Drop old index if exists
DROP INDEX IF EXISTS idx_manpower_assignments_zone_id;

-- Preserve old data only if table exists
DO $$
DECLARE
  manpower_col_exists BOOLEAN := FALSE;
  user_col_exists BOOLEAN := FALSE;
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables WHERE table_name = 'manpower_assignments'
  ) THEN
    -- Check which columns exist
    SELECT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'manpower_assignments' AND column_name = 'manpower_id'
    ) INTO manpower_col_exists;

    SELECT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'manpower_assignments' AND column_name = 'user_id'
    ) INTO user_col_exists;

    -- Create temp table accordingly
    IF manpower_col_exists THEN
      EXECUTE 'CREATE TEMP TABLE tmp_manpower_assignments AS SELECT manpower_id, supervisor_id FROM manpower_assignments';
    ELSIF user_col_exists THEN
      EXECUTE 'CREATE TEMP TABLE tmp_manpower_assignments AS SELECT user_id AS manpower_id, supervisor_id FROM manpower_assignments';
    ELSE
      RAISE NOTICE 'No manpower_id or user_id column found — skipping data migration.';
    END IF;

    -- Drop old table
    DROP TABLE manpower_assignments;
  END IF;
END $$;

-- Recreate with new schema
CREATE TABLE IF NOT EXISTS manpower_assignments (
  id SERIAL PRIMARY KEY,
  manpower_id INT NOT NULL REFERENCES users(id) ON UPDATE CASCADE ON DELETE CASCADE,
  supervisor_id INT NULL REFERENCES users(id) ON UPDATE CASCADE ON DELETE SET NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE (manpower_id)
);

-- Restore preserved data
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables WHERE table_name = 'tmp_manpower_assignments'
  ) THEN
    INSERT INTO manpower_assignments (manpower_id, supervisor_id)
    SELECT DISTINCT manpower_id, supervisor_id
    FROM tmp_manpower_assignments
    WHERE manpower_id IS NOT NULL;

    DROP TABLE tmp_manpower_assignments;
  END IF;
END $$;

-- Helpful index
CREATE INDEX IF NOT EXISTS idx_manpower_assignments_supervisor_id ON manpower_assignments(supervisor_id);

COMMIT;
