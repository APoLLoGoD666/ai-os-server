-- Migration 017: Reality Convergence
-- Adds evidence/lineage columns to existing tables.
-- Creates performance, outcome, resource, and value tracking tables.
-- Safe to re-run (IF NOT EXISTS / ADD COLUMN IF NOT EXISTS).

-- ─────────────────────────────────────────────────────────
-- Extend civilization_events with evidence fields
-- ─────────────────────────────────────────────────────────
ALTER TABLE civilization_events
  ADD COLUMN IF NOT EXISTS evidence          jsonb   NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS is_synthetic      boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS input_signal_count integer NOT NULL DEFAULT 0;

-- ─────────────────────────────────────────────────────────
-- Extend opportunities with lineage fields
-- ─────────────────────────────────────────────────────────
ALTER TABLE opportunities
  ADD COLUMN IF NOT EXISTS origin_event_ids jsonb NOT NULL DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS reasoning_chain  text;

-- ─────────────────────────────────────────────────────────
-- executive_performance
-- Written by lib/intelligence/executive-performance-engine.js
-- ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS executive_performance (
  id                  text        PRIMARY KEY DEFAULT gen_random_uuid()::text,
  entity_id           text        NOT NULL,
  decision_id         text,
  recommendation      text        NOT NULL,
  recommendation_at   timestamptz NOT NULL DEFAULT now(),
  outcome_recorded_at timestamptz,
  outcome             text,
  outcome_matched     boolean,
  confidence_at_time  numeric,
  impact_score        numeric,
  notes               text
);
CREATE INDEX IF NOT EXISTS idx_exec_perf_entity ON executive_performance(entity_id, recommendation_at DESC);
CREATE INDEX IF NOT EXISTS idx_exec_perf_outcome ON executive_performance(outcome_matched, entity_id);

-- ─────────────────────────────────────────────────────────
-- decision_outcomes
-- Written by lib/intelligence/decision-outcome-engine.js
-- ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS decision_outcomes (
  id               text        PRIMARY KEY DEFAULT gen_random_uuid()::text,
  decision_source  text        NOT NULL,
  decision_id      text,
  question         text        NOT NULL,
  expected_outcome text        NOT NULL,
  actual_outcome   text,
  variance         text,
  lessons_learned  text,
  decided_at       timestamptz NOT NULL DEFAULT now(),
  outcome_at       timestamptz,
  status           text        NOT NULL DEFAULT 'pending'
);
CREATE INDEX IF NOT EXISTS idx_decision_outcomes_status ON decision_outcomes(status, decided_at DESC);
CREATE INDEX IF NOT EXISTS idx_decision_outcomes_source ON decision_outcomes(decision_source);

-- ─────────────────────────────────────────────────────────
-- resource_ledger
-- Written by lib/intelligence/resource-authority-engine.js
-- Every resource consumption event is a row.
-- ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS resource_ledger (
  id           text        PRIMARY KEY DEFAULT gen_random_uuid()::text,
  resource     text        NOT NULL,
  amount       numeric     NOT NULL,
  unit         text        NOT NULL,
  direction    text        NOT NULL DEFAULT 'consumed',
  task_id      text,
  source       text,
  recorded_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_resource_ledger_resource ON resource_ledger(resource, recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_resource_ledger_task ON resource_ledger(task_id);

-- ─────────────────────────────────────────────────────────
-- value_creation_events
-- Written by lib/intelligence/value-creation-engine.js
-- ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS value_creation_events (
  id              text        PRIMARY KEY DEFAULT gen_random_uuid()::text,
  event_type      text        NOT NULL,
  opportunity_id  text,
  description     text        NOT NULL,
  value_usd       numeric     NOT NULL DEFAULT 0,
  cost_usd        numeric     NOT NULL DEFAULT 0,
  roi             numeric,
  payback_days    integer,
  evidence        jsonb       NOT NULL DEFAULT '{}',
  recorded_at     timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_value_events_type ON value_creation_events(event_type, recorded_at DESC);
