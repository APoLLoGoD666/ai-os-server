-- Migration 084: Knowledge Requirements (KG-01 Foundation)
-- Allows decision/reasoning systems to formally declare what information they need.
-- When a requirement cannot be satisfied from existing knowledge, a DECISION_BLOCKING
-- gap is created in knowledge_gaps and linked via gap_ref.
-- Canonical authority: lib/knowledge/knowledge-gap-engine.js

CREATE TABLE IF NOT EXISTS knowledge_requirements (
    requirement_id          text        PRIMARY KEY,
    decision_context        text        NOT NULL,   -- what decision or reasoning needs this
    required_subject        text        NOT NULL,   -- what specific information is needed
    required_domain_id      text,                   -- DOM-000XXX or NULL
    urgency                 text        NOT NULL DEFAULT 'EVENTUAL'
                                CHECK (urgency IN ('IMMEDIATE', 'SOON', 'EVENTUAL')),
    blocks_decision         boolean     NOT NULL DEFAULT false,
    status                  text        NOT NULL DEFAULT 'PENDING'
                                CHECK (status IN (
                                    'PENDING',       -- requirement declared, not yet checked
                                    'SATISFIED',     -- requirement met by existing knowledge
                                    'GAP_CREATED',   -- no existing knowledge, gap created
                                    'DEFERRED',      -- non-blocking, resolution deferred
                                    'CANCELLED'      -- requirement no longer needed
                                )),
    satisfying_knowledge_ref text,                  -- knowledge_id that satisfies this (when SATISFIED)
    gap_ref                 text        REFERENCES knowledge_gaps(gap_id) ON DELETE SET NULL,
    requester               text        NOT NULL DEFAULT 'system',
    created_at              timestamptz NOT NULL DEFAULT now(),
    satisfied_at            timestamptz,
    metadata                jsonb       NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_kr_status     ON knowledge_requirements(status, urgency);
CREATE INDEX IF NOT EXISTS idx_kr_blocking   ON knowledge_requirements(blocks_decision, status) WHERE blocks_decision = true;
CREATE INDEX IF NOT EXISTS idx_kr_requester  ON knowledge_requirements(requester, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_kr_domain     ON knowledge_requirements(required_domain_id, status);
