-- Migration 013 — Cognitive Evolution Schema Fixes
-- Discovered and fixed by Mission 6 integration audit.
-- (1) Extend improvement_candidates to support policy evolution proposals
-- (2) Create cognitive_evolution_reports for the intelligence evolution reporter

-- ── (1) Extend improvement_candidates for policy evolution ────────────────────
-- Add policy_name, proposed_value, current_value columns (nullable — only set for policy_evolution type)
ALTER TABLE improvement_candidates
    ADD COLUMN IF NOT EXISTS policy_name   TEXT,
    ADD COLUMN IF NOT EXISTS proposed_value JSONB,
    ADD COLUMN IF NOT EXISTS current_value  JSONB;

-- Extend the improvement_type CHECK constraint to include policy_evolution
-- (Drop and recreate since PostgreSQL doesn't support ALTER CONSTRAINT directly)
ALTER TABLE improvement_candidates
    DROP CONSTRAINT IF EXISTS improvement_candidates_improvement_type_check;

ALTER TABLE improvement_candidates
    ADD CONSTRAINT improvement_candidates_improvement_type_check
    CHECK (improvement_type IN (
        'routing','planning','model_selection','retry_strategy',
        'prompt','procedure','threshold','timeout','policy_evolution'
    ));

-- ── (2) Cognitive evolution reports table ─────────────────────────────────────
-- Purpose-built for intelligence-evolution-reporter.js.
-- Stores weekly/monthly/quarterly cognitive effectiveness reports.
CREATE TABLE IF NOT EXISTS cognitive_evolution_reports (
    report_id    TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    period       TEXT NOT NULL CHECK (period IN ('weekly','monthly','quarterly')),
    period_label TEXT NOT NULL,
    data         JSONB NOT NULL DEFAULT '{}',
    generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (period, period_label)
);
CREATE INDEX IF NOT EXISTS idx_cer_period      ON cognitive_evolution_reports(period);
CREATE INDEX IF NOT EXISTS idx_cer_generated   ON cognitive_evolution_reports(generated_at DESC);
COMMENT ON TABLE cognitive_evolution_reports IS 'Mission 5 Phase 8 — intelligence evolution reporter output. Weekly/monthly/quarterly cognitive effectiveness trends.';
