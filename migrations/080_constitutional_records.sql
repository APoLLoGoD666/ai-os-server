-- migrations/080_constitutional_records.sql
-- T3-00 (MR-08): Constitutional Records persistence table.
-- Stores all 83 constitutional type instances emitted by the APEX runtime.
-- Baseline: APEX-CONSTITUTION-v1.0

CREATE TABLE IF NOT EXISTS constitutional_records (
  id                   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  record_type          TEXT        NOT NULL,
  runtime_id           TEXT        NOT NULL,
  baseline             TEXT        NOT NULL DEFAULT 'APEX-CONSTITUTION-v1.0',
  wave                 TEXT,
  record_data          JSONB       NOT NULL,
  structural_immutable BOOLEAN     NOT NULL DEFAULT false,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  session_id           TEXT,
  trace_id             TEXT
);

CREATE INDEX IF NOT EXISTS idx_constitutional_records_type    ON constitutional_records(record_type);
CREATE INDEX IF NOT EXISTS idx_constitutional_records_runtime ON constitutional_records(runtime_id);
CREATE INDEX IF NOT EXISTS idx_constitutional_records_created ON constitutional_records(created_at);
