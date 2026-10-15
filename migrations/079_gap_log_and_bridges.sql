-- Migration 079: Belief-Reality Gap Log + Intent-Reality Bridge
-- Time-series gap tracking for trend analysis. Causal bridge between intent and produced claims.

CREATE TABLE IF NOT EXISTS belief_reality_gap_log (
    id               text        PRIMARY KEY DEFAULT gen_random_uuid()::text,
    domain           text        NOT NULL,
    gap_score        numeric     NOT NULL DEFAULT 0,
    total_beliefs    integer     NOT NULL DEFAULT 0,
    residual_beliefs integer     NOT NULL DEFAULT 0,
    stale_beliefs    integer     NOT NULL DEFAULT 0,
    measured_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_brg_domain ON belief_reality_gap_log(domain, measured_at DESC);
CREATE INDEX IF NOT EXISTS idx_brg_score  ON belief_reality_gap_log(gap_score DESC, measured_at DESC);

CREATE TABLE IF NOT EXISTS intent_reality_bridge (
    id          text        PRIMARY KEY DEFAULT gen_random_uuid()::text,
    intent_id   text        NOT NULL REFERENCES intent_records(id) ON DELETE CASCADE,
    claim_id    text        NOT NULL REFERENCES reality_claims(id) ON DELETE CASCADE,
    bridge_type text        NOT NULL DEFAULT 'produced',
    created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_irb_pair   ON intent_reality_bridge(intent_id, claim_id);
CREATE INDEX IF NOT EXISTS idx_irb_intent ON intent_reality_bridge(intent_id);
CREATE INDEX IF NOT EXISTS idx_irb_claim  ON intent_reality_bridge(claim_id);
