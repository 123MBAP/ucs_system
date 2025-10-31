-- Migration: add supervisor_id to vehicles and backfill
-- Engine: PostgreSQL

-- ========== UP ==========
BEGIN;

ALTER TABLE vehicles
  ADD COLUMN IF NOT EXISTS supervisor_id INT NULL REFERENCES users(id) ON UPDATE CASCADE ON DELETE SET NULL;

-- Backfill from supervisor_vehicle_assignments if present
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_name = 'supervisor_vehicle_assignments'
  ) THEN
    UPDATE vehicles v
    SET supervisor_id = sva.supervisor_id
    FROM supervisor_vehicle_assignments sva
    WHERE sva.vehicle_id = v.id AND v.supervisor_id IS DISTINCT FROM sva.supervisor_id;
  END IF;
END $$;

COMMIT;

-- ========== DOWN ==========
BEGIN;

ALTER TABLE vehicles
  DROP COLUMN IF EXISTS supervisor_id;

COMMIT;
