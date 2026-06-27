-- Migration 023: Episodic analytics fix
-- Fixes contaminated success-rate metrics caused by gateway writes polluting episodic_memory.
-- Analytics now source from apex_agent_runs (UPSERT, 1 row/task, correct success values).

-- Add source index to episodic_memory for display queries (getRecent, getFailures still use it).
CREATE INDEX IF NOT EXISTS idx_em_source ON episodic_memory(source);

-- Data repair: mark gateway-contaminated rows so they are excluded from manual audits.
-- Distinguisher: _auditLog writes always set models_used IS NOT NULL;
--                gateway duplicate writes always have models_used IS NULL.
-- This UPDATE tags the corrupt rows without deleting them (reversible).
-- C3 fix: 'gateway_duplicate' is not in the CHECK constraint (candidates: candidate,validated,deprecated,superseded,archived).
-- Using 'deprecated' as the closest semantic match for contaminated gateway writes.
UPDATE episodic_memory
SET status = 'deprecated'
WHERE source = 'orchestrator'
  AND models_used IS NULL
  AND status = 'validated';

-- Verify: count repaired rows (informational only, not blocking)
-- SELECT COUNT(*) FROM episodic_memory WHERE status = 'gateway_duplicate';

-- After repair, production getSuccessRate reads apex_agent_runs directly and is unaffected
-- by this table's contents. This UPDATE only improves data hygiene for future audits.
