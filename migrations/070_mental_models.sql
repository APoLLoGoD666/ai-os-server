-- Migration 070: Mental Models
-- Per-agent structured frameworks with assumptions, accuracy tracking, and blind spot detection.

CREATE TABLE IF NOT EXISTS mental_models (
    id              text        PRIMARY KEY DEFAULT gen_random_uuid()::text,
    agent_id        text        NOT NULL,
    domain          text        NOT NULL,
    model_name      text        NOT NULL,
    description     text,
    assumptions     jsonb       NOT NULL DEFAULT '[]',
    accuracy        numeric     NOT NULL DEFAULT 0.5 CHECK (accuracy >= 0 AND accuracy <= 1),
    blind_spots     jsonb       NOT NULL DEFAULT '[]',
    prediction_hits integer     NOT NULL DEFAULT 0,
    prediction_miss integer     NOT NULL DEFAULT 0,
    last_updated_at timestamptz NOT NULL DEFAULT now(),
    created_at      timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_mm_agent_domain ON mental_models(agent_id, domain, model_name);
CREATE INDEX IF NOT EXISTS idx_mm_agent    ON mental_models(agent_id, accuracy DESC);
CREATE INDEX IF NOT EXISTS idx_mm_accuracy ON mental_models(accuracy, domain);

CREATE TABLE IF NOT EXISTS model_assumptions (
    id          text        PRIMARY KEY DEFAULT gen_random_uuid()::text,
    model_id    text        NOT NULL REFERENCES mental_models(id) ON DELETE CASCADE,
    assumption  text        NOT NULL,
    confidence  numeric     NOT NULL DEFAULT 0.5,
    verified    boolean,
    conflicts   jsonb       NOT NULL DEFAULT '[]',
    created_at  timestamptz NOT NULL DEFAULT now(),
    updated_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ma_model  ON model_assumptions(model_id, confidence DESC);
CREATE INDEX IF NOT EXISTS idx_ma_verified ON model_assumptions(verified, model_id);
