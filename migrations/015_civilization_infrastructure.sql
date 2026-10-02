-- Migration 015: Civilization Infrastructure
-- Creates the 4 tables needed for the Cognitive Runtime.
-- All tables use IF NOT EXISTS — safe to re-run.

-- ─────────────────────────────────────────────────────────
-- civilization_health_snapshots
-- Written by lib/telemetry/aggregator.js daily at 08:00 UTC
-- ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS civilization_health_snapshots (
  id             text        PRIMARY KEY DEFAULT gen_random_uuid()::text,
  score          integer     NOT NULL,
  classification text        NOT NULL,
  dimensions     jsonb       NOT NULL DEFAULT '{}',
  alerts         jsonb       NOT NULL DEFAULT '[]',
  created_at     timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_civ_health_created ON civilization_health_snapshots(created_at DESC);

-- ─────────────────────────────────────────────────────────
-- executive_decisions
-- Written by lib/executive/entity.js for each entity decision
-- ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS executive_decisions (
  id         text        PRIMARY KEY DEFAULT gen_random_uuid()::text,
  entity_id  text        NOT NULL,
  question   text        NOT NULL,
  decision   text        NOT NULL DEFAULT '',
  rationale  text,
  confidence numeric,
  escalated  boolean     NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_exec_decisions_entity ON executive_decisions(entity_id, created_at DESC);

-- ─────────────────────────────────────────────────────────
-- founder_memory
-- Layer 0 of the 13-layer memory model. Accessed via lib/memory/founder-memory.js.
-- Populated by populate-founder-memory.js migration script from Alex.md.
-- ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS founder_memory (
  id         text        PRIMARY KEY,
  section    text        NOT NULL,
  key        text        NOT NULL,
  value      jsonb       NOT NULL DEFAULT '{}',
  importance integer     NOT NULL DEFAULT 5,
  source     text        NOT NULL DEFAULT 'system',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  version    integer     NOT NULL DEFAULT 1
);
CREATE INDEX IF NOT EXISTS idx_founder_memory_section ON founder_memory(section);
CREATE UNIQUE INDEX IF NOT EXISTS idx_founder_memory_section_key ON founder_memory(section, key);

-- ─────────────────────────────────────────────────────────
-- opportunities
-- Detected by lib/opportunity/signal-collector.js.
-- Scored and reviewed by CGO weekly.
-- ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS opportunities (
  id               text        PRIMARY KEY DEFAULT gen_random_uuid()::text,
  category         text        NOT NULL,
  title            text        NOT NULL,
  description      text,
  signals          jsonb       NOT NULL DEFAULT '[]',
  composite_score  numeric     NOT NULL DEFAULT 0,
  status           text        NOT NULL DEFAULT 'detected',
  assigned_ministry text,
  roi_forecast     jsonb,
  detected_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_opportunities_status ON opportunities(status, composite_score DESC);
CREATE INDEX IF NOT EXISTS idx_opportunities_detected ON opportunities(detected_at DESC);

-- ─────────────────────────────────────────────────────────
-- Trigger: update founder_memory.updated_at on row change
-- ─────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_founder_memory_updated_at ON founder_memory;
CREATE TRIGGER trg_founder_memory_updated_at
  BEFORE UPDATE ON founder_memory
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
