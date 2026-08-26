-- Migration 087: Gap Resolution Attempts (KG-02 Lifecycle)
-- Tracks every attempt to supply evidence that resolves a knowledge gap.
-- A resolution attempt does NOT automatically close a gap — it creates evidence
-- that must be independently reassessed via knowledge_evidence_assessments.
-- Canonical authority: lib/knowledge/knowledge-lifecycle.js.

CREATE TABLE IF NOT EXISTS gap_resolution_attempts (
    attempt_id      text        PRIMARY KEY,
    gap_id          text        NOT NULL REFERENCES knowledge_gaps(gap_id) ON DELETE CASCADE,
    requirement_id  text        REFERENCES knowledge_requirements(requirement_id) ON DELETE SET NULL,
    strategy        text        NOT NULL
                        CHECK (strategy IN (
                            'RETRIEVE_AUTO',
                            'QUERY_API',
                            'SEARCH_MEMORY',
                            'SEARCH_DOCS',
                            'ASK_AGENT',
                            'ASK_USER',
                            'REQUEST_APPROVAL',
                            'DEFER',
                            'UNRESOLVABLE'
                        )),
    evidence_type   text        NOT NULL
                        CHECK (evidence_type IN ('OBSERVED', 'RETRIEVED', 'USER_PROVIDED', 'INFERRED', 'NONE')),
    evidence_source text,
    evidence_ref    text,
    evidence_summary text,
    -- Outcome (set after reassessment — PENDING until reassessment runs)
    outcome         text        NOT NULL DEFAULT 'PENDING'
                        CHECK (outcome IN (
                            'PENDING',      -- reassessment not yet run
                            'SUCCESS',      -- reassessment determined SATISFIED
                            'INSUFFICIENT', -- evidence present but did not satisfy
                            'CONFLICTING',  -- evidence introduced contradiction
                            'STALE',        -- evidence was expired/temporally invalid
                            'FAILED'        -- resolution process itself failed
                        )),
    outcome_reason  text,
    assessment_ref  text        REFERENCES knowledge_evidence_assessments(assessment_id) ON DELETE SET NULL,
    attempted_at    timestamptz NOT NULL DEFAULT now(),
    attempted_by    text        NOT NULL DEFAULT 'system',
    metadata        jsonb       NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_gra_gap        ON gap_resolution_attempts(gap_id, attempted_at DESC);
CREATE INDEX IF NOT EXISTS idx_gra_requirement ON gap_resolution_attempts(requirement_id, attempted_at DESC);
CREATE INDEX IF NOT EXISTS idx_gra_outcome    ON gap_resolution_attempts(outcome, attempted_at DESC);
