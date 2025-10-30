-- Migration: add unique constraint on supervisor_id for supervisor_vehicle_assignments
-- Engine: PostgreSQL

-- ========== UP ==========
BEGIN;

ALTER TABLE supervisor_vehicle_assignments
  ADD CONSTRAINT uq_sva_supervisor UNIQUE (supervisor_id);

COMMIT;

-- ========== DOWN ==========
BEGIN;

ALTER TABLE supervisor_vehicle_assignments
  DROP CONSTRAINT IF EXISTS uq_sva_supervisor;

COMMIT;
