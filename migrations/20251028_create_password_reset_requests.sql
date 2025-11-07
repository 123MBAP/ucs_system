-- Migration: create password_reset_requests table
-- Engine: PostgreSQL

-- ========== UP ==========
BEGIN;

CREATE TABLE IF NOT EXISTS password_reset_requests (
  id SERIAL PRIMARY KEY,
  user_type VARCHAR(20) NOT NULL CHECK (user_type IN ('user','client')),
  user_id INT NOT NULL,
  email VARCHAR(255),
  kind VARCHAR(30) NOT NULL DEFAULT 'email' CHECK (kind IN ('email','client_request')),
  code VARCHAR(12),
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','completed','cancelled','expired')),
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_prr_user ON password_reset_requests(user_type, user_id);
CREATE INDEX IF NOT EXISTS idx_prr_status ON password_reset_requests(status);

COMMIT;

-- ========== DOWN ==========
BEGIN;

DROP INDEX IF EXISTS idx_prr_status;
DROP INDEX IF EXISTS idx_prr_user;
DROP TABLE IF EXISTS password_reset_requests;

COMMIT;
