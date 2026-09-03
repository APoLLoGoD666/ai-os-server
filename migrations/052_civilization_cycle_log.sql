-- 052_civilization_cycle_log.sql
-- Audit log for every civilization runtime cycle tick.
-- Written by civilization-runtime.js A3 after each tick completes.
-- Used by /api/admin/civilization-status-v2 to return last 5 cycles.

CREATE TABLE IF NOT EXISTS civilization_cycle_log (
    cycle_id        TEXT PRIMARY KEY,
    started_at      TIMESTAMPTZ NOT NULL,
    completed_at    TIMESTAMPTZ,
    duration_ms     INTEGER,
    health_score    NUMERIC(5,2),
    phases          JSONB,          -- { phase_name: 'ok'|'error'|'skipped' }
    cycle_cost_usd  NUMERIC(8,5) DEFAULT 0,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ccl_started_at ON civilization_cycle_log (started_at DESC);
