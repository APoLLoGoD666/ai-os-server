-- 097_apex_agent_runs_source_task_id.sql
-- Adds source_task_id to apex_agent_runs so domain and office agent runs
-- can be authoritatively traced back to the apex_tasks row that triggered them.
--
-- Historical rows are left NULL intentionally.
-- NULL source_task_id means "provenance unknown" — never fabricate.

ALTER TABLE apex_agent_runs
  ADD COLUMN IF NOT EXISTS source_task_id TEXT;

COMMENT ON COLUMN apex_agent_runs.source_task_id IS
  'apex_tasks.id that triggered this run. NULL = historical/unknown provenance.';
