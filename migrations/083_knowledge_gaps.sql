-- Migration 083: Knowledge Gaps (KG-01 Foundation)
-- Operational companion to the constitutional RealityGapEntry immutable records.
-- RealityGapEntry (constitutional_records) = permanent, immutable audit trail.
-- knowledge_gaps = queryable, mutable, lifecycle-tracked operational state.
-- Canonical authority: lib/knowledge/knowledge-gap-engine.js

CREATE TABLE IF NOT EXISTS knowledge_gaps (
    gap_id               text        PRIMARY KEY,
    gap_type             text        NOT NULL
                            CHECK (gap_type IN (
                                'UNKNOWN',          -- no information about subject
                                'MISSING',          -- should be known but absent
                                'INCOMPLETE',       -- partial knowledge, key attrs missing
                                'STALE',            -- past freshness window
                                'CONFLICTING',      -- contradictory knowledge items exist
                                'LOW_CONFIDENCE',   -- confidence below threshold
                                'UNVERIFIED',       -- exists but not passed validation pipeline
                                'CONTEXT_MISSING',  -- context needed to apply knowledge is absent
                                'DECISION_BLOCKING',-- specific decision requires missing knowledge
                                'SOURCE_UNAVAILABLE'-- authoritative source unreachable
                            )),
    subject              text        NOT NULL,   -- what the gap is about (queryable)
    description          text,                   -- detailed description
    domain_id            text,                   -- DOM-000XXX or NULL for cross-domain
    severity             text        NOT NULL DEFAULT 'MEDIUM'
                            CHECK (severity IN ('CRITICAL', 'HIGH', 'MEDIUM', 'LOW')),
    blocks_decision      boolean     NOT NULL DEFAULT false,
    auto_resolvable      boolean     NOT NULL DEFAULT false,
    resolution_strategy  text
                            CHECK (resolution_strategy IS NULL OR resolution_strategy IN (
                                'RETRIEVE_AUTO',     -- retrieve from existing memory/cache
                                'QUERY_API',         -- query connected external API
                                'SEARCH_MEMORY',     -- search canonical memory gateway
                                'SEARCH_DOCS',       -- search documents/RAG
                                'ASK_AGENT',         -- delegate to authorised agent
                                'ASK_USER',          -- require user input
                                'REQUEST_APPROVAL',  -- require governance approval
                                'DEFER',             -- defer resolution
                                'UNRESOLVABLE'       -- cannot be resolved with current resources
                            )),
    status               text        NOT NULL DEFAULT 'OPEN'
                            CHECK (status IN (
                                'OPEN',              -- gap active, unresolved
                                'IN_RESOLUTION',     -- resolution in progress
                                'RESOLVED',          -- gap filled with knowledge
                                'ACCEPTED_UNKNOWN',  -- formally accepted as permanently unknowable
                                'SUPERSEDED'         -- replaced by more specific gap
                            )),
    gap_score            integer     NOT NULL DEFAULT 50
                            CHECK (gap_score >= 0 AND gap_score <= 100),
    detected_at          timestamptz NOT NULL DEFAULT now(),
    resolved_at          timestamptz,
    resolution_notes     text,
    knowledge_ref        text,       -- knowledge_id of KnowledgeClaim (if gap relates to existing claim)
    requirement_ref      text,       -- knowledge_requirement_id (if decision-blocking)
    reality_gap_ref      text,       -- RealityGapEntry.gap_id (if linked to constitutional record)
    owner                text        NOT NULL DEFAULT 'system',
    metadata             jsonb       NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_kg_status       ON knowledge_gaps(status, gap_score DESC);
CREATE INDEX IF NOT EXISTS idx_kg_domain       ON knowledge_gaps(domain_id, status);
CREATE INDEX IF NOT EXISTS idx_kg_type         ON knowledge_gaps(gap_type, status);
CREATE INDEX IF NOT EXISTS idx_kg_blocking     ON knowledge_gaps(blocks_decision, status) WHERE blocks_decision = true;
CREATE INDEX IF NOT EXISTS idx_kg_subject      ON knowledge_gaps(subject);
CREATE INDEX IF NOT EXISTS idx_kg_detected     ON knowledge_gaps(detected_at DESC);
