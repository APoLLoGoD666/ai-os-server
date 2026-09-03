-- Migration 046: Domain Scores and Civilisation Score
-- Written daily by lib/civilization/domain-scorer.js

CREATE TABLE IF NOT EXISTS domain_scores (
  taken_at    timestamptz NOT NULL,
  domain      text        NOT NULL CHECK (domain IN ('health','execution','business','wealth','relationships','learning','spiritual')),
  score       real        CHECK (score BETWEEN 0 AND 100),
  inputs      jsonb       NOT NULL DEFAULT '{}',
  PRIMARY KEY (taken_at, domain)
);

CREATE INDEX IF NOT EXISTS domain_scores_domain_taken_idx ON domain_scores (domain, taken_at DESC);

-- Daily civilisation score (weighted mean of non-null domain scores)
CREATE TABLE IF NOT EXISTS civilisation_scores (
  scored_at   timestamptz NOT NULL PRIMARY KEY,
  score       real        NOT NULL CHECK (score BETWEEN 0 AND 100),
  breakdown   jsonb       NOT NULL DEFAULT '{}',
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS civilisation_scores_scored_idx ON civilisation_scores (scored_at DESC);
