-- Migration 086: Knowledge Evidence Assessments (KG-02 Lifecycle)
-- Canonical record of every evidence assessment against a knowledge requirement.
-- A requirement may have multiple assessments across initial, resolution, and reassessment phases.
-- Canonical authority: lib/knowledge/knowledge-lifecycle.js (owned by knowledge-gap-engine.js).

CREATE TABLE IF NOT EXISTS knowledge_evidence_assessments (
    assessment_id       text        PRIMARY KEY,
    requirement_id      text        NOT NULL REFERENCES knowledge_requirements(requirement_id) ON DELETE CASCADE,
    gap_id              text        REFERENCES knowledge_gaps(gap_id) ON DELETE SET NULL,
    phase               text        NOT NULL
                            CHECK (phase IN ('INITIAL', 'RESOLUTION', 'REASSESSMENT')),
    evidence_type       text        NOT NULL
                            CHECK (evidence_type IN ('OBSERVED', 'RETRIEVED', 'USER_PROVIDED', 'INFERRED', 'NONE')),
    evidence_source     text,
    evidence_ref        text,
    evidence_content    text,
    knowledge_type      text        REFERENCES temporal_validity_windows(knowledge_type) ON DELETE SET NULL,
    formed_at           timestamptz,
    freshness_state     text
                            CHECK (freshness_state IS NULL OR freshness_state IN ('FRESH', 'STALE', 'EXPIRED', 'UNKNOWN')),
    confidence          numeric(4,3)
                            CHECK (confidence IS NULL OR (confidence >= 0 AND confidence <= 1)),
    completeness        numeric(4,3)
                            CHECK (completeness IS NULL OR (completeness >= 0 AND completeness <= 1)),
    has_contradictions  boolean     NOT NULL DEFAULT false,
    determination       text        NOT NULL
                            CHECK (determination IN ('SATISFIED', 'GAP', 'UNCERTAIN', 'INSUFFICIENT', 'CONFLICTING', 'STALE_EVIDENCE')),
    determination_reason text       NOT NULL,
    assessed_at         timestamptz NOT NULL DEFAULT now(),
    assessed_by         text        NOT NULL DEFAULT 'system',
    metadata            jsonb       NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_kea_requirement   ON knowledge_evidence_assessments(requirement_id, assessed_at DESC);
CREATE INDEX IF NOT EXISTS idx_kea_gap           ON knowledge_evidence_assessments(gap_id, phase);
CREATE INDEX IF NOT EXISTS idx_kea_determination ON knowledge_evidence_assessments(determination, assessed_at DESC);
CREATE INDEX IF NOT EXISTS idx_kea_phase         ON knowledge_evidence_assessments(phase, assessed_at DESC);
