-- APEX v1 Kernel — Migration 040
-- Adds ownership FK columns to agent_tasks and memory.
-- All columns nullable — existing rows unaffected.
-- Requires 037 + 038 to have run first.

-- ── agent_tasks: add ownership ────────────────────────────────────────────────
ALTER TABLE agent_tasks
    ADD COLUMN IF NOT EXISTS created_by        UUID REFERENCES humans(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS assigned_agent_id UUID REFERENCES agents(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_tasks_created_by ON agent_tasks(created_by);

-- Backfill: give all existing tasks to the owner human
UPDATE agent_tasks
SET created_by = '00000000-0000-4000-8000-000000000001'
WHERE created_by IS NULL;

-- ── memory: add provenance columns ────────────────────────────────────────────
ALTER TABLE memory
    ADD COLUMN IF NOT EXISTS kernel_task_id     BIGINT REFERENCES agent_tasks(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS kernel_agent_id    UUID   REFERENCES agents(id)      ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS kernel_human_id    UUID   REFERENCES humans(id)      ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS kernel_layer       INT,
    ADD COLUMN IF NOT EXISTS kernel_importance  FLOAT  DEFAULT 0.5,
    ADD COLUMN IF NOT EXISTS kernel_expires_at  TIMESTAMPTZ;

-- Prefix kernel_ to avoid collision with any existing columns named task_id/layer/etc.

CREATE INDEX IF NOT EXISTS idx_memory_kernel_task  ON memory(kernel_task_id);
CREATE INDEX IF NOT EXISTS idx_memory_kernel_agent ON memory(kernel_agent_id);
CREATE INDEX IF NOT EXISTS idx_memory_kernel_layer ON memory(kernel_layer);

-- ── Migrate standing_approvals → approvals ────────────────────────────────────
-- Only migrates enabled rows. approved_by set to seeded human.
INSERT INTO approvals (action_type, pattern, is_standing, approved_by, granted_at)
SELECT
    action_type,
    pattern,
    true,
    '00000000-0000-4000-8000-000000000001',
    now()
FROM standing_approvals
WHERE enabled = true
ON CONFLICT DO NOTHING;

-- Verify migration:
-- SELECT COUNT(*) FROM standing_approvals WHERE enabled = true;   -- should match:
-- SELECT COUNT(*) FROM approvals WHERE is_standing = true;
