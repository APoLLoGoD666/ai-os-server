-- Migration 036: Add composite indexes on high-frequency traversal columns
-- M14 fix: agent_decisions(task_id, trace_id) only has separate single-column indexes.
-- The primary query pattern is WHERE task_id = ? AND trace_id = ? — needs composite.

CREATE INDEX IF NOT EXISTS idx_ad_task_trace
    ON agent_decisions(task_id, trace_id);

-- Plain covering index on created_at for recency-ordered queries
CREATE INDEX IF NOT EXISTS idx_ad_created_at
    ON agent_decisions(created_at DESC);
