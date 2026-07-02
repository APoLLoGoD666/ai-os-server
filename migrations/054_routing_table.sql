-- Migration 054: Add routing_table column to adaptation_cycles
-- Stores durable routing override state that survives Render deploys.
-- adaptation-engine.js writes here after every runCycle().
-- master-orchestrator.js reads here before falling back to local JSON.

ALTER TABLE adaptation_cycles
  ADD COLUMN IF NOT EXISTS routing_table JSONB;

CREATE INDEX IF NOT EXISTS idx_adaptation_cycles_routing_table
  ON adaptation_cycles (started_at DESC)
  WHERE routing_table IS NOT NULL;
