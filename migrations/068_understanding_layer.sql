-- Migration 068: Understanding Layer
-- How well APEX models what exists. Distinct from Knowledge (facts) and Beliefs (propositions).

CREATE TABLE IF NOT EXISTS understanding_scores (
    id           text        PRIMARY KEY DEFAULT gen_random_uuid()::text,
    entity_id    text        NOT NULL,
    domain       text        NOT NULL,
    dimension    text        NOT NULL,
    score        numeric     NOT NULL DEFAULT 0 CHECK (score >= 0 AND score <= 100),
    basis        text,
    detail       jsonb       NOT NULL DEFAULT '{}',
    measured_at  timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_us_entity_dim  ON understanding_scores(entity_id, dimension);
CREATE INDEX IF NOT EXISTS idx_us_domain  ON understanding_scores(domain, score DESC);

CREATE TABLE IF NOT EXISTS understanding_gaps (
    id           text        PRIMARY KEY DEFAULT gen_random_uuid()::text,
    entity_id    text        NOT NULL,
    domain       text        NOT NULL,
    gap_type     text        NOT NULL,
    description  text        NOT NULL,
    severity     text        NOT NULL DEFAULT 'medium',
    evidence     jsonb       NOT NULL DEFAULT '{}',
    resolved     boolean     NOT NULL DEFAULT false,
    resolved_at  timestamptz,
    created_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ug_entity   ON understanding_gaps(entity_id, resolved);
CREATE INDEX IF NOT EXISTS idx_ug_severity ON understanding_gaps(severity, resolved, created_at DESC);
