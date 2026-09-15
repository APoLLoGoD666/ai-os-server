-- Migration 069: Beliefs Layer
-- Held propositions that haven't crossed the evidence threshold for Knowledge.
-- Distinct from Knowledge (verified facts) and Reality (observed claims).

CREATE TABLE IF NOT EXISTS beliefs (
    id              text        PRIMARY KEY DEFAULT gen_random_uuid()::text,
    holder_id       text        NOT NULL,
    domain          text        NOT NULL,
    proposition     text        NOT NULL,
    confidence      numeric     NOT NULL DEFAULT 0.5 CHECK (confidence >= 0 AND confidence <= 1),
    status          text        NOT NULL DEFAULT 'active',
    evidence_count  integer     NOT NULL DEFAULT 0,
    revision_count  integer     NOT NULL DEFAULT 0,
    source          text,
    tags            jsonb       NOT NULL DEFAULT '[]',
    formed_at       timestamptz NOT NULL DEFAULT now(),
    last_tested_at  timestamptz,
    created_at      timestamptz NOT NULL DEFAULT now(),
    updated_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_beliefs_holder   ON beliefs(holder_id, status);
CREATE INDEX IF NOT EXISTS idx_beliefs_domain   ON beliefs(domain, confidence DESC);
CREATE INDEX IF NOT EXISTS idx_beliefs_status   ON beliefs(status, updated_at DESC);

CREATE TABLE IF NOT EXISTS belief_revisions (
    id              text        PRIMARY KEY DEFAULT gen_random_uuid()::text,
    belief_id       text        NOT NULL REFERENCES beliefs(id) ON DELETE CASCADE,
    previous_conf   numeric,
    new_conf        numeric,
    revision_type   text        NOT NULL DEFAULT 'update',
    reason          text,
    challenger_id   text,
    evidence        jsonb       NOT NULL DEFAULT '{}',
    survived        boolean,
    created_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_br_belief   ON belief_revisions(belief_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_br_survived ON belief_revisions(survived, created_at DESC);
