-- Migration: add assigned_manpowers column to driver_vehicle_assignments
-- Engine: PostgreSQL

-- ========== UP ==========
BEGIN;

ALTER TABLE driver_vehicle_assignments
  ADD COLUMN IF NOT EXISTS assigned_manpowers INTEGER[] DEFAULT '{}';

COMMIT;

-- ========== DOWN ==========
BEGIN;

ALTER TABLE driver_vehicle_assignments
  DROP COLUMN IF EXISTS assigned_manpowers;

COMMIT;
