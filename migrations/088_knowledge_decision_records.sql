-- migrations/088_knowledge_decision_records.sql
-- KG-05: Canonical audit table for knowledge-gated decision evaluations.
--
-- Every call to evaluateKnowledgeDecision() writes exactly one record here.
-- This provides a complete, immutable audit trail of every point at which
-- knowledge sufficiency was assessed before a consequential action.
--
-- IDEMPOTENT: IF NOT EXISTS on all CREATE statements.
-- NO destructive changes to existing tables.

CREATE TABLE IF NOT EXISTS knowledge_decision_records (
    -- Identity
    decision_id         TEXT PRIMARY KEY,

    -- Decision context (what action is being gated)
    decision_context    TEXT,
    action_type         TEXT,

    -- Decision outcome
    outcome             TEXT NOT NULL
                        CHECK (outcome IN (
                            'PROCEED',
                            'PROCEED_WITH_CONDITION',
                            'REQUEST_INFORMATION',
                            'BLOCKED'
                        )),
    outcome_reason      TEXT,
    can_proceed         BOOLEAN NOT NULL DEFAULT false,

    -- Sufficiency summary (duplicated from knowledge_context for fast querying)
    sufficiency_state   TEXT NOT NULL,
    has_blocking_gaps   BOOLEAN NOT NULL DEFAULT false,
    blocking_gap_count  INTEGER NOT NULL DEFAULT 0,
    blocking_reasons    JSONB NOT NULL DEFAULT '[]',

    -- Full payload (requirements declared + full knowledge context for reconstruction)
    requirements        JSONB NOT NULL DEFAULT '[]',
    knowledge_context   JSONB NOT NULL DEFAULT '{}',

    -- Audit
    assessed_by         TEXT NOT NULL DEFAULT 'system',
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for common queries: outcome filtering, time-range audits, caller analysis
CREATE INDEX IF NOT EXISTS idx_kdr_outcome       ON knowledge_decision_records(outcome);
CREATE INDEX IF NOT EXISTS idx_kdr_can_proceed   ON knowledge_decision_records(can_proceed);
CREATE INDEX IF NOT EXISTS idx_kdr_assessed_by   ON knowledge_decision_records(assessed_by);
CREATE INDEX IF NOT EXISTS idx_kdr_created_at    ON knowledge_decision_records(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_kdr_suf_state     ON knowledge_decision_records(sufficiency_state);
