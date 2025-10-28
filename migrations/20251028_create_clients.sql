-- Migration: create clients table
-- Engine: PostgreSQL

-- ========== UP ==========
BEGIN;

CREATE TABLE IF NOT EXISTS clients (
    id SERIAL PRIMARY KEY,
    username VARCHAR(100) NOT NULL,
    name JSONB NOT NULL,
    role_id INT NOT NULL REFERENCES roles(id) ON UPDATE CASCADE ON DELETE RESTRICT,
    zone_id INT NOT NULL REFERENCES zones(id) ON UPDATE CASCADE ON DELETE RESTRICT,
    phone_number VARCHAR(30) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Helpful index for lookup by zone
CREATE INDEX IF NOT EXISTS idx_clients_zone_id ON clients(zone_id);
-- Helpful index for lookup by role
CREATE INDEX IF NOT EXISTS idx_clients_role_id ON clients(role_id);

COMMIT;

-- ========== DOWN ==========
BEGIN;

DROP INDEX IF EXISTS idx_clients_role_id;
DROP INDEX IF EXISTS idx_clients_zone_id;
DROP TABLE IF EXISTS clients;

COMMIT;
