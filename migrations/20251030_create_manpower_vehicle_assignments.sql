-- Migration: create manpower_vehicle_assignments table
-- Engine: PostgreSQL

-- ========== UP ==========
BEGIN;

CREATE TABLE IF NOT EXISTS manpower_vehicle_assignments (
  id SERIAL PRIMARY KEY,
  manpower_id INT NOT NULL REFERENCES users(id) ON UPDATE CASCADE ON DELETE CASCADE,
  vehicle_id INT NOT NULL REFERENCES vehicles(id) ON UPDATE CASCADE ON DELETE CASCADE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE (manpower_id)
);

COMMIT;

-- ========== DOWN ==========
BEGIN;

DROP TABLE IF EXISTS manpower_vehicle_assignments;

COMMIT;
