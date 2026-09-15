-- Migration 027: WS-1 validator audit columns
-- These columns were originally applied via Supabase Management API during Phase 9 (2026-06-15)
-- as part of the WS-1B remediation to capture per-stage diagnostic notes from the VALIDATOR agent.
-- IF NOT EXISTS guards make this idempotent — safe to run against production where columns already exist.

ALTER TABLE apex_agent_runs   ADD COLUMN IF NOT EXISTS note TEXT;
ALTER TABLE apex_agent_stages ADD COLUMN IF NOT EXISTS note TEXT;
