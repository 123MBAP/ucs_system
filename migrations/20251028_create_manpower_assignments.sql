-- Migration: create manpower_assignments table (one zone per manpower)
-- Engine: PostgreSQL

-- ========== UP ==========
BEGIN;

CREATE TABLE IF NOT EXISTS manpower_assignments (
  user_id INT PRIMARY KEY REFERENCES users(id) ON UPDATE CASCADE ON DELETE CASCADE,
  zone_id INT NOT NULL REFERENCES zones(id) ON UPDATE CASCADE ON DELETE CASCADE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_manpower_assignments_zone_id ON manpower_assignments(zone_id);

COMMIT;

-- ========== DOWN ==========
BEGIN;

DROP INDEX IF EXISTS idx_manpower_assignments_zone_id;
DROP TABLE IF EXISTS manpower_assignments;

COMMIT;
