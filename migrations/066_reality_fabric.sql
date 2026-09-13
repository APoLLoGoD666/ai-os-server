-- Migration 066: Reality Fabric
-- Core tables for the Reality Architecture: claims lifecycle, health scores.
-- Safe to re-run (IF NOT EXISTS).

-- ─────────────────────────────────────────────────────────────────────────────
-- reality_claims
-- Every claim about the world: factual, causal, predictive, normative.
-- Travels through 13 lifecycle stages via claim_lifecycle_events.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS reality_claims (
    id               text        PRIMARY KEY DEFAULT gen_random_uuid()::text,
    entity_id        text        NOT NULL,
    domain           text        NOT NULL,
    claim_type       text        NOT NULL DEFAULT 'factual',
    content          text        NOT NULL,
    stage            text        NOT NULL DEFAULT 'potential',
    confidence       numeric     NOT NULL DEFAULT 0.5 CHECK (confidence >= 0 AND confidence <= 1),
    source           text        NOT NULL,
    evidence         jsonb       NOT NULL DEFAULT '{}',
    projected_by     jsonb       NOT NULL DEFAULT '[]',
    revision_count   integer     NOT NULL DEFAULT 0,
    stage_entered_at timestamptz NOT NULL DEFAULT now(),
    created_at       timestamptz NOT NULL DEFAULT now(),
    updated_at       timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_reality_claims_entity  ON reality_claims(entity_id, stage);
CREATE INDEX IF NOT EXISTS idx_reality_claims_domain  ON reality_claims(domain, stage);
CREATE INDEX IF NOT EXISTS idx_reality_claims_stage   ON reality_claims(stage, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_reality_claims_source  ON reality_claims(source, claim_type);

-- ─────────────────────────────────────────────────────────────────────────────
-- claim_lifecycle_events
-- Audit trail of every stage transition.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS claim_lifecycle_events (
    id          text        PRIMARY KEY DEFAULT gen_random_uuid()::text,
    claim_id    text        NOT NULL REFERENCES reality_claims(id) ON DELETE CASCADE,
    from_stage  text,
    to_stage    text        NOT NULL,
    trigger     text        NOT NULL,
    actor       text,
    evidence    jsonb       NOT NULL DEFAULT '{}',
    created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_claim_events_claim  ON claim_lifecycle_events(claim_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_claim_events_stage  ON claim_lifecycle_events(to_stage, created_at DESC);

-- ─────────────────────────────────────────────────────────────────────────────
-- reality_health_scores
-- 9-dimension completeness/accuracy scores per entity or domain.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS reality_health_scores (
    id          text        PRIMARY KEY DEFAULT gen_random_uuid()::text,
    entity_type text        NOT NULL,
    entity_id   text        NOT NULL,
    dimension   text        NOT NULL,
    score       numeric     NOT NULL DEFAULT 0 CHECK (score >= 0 AND score <= 100),
    detail      jsonb       NOT NULL DEFAULT '{}',
    measured_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_rhs_entity_dim  ON reality_health_scores(entity_id, dimension);
CREATE INDEX IF NOT EXISTS idx_rhs_entity  ON reality_health_scores(entity_id, measured_at DESC);
CREATE INDEX IF NOT EXISTS idx_rhs_score   ON reality_health_scores(score, dimension);
