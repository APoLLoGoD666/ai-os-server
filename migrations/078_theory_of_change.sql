-- Migration 078: Theory of Change
-- Causal chain tracking: intervention → mechanism nodes → intended outcome.

CREATE TABLE IF NOT EXISTS toc_chains (
    id               text        PRIMARY KEY DEFAULT gen_random_uuid()::text,
    chain_name       text        NOT NULL,
    domain           text        NOT NULL,
    intervention     text        NOT NULL,
    intended_outcome text        NOT NULL,
    assumptions      jsonb       NOT NULL DEFAULT '[]',
    status           text        NOT NULL DEFAULT 'active',
    confidence       numeric     NOT NULL DEFAULT 0.5 CHECK (confidence >= 0 AND confidence <= 1),
    evidence         jsonb       NOT NULL DEFAULT '{}',
    created_by       text,
    created_at       timestamptz NOT NULL DEFAULT now(),
    updated_at       timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_toc_domain ON toc_chains(domain, status);
CREATE INDEX IF NOT EXISTS idx_toc_conf   ON toc_chains(confidence DESC);

CREATE TABLE IF NOT EXISTS toc_nodes (
    id          text        PRIMARY KEY DEFAULT gen_random_uuid()::text,
    chain_id    text        NOT NULL REFERENCES toc_chains(id) ON DELETE CASCADE,
    step_order  integer     NOT NULL,
    cause       text        NOT NULL,
    effect      text        NOT NULL,
    mechanism   text,
    confidence  numeric     NOT NULL DEFAULT 0.5 CHECK (confidence >= 0 AND confidence <= 1),
    verified    boolean     NOT NULL DEFAULT false,
    created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_tn_chain ON toc_nodes(chain_id, step_order);
CREATE INDEX IF NOT EXISTS idx_tn_verified ON toc_nodes(verified, chain_id);
