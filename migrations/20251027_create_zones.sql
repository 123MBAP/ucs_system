-- Migration: create zones table
-- Engine: PostgreSQL

-- ========== UP ==========
BEGIN;

CREATE TABLE IF NOT EXISTS zones (
    id SERIAL PRIMARY KEY,
    zone_name VARCHAR(100) NOT NULL,
    cell VARCHAR(100) NOT NULL,
    village VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    assigned_chief INT NULL REFERENCES users(id) ON UPDATE CASCADE ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Helpful index for lookup by chief
CREATE INDEX IF NOT EXISTS idx_zones_assigned_chief ON zones(assigned_chief);

COMMIT;

-- ========== DOWN ==========
BEGIN;

DROP INDEX IF EXISTS idx_zones_assigned_chief;
DROP TABLE IF EXISTS zones;

COMMIT;
