-- Migration: create payments_transactions (pending/in-flight MoMo transactions)
-- Engine: PostgreSQL

-- ========== UP ==========
BEGIN;

CREATE TABLE IF NOT EXISTS payments_transactions (
  id SERIAL PRIMARY KEY,
  client_id INT NOT NULL REFERENCES clients(id) ON UPDATE CASCADE ON DELETE CASCADE,
  amount NUMERIC(12,2) NOT NULL,
  currency VARCHAR(8) NOT NULL DEFAULT 'RWF',
  provider VARCHAR(32) NOT NULL DEFAULT 'momo',
  phone_number VARCHAR(32) NOT NULL,
  purpose VARCHAR(128) NULL,
  external_ref VARCHAR(128) NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'pending', -- pending, initiated, awaiting_callback
  metadata JSONB NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payments_transactions_client_id ON payments_transactions(client_id);
CREATE INDEX IF NOT EXISTS idx_payments_transactions_status ON payments_transactions(status);
CREATE INDEX IF NOT EXISTS idx_payments_transactions_external_ref ON payments_transactions(external_ref);

-- trigger to auto-update updated_at
CREATE OR REPLACE FUNCTION trg_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_payments_transactions_updated_at'
  ) THEN
    CREATE TRIGGER trg_payments_transactions_updated_at
    BEFORE UPDATE ON payments_transactions
    FOR EACH ROW EXECUTE PROCEDURE trg_set_updated_at();
  END IF;
END$$;

COMMIT;

-- ========== DOWN ==========
BEGIN;

DROP TRIGGER IF EXISTS trg_payments_transactions_updated_at ON payments_transactions;
DROP FUNCTION IF EXISTS trg_set_updated_at();
DROP TABLE IF EXISTS payments_transactions;

COMMIT;
