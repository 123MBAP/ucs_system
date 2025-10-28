-- Migration: create driver assignments (vehicle and zones)
-- Engine: PostgreSQL

-- ========== UP ==========
BEGIN;

-- A driver can be assigned to one vehicle (optional)
CREATE TABLE IF NOT EXISTS driver_vehicle_assignments (
  user_id INT PRIMARY KEY REFERENCES users(id) ON UPDATE CASCADE ON DELETE CASCADE,
  vehicle_id INT NOT NULL REFERENCES vehicles(id) ON UPDATE CASCADE ON DELETE CASCADE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- A driver can be assigned to many zones
CREATE TABLE IF NOT EXISTS driver_zone_assignments (
  user_id INT NOT NULL REFERENCES users(id) ON UPDATE CASCADE ON DELETE CASCADE,
  zone_id INT NOT NULL REFERENCES zones(id) ON UPDATE CASCADE ON DELETE CASCADE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, zone_id)
);

CREATE INDEX IF NOT EXISTS idx_driver_zone_assignments_zone_id ON driver_zone_assignments(zone_id);

COMMIT;

-- ========== DOWN ==========
BEGIN;

DROP INDEX IF EXISTS idx_driver_zone_assignments_zone_id;
DROP TABLE IF EXISTS driver_zone_assignments;
DROP TABLE IF EXISTS driver_vehicle_assignments;

COMMIT;
