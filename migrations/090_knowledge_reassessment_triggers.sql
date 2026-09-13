-- migrations/090_knowledge_reassessment_triggers.sql
-- KG-07: Longitudinal Knowledge Integrity — reassessment trigger audit table.
--
-- Every time previously sufficient knowledge is identified as needing reassessment,
-- one record is written here. Captures: what changed, why, the affected requirement,
-- the prior evidence, and any dependent decision that requires review.
--
-- TRIGGER TYPES:
--   EXPIRATION           — evidence has passed its temporal validity window
--   STALENESS            — evidence is stale (approaching expiration; should be refreshed)
--   CONTRADICTION        — new contradictory evidence detected
--   REQUIREMENT_CHANGE   — the knowledge requirement itself changed materially
--   EVIDENCE_SUPERSESSION — newer authoritative evidence supersedes the prior evidence
--
-- INVALIDATION STATES:
--   REASSESSMENT_REQUIRED   — trigger recorded; reassessment not yet complete
--   KNOWLEDGE_INVALIDATED   — knowledge has been invalidated; requirement needs re-evaluation
--   DECISION_REQUIRES_REVIEW — a prior decision depended on now-invalidated knowledge
--   RESOLVED                — reassessment complete; trigger closed
--
-- IDEMPOTENT: IF NOT EXISTS on all CREATE statements.
-- NO destructive changes to existing tables.

CREATE TABLE IF NOT EXISTS knowledge_reassessment_triggers (
    -- Identity
    trigger_id              TEXT PRIMARY KEY,   -- KRT-{12 hex}

    -- Affected requirement and gap
    requirement_id          TEXT REFERENCES knowledge_requirements(requirement_id) ON DELETE SET NULL,
    gap_id                  TEXT REFERENCES knowledge_gaps(gap_id) ON DELETE SET NULL,

    -- What triggered the reassessment
    trigger_type            TEXT NOT NULL CHECK (trigger_type IN (
                                'EXPIRATION',
                                'STALENESS',
                                'CONTRADICTION',
                                'REQUIREMENT_CHANGE',
                                'EVIDENCE_SUPERSESSION'
                            )),
    trigger_reason          TEXT,

    -- Prior state provenance
    prior_determination     TEXT,               -- e.g. 'SATISFIED' — what was accepted before
    prior_assessment_id     TEXT,               -- FK to knowledge_evidence_assessments.assessment_id

    -- Evidence provenance (supersession)
    superseded_evidence_ref TEXT,               -- old evidence ref that was superseded
    new_evidence_ref        TEXT,               -- new evidence that triggered this (if applicable)

    -- Dependent decision (if a prior KG-05 decision relied on the invalidated knowledge)
    kg_decision_id_ref      TEXT,               -- FK to knowledge_decision_records.decision_id

    -- Trigger lifecycle state
    invalidation_state      TEXT NOT NULL DEFAULT 'REASSESSMENT_REQUIRED'
                            CHECK (invalidation_state IN (
                                'REASSESSMENT_REQUIRED',
                                'KNOWLEDGE_INVALIDATED',
                                'DECISION_REQUIRES_REVIEW',
                                'RESOLVED'
                            )),

    -- Resolution
    resolved_at             TIMESTAMPTZ,
    resolved_by             TEXT,

    -- Audit
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_krt_requirement  ON knowledge_reassessment_triggers(requirement_id);
CREATE INDEX IF NOT EXISTS idx_krt_trigger_type ON knowledge_reassessment_triggers(trigger_type);
CREATE INDEX IF NOT EXISTS idx_krt_state        ON knowledge_reassessment_triggers(invalidation_state);
CREATE INDEX IF NOT EXISTS idx_krt_decision     ON knowledge_reassessment_triggers(kg_decision_id_ref);
CREATE INDEX IF NOT EXISTS idx_krt_created_at   ON knowledge_reassessment_triggers(created_at DESC);
