-- Migration: create vehicles table
-- Engine: PostgreSQL

-- ========== UP ==========
BEGIN;

CREATE TABLE IF NOT EXISTS vehicles (
  id SERIAL PRIMARY KEY,
  plate VARCHAR(32) NOT NULL UNIQUE,
  make VARCHAR(64),
  model VARCHAR(64),
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

COMMIT;

-- ========== DOWN ==========
BEGIN;

DROP TABLE IF EXISTS vehicles;

COMMIT;
