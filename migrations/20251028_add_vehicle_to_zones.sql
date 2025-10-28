-- Migration: add vehicle_id to zones to allow assigning the same vehicle to multiple zones
-- Engine: PostgreSQL

-- ========== UP ==========
BEGIN;

ALTER TABLE zones
  ADD COLUMN IF NOT EXISTS vehicle_id INT NULL REFERENCES vehicles(id) ON UPDATE CASCADE ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_zones_vehicle_id ON zones(vehicle_id);

COMMIT;

-- ========== DOWN ==========
BEGIN;

DROP INDEX IF EXISTS idx_zones_vehicle_id;
ALTER TABLE zones DROP COLUMN IF EXISTS vehicle_id;

COMMIT;
