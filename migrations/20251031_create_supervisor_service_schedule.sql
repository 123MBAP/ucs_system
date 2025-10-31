-- Migration: create supervisor_service_schedule table
-- Engine: PostgreSQL

-- ========== UP ==========
BEGIN;

CREATE TABLE IF NOT EXISTS supervisor_service_schedule (
  id SERIAL PRIMARY KEY,
  zone_id INT NOT NULL REFERENCES zones(id) ON UPDATE CASCADE ON DELETE CASCADE,
  supervisor_id INT NOT NULL REFERENCES users(id) ON UPDATE CASCADE ON DELETE CASCADE,
  vehicle_id INT NOT NULL REFERENCES vehicles(id) ON UPDATE CASCADE ON DELETE CASCADE,
  driver_id INT NULL REFERENCES users(id) ON UPDATE CASCADE ON DELETE SET NULL,
  service_day SMALLINT NOT NULL CHECK (service_day BETWEEN 1 AND 7),
  service_start TIME NOT NULL,
  service_end TIME NOT NULL,
  assigned_manpower_ids INT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sss_zone_supervisor ON supervisor_service_schedule(zone_id, supervisor_id);
CREATE INDEX IF NOT EXISTS idx_sss_vehicle ON supervisor_service_schedule(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_sss_day ON supervisor_service_schedule(service_day);

COMMIT;

-- ========== DOWN ==========
BEGIN;

DROP INDEX IF EXISTS idx_sss_day;
DROP INDEX IF EXISTS idx_sss_vehicle;
DROP INDEX IF EXISTS idx_sss_zone_supervisor;
DROP TABLE IF EXISTS supervisor_service_schedule;

COMMIT;
