-- Migration: add service status tracking to supervisor_service_schedule
-- Engine: PostgreSQL

-- ========== UP ==========
BEGIN;

ALTER TABLE supervisor_service_schedule
  ADD COLUMN IF NOT EXISTS chief_report_status TEXT NULL CHECK (chief_report_status IN ('complete','not_complete')),
  ADD COLUMN IF NOT EXISTS chief_report_reason TEXT NULL,
  ADD COLUMN IF NOT EXISTS chief_reported_at TIMESTAMP NULL,
  ADD COLUMN IF NOT EXISTS supervisor_status TEXT NULL CHECK (supervisor_status IN ('complete','not_complete')),
  ADD COLUMN IF NOT EXISTS supervisor_reason TEXT NULL,
  ADD COLUMN IF NOT EXISTS supervisor_decided_at TIMESTAMP NULL;

CREATE INDEX IF NOT EXISTS idx_sss_supervisor_status ON supervisor_service_schedule(supervisor_status);
CREATE INDEX IF NOT EXISTS idx_sss_supervisor_decided_at ON supervisor_service_schedule(supervisor_decided_at);

COMMIT;

-- ========== DOWN ==========
BEGIN;

ALTER TABLE supervisor_service_schedule
  DROP COLUMN IF EXISTS supervisor_decided_at,
  DROP COLUMN IF EXISTS supervisor_reason,
  DROP COLUMN IF EXISTS supervisor_status,
  DROP COLUMN IF EXISTS chief_reported_at,
  DROP COLUMN IF EXISTS chief_report_reason,
  DROP COLUMN IF EXISTS chief_report_status;

DROP INDEX IF EXISTS idx_sss_supervisor_decided_at;
DROP INDEX IF EXISTS idx_sss_supervisor_status;

COMMIT;
