-- Migration: create payments_completed (settled MoMo transactions)
-- Engine: PostgreSQL

-- ========== UP ==========
BEGIN;

CREATE TABLE IF NOT EXISTS payments_completed (
  id SERIAL PRIMARY KEY,
  client_id INT NOT NULL REFERENCES clients(id) ON UPDATE CASCADE ON DELETE SET NULL,
  amount NUMERIC(12,2) NOT NULL,
  currency VARCHAR(8) NOT NULL DEFAULT 'RWF',
  provider VARCHAR(32) NOT NULL DEFAULT 'momo',
  phone_number VARCHAR(32) NOT NULL,
  purpose VARCHAR(128) NULL,
  external_ref VARCHAR(128) NULL,
  transaction_id VARCHAR(128) NULL, -- provider transaction id
  status VARCHAR(32) NOT NULL DEFAULT 'success', -- success, failed, reversed
  metadata JSONB NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payments_completed_client_id ON payments_completed(client_id);
CREATE INDEX IF NOT EXISTS idx_payments_completed_status ON payments_completed(status);
CREATE INDEX IF NOT EXISTS idx_payments_completed_external_ref ON payments_completed(external_ref);

COMMIT;

-- ========== DOWN ==========
BEGIN;

DROP TABLE IF EXISTS payments_completed;

COMMIT;
