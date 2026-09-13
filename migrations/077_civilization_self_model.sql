-- Migration 077: Civilization Self-Model
-- APEX as a first-class entity in its own Reality Fabric.
-- Tracks self-understanding dimensions and predictive accuracy about own behavior.

CREATE TABLE IF NOT EXISTS civilization_self_model (
    id                  text        PRIMARY KEY DEFAULT gen_random_uuid()::text,
    dimension           text        NOT NULL UNIQUE,
    current_state       text,
    assumed_capability  text,
    known_blind_spots   jsonb       NOT NULL DEFAULT '[]',
    confidence          numeric     NOT NULL DEFAULT 0.5 CHECK (confidence >= 0 AND confidence <= 1),
    evidence            jsonb       NOT NULL DEFAULT '{}',
    updated_at          timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_csm_confidence ON civilization_self_model(confidence DESC);

CREATE TABLE IF NOT EXISTS self_model_predictions (
    id              text        PRIMARY KEY DEFAULT gen_random_uuid()::text,
    dimension       text        NOT NULL,
    prediction      text        NOT NULL,
    predicted_at    timestamptz NOT NULL DEFAULT now(),
    evaluate_at     timestamptz NOT NULL,
    actual_outcome  text,
    matched         boolean,
    evaluated_at    timestamptz
);
CREATE INDEX IF NOT EXISTS idx_smp_evaluate ON self_model_predictions(evaluate_at, matched);
CREATE INDEX IF NOT EXISTS idx_smp_dimension ON self_model_predictions(dimension, predicted_at DESC);
