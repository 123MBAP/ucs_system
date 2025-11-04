-- Migration: add image_url to vehicles
-- Engine: PostgreSQL

-- ========== UP ==========
BEGIN;

ALTER TABLE vehicles
  ADD COLUMN IF NOT EXISTS image_url VARCHAR(512);

COMMIT;

-- ========== DOWN ==========
BEGIN;

ALTER TABLE vehicles
  DROP COLUMN IF EXISTS image_url;

COMMIT;
