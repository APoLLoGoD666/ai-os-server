-- 093_opportunities_evidence_refs.sql
-- V-11-J: OPPORTUNITIES SCHEMA/DATA-CONTRACT CONVERGENCE
--
-- Adds a top-level `evidence_refs jsonb` column to the `opportunities` table
-- so that the API can return the canonical evidence-refs contract
-- (Array<{ label, source, ts }>) directly instead of lifting it out of
-- `roi_forecast.evidence_refs` (where it was previously stored as raw
-- reference strings such as "EVT-0" / "MEM-2").
--
-- Reference: docs/interface/V-11-EXPERIENCE-ARCHITECTURE-SPECIFICATION.md
--   §22.2 "Schema Fix Required" — `ALTER TABLE opportunities ADD COLUMN
--         IF NOT EXISTS evidence_refs jsonb`
--   §28.11 Phase V-11-J: Opportunities Schema Fix
--
-- Safety:
--   * ADD COLUMN IF NOT EXISTS — idempotent.
--   * Default '[]' jsonb so existing rows validate the new contract shape.
--   * Additive-only: legacy `roi_forecast.evidence_refs` is preserved.
--   * Read path in routes/intelligence.js prefers the top-level column but
--     falls back to `roi_forecast.evidence_refs` when the top-level column
--     is empty, so unmigrated environments continue to work.
--   * Wrapped in a single transaction for atomic apply/rollback.
--
-- Rollback:
--   ALTER TABLE opportunities DROP COLUMN IF EXISTS evidence_refs;

BEGIN;

ALTER TABLE opportunities
  ADD COLUMN IF NOT EXISTS evidence_refs jsonb NOT NULL DEFAULT '[]'::jsonb;

COMMIT;
