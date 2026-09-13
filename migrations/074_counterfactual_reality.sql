-- Migration 074: Counterfactual Reality
-- Alternative possible worlds for decision analysis, attribution, and adversarial testing.

CREATE TABLE IF NOT EXISTS counterfactual_worlds (
    id              text        PRIMARY KEY DEFAULT gen_random_uuid()::text,
    world_name      text        NOT NULL,
    basis_decision  text        NOT NULL,
    divergence_point timestamptz NOT NULL,
    description     text,
    world_type      text        NOT NULL DEFAULT 'decision_alternative',
    assumptions     jsonb       NOT NULL DEFAULT '[]',
    projected_outcome jsonb     NOT NULL DEFAULT '{}',
    probability     numeric     DEFAULT 0.5 CHECK (probability >= 0 AND probability <= 1),
    status          text        NOT NULL DEFAULT 'hypothetical',
    created_by      text,
    created_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_cf_basis      ON counterfactual_worlds(basis_decision, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_cf_type       ON counterfactual_worlds(world_type, status);
CREATE INDEX IF NOT EXISTS idx_cf_divergence ON counterfactual_worlds(divergence_point DESC);

CREATE TABLE IF NOT EXISTS cf_divergence_points (
    id               text        PRIMARY KEY DEFAULT gen_random_uuid()::text,
    world_id         text        NOT NULL REFERENCES counterfactual_worlds(id) ON DELETE CASCADE,
    actual_choice    text        NOT NULL,
    counterfactual_choice text   NOT NULL,
    domain           text        NOT NULL,
    impact_estimate  jsonb       NOT NULL DEFAULT '{}',
    probability_cf   numeric,
    created_at       timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_cfp_world ON cf_divergence_points(world_id);
