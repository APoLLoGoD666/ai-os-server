-- Migration 075: Meta-Model
-- APEX's model of the quality of its own modeling across all 12 architectural layers.

CREATE TABLE IF NOT EXISTS meta_model_assessments (
    id              text        PRIMARY KEY DEFAULT gen_random_uuid()::text,
    layer           text        NOT NULL,
    dimension       text        NOT NULL,
    quality_score   numeric     NOT NULL DEFAULT 0 CHECK (quality_score >= 0 AND quality_score <= 100),
    coverage        numeric     NOT NULL DEFAULT 0 CHECK (coverage >= 0 AND coverage <= 100),
    assumptions     jsonb       NOT NULL DEFAULT '[]',
    blind_spots     jsonb       NOT NULL DEFAULT '[]',
    predictive_accuracy numeric,
    detail          jsonb       NOT NULL DEFAULT '{}',
    assessed_at     timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_mma_layer_dim ON meta_model_assessments(layer, dimension);
CREATE INDEX IF NOT EXISTS idx_mma_quality ON meta_model_assessments(quality_score DESC, layer);
