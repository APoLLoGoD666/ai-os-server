-- Migration 020: Strategic Intelligence Engine
-- Stores analysis results, recommendations, and decision logs.

CREATE TABLE IF NOT EXISTS sie_analyses (
  id              TEXT        PRIMARY KEY,
  analysis_type   TEXT        NOT NULL,
  data            JSONB       NOT NULL DEFAULT '{}',
  generated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS sie_analyses_type_idx ON sie_analyses(analysis_type);
CREATE INDEX IF NOT EXISTS sie_analyses_gen_idx  ON sie_analyses(generated_at DESC);

CREATE TABLE IF NOT EXISTS sie_recommendations (
  id              TEXT        PRIMARY KEY,
  horizon         TEXT        NOT NULL,
  recommendations JSONB       NOT NULL DEFAULT '[]',
  context_summary TEXT,
  generated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS sie_rec_horizon_idx ON sie_recommendations(horizon);
CREATE INDEX IF NOT EXISTS sie_rec_gen_idx     ON sie_recommendations(generated_at DESC);

CREATE TABLE IF NOT EXISTS sie_decisions (
  id          TEXT        PRIMARY KEY,
  decision    TEXT        NOT NULL,
  options     JSONB       NOT NULL DEFAULT '[]',
  result      JSONB       NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS sie_dec_created_idx ON sie_decisions(created_at DESC);
