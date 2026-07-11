-- Migration 016: Civilization Capabilities
-- civilization_events, executive_deliberations, executive_votes, strategy_plans
-- Safe to re-run (IF NOT EXISTS).

-- ─────────────────────────────────────────────────────────
-- civilization_events
-- Written by lib/intelligence/global-intelligence-engine.js
-- ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS civilization_events (
  id              text        PRIMARY KEY DEFAULT gen_random_uuid()::text,
  category        text        NOT NULL,
  title           text        NOT NULL,
  summary         text,
  significance    numeric     NOT NULL DEFAULT 0.5,
  confidence      numeric     NOT NULL DEFAULT 0.7,
  time_horizon    text        NOT NULL DEFAULT 'medium_term',
  affected_domains jsonb      NOT NULL DEFAULT '[]',
  raw_signals     jsonb       NOT NULL DEFAULT '[]',
  source          text,
  created_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_civ_events_category   ON civilization_events(category, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_civ_events_significance ON civilization_events(significance DESC, created_at DESC);

-- ─────────────────────────────────────────────────────────
-- executive_deliberations
-- Written by lib/executive/executive-council.js
-- ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS executive_deliberations (
  id              text        PRIMARY KEY DEFAULT gen_random_uuid()::text,
  question        text        NOT NULL,
  context         jsonb       NOT NULL DEFAULT '{}',
  participants    jsonb       NOT NULL DEFAULT '[]',
  discussion      jsonb       NOT NULL DEFAULT '[]',
  final_recommendation text,
  consensus_level numeric     NOT NULL DEFAULT 0,
  status          text        NOT NULL DEFAULT 'open',
  created_at      timestamptz NOT NULL DEFAULT now(),
  resolved_at     timestamptz
);
CREATE INDEX IF NOT EXISTS idx_exec_delib_status ON executive_deliberations(status, created_at DESC);

-- ─────────────────────────────────────────────────────────
-- executive_votes
-- Written by lib/executive/executive-council.js per participant
-- ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS executive_votes (
  id                 text        PRIMARY KEY DEFAULT gen_random_uuid()::text,
  deliberation_id    text        NOT NULL REFERENCES executive_deliberations(id),
  entity_id          text        NOT NULL,
  vote               text        NOT NULL,
  rationale          text,
  confidence         numeric     NOT NULL DEFAULT 0.7,
  created_at         timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_exec_votes_delib ON executive_votes(deliberation_id);

-- ─────────────────────────────────────────────────────────
-- strategy_plans
-- Written by lib/intelligence/strategy-engine.js
-- ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS strategy_plans (
  id              text        PRIMARY KEY DEFAULT gen_random_uuid()::text,
  horizon         text        NOT NULL,
  title           text        NOT NULL,
  objectives      jsonb       NOT NULL DEFAULT '[]',
  milestones      jsonb       NOT NULL DEFAULT '[]',
  resources       jsonb       NOT NULL DEFAULT '{}',
  linked_opportunities jsonb  NOT NULL DEFAULT '[]',
  executive_input jsonb       NOT NULL DEFAULT '{}',
  health_score_at_creation integer,
  created_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_strategy_plans_horizon ON strategy_plans(horizon, created_at DESC);
