-- migrations/089_knowledge_resolution_plans.sql
-- KG-06: Resolution plan tracking table for gap-resolution orchestration.
--
-- Every call to planResolution() writes exactly one record here.
-- The plan tracks: strategy, status lifecycle, budget/termination controls,
-- evidence provenance (per-acquisition JSONB array), and the final outcome.
--
-- IDEMPOTENT: IF NOT EXISTS on all CREATE statements.
-- NO destructive changes to existing tables.

CREATE TABLE IF NOT EXISTS knowledge_resolution_plans (
    -- Identity
    plan_id                     TEXT PRIMARY KEY,  -- KRP-{12 hex}

    -- Gap and requirement being resolved
    gap_id                      TEXT REFERENCES knowledge_gaps(gap_id) ON DELETE SET NULL,
    requirement_id              TEXT REFERENCES knowledge_requirements(requirement_id) ON DELETE SET NULL,

    -- Resolution strategy (from KG-06 RESOLUTION_STRATEGIES taxonomy)
    resolution_strategy         TEXT NOT NULL,

    -- Plan lifecycle state
    status                      TEXT NOT NULL DEFAULT 'PLANNED'
                                CHECK (status IN (
                                    'PLANNED',
                                    'RESOLVING',
                                    'EVIDENCE_ACQUIRED',
                                    'REASSESSMENT_REQUIRED',
                                    'RESOLVED',
                                    'BLOCKED',
                                    'ABANDONED'
                                )),

    -- Termination budget (bounded resolution loop)
    max_attempts                INTEGER NOT NULL DEFAULT 3,
    attempts_used               INTEGER NOT NULL DEFAULT 0,

    -- Timing
    started_at                  TIMESTAMPTZ,
    completed_at                TIMESTAMPTZ,

    -- Outcome
    outcome_determination       TEXT,   -- final determination from KG-03/04 (SATISFIED|GAP|UNCERTAIN|etc.)
    outcome_reason              TEXT,
    kg_decision_id              TEXT,   -- FK to knowledge_decision_records.decision_id

    -- Evidence provenance — per-acquisition records (JSONB array)
    -- Each element: { acquired_at, strategy, source, evidence_type, evidence_ref,
    --                 evidence_source, formed_at, assessment_id, determination, decision_id }
    evidence_provenance         JSONB NOT NULL DEFAULT '[]',

    -- User clarification state (REQUEST_USER_INFORMATION strategy)
    user_notification_id        TEXT,   -- apex_notifications.id if user was asked
    user_request_sent_at        TIMESTAMPTZ,
    user_request_question       TEXT,

    -- Audit
    requested_by                TEXT NOT NULL DEFAULT 'system',
    created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for common resolution queries
CREATE INDEX IF NOT EXISTS idx_krp_gap_id        ON knowledge_resolution_plans(gap_id);
CREATE INDEX IF NOT EXISTS idx_krp_requirement   ON knowledge_resolution_plans(requirement_id);
CREATE INDEX IF NOT EXISTS idx_krp_status        ON knowledge_resolution_plans(status);
CREATE INDEX IF NOT EXISTS idx_krp_strategy      ON knowledge_resolution_plans(resolution_strategy);
CREATE INDEX IF NOT EXISTS idx_krp_created_at    ON knowledge_resolution_plans(created_at DESC);
