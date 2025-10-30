-- Migration: add unique constraint on vehicle_id for supervisor_vehicle_assignments
-- Engine: PostgreSQL

-- ========== UP ==========
BEGIN;

ALTER TABLE supervisor_vehicle_assignments
  ADD CONSTRAINT uq_sva_vehicle UNIQUE (vehicle_id);

COMMIT;

-- ========== DOWN ==========
BEGIN;

ALTER TABLE supervisor_vehicle_assignments
  DROP CONSTRAINT IF EXISTS uq_sva_vehicle;

COMMIT;
