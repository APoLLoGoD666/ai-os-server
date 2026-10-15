-- Migration 008: Governance Probes table
-- Purpose: stores results of every automated governance certification probe.
-- A probe is a synthetic execution that exercises all DB write paths and reads
-- back to verify. A capability is PASS only when the row exists in the DB.
-- Applied: 2026-06-09

CREATE TABLE IF NOT EXISTS governance_probes (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    probe_type  TEXT        NOT NULL DEFAULT 'full',
    task_id     TEXT,
    trace_id    TEXT,
    score       INT         NOT NULL DEFAULT 0,
    passed      BOOLEAN     NOT NULL DEFAULT FALSE,
    evidence    JSONB,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_governance_probes_created_at ON governance_probes(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_governance_probes_passed     ON governance_probes(passed, created_at DESC);
