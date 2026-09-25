-- APEX v1 Kernel — Migration 039
-- Creates tool_executions (execution ledger) and approvals (attributed approval records).
-- Requires 037 + 038 to have run first.
-- Safe to re-run (IF NOT EXISTS).

-- ── Execution ledger ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tool_executions (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id     BIGINT REFERENCES agent_tasks(id) ON DELETE SET NULL,
    agent_id    UUID   REFERENCES agents(id)      ON DELETE SET NULL,
    tool_name   TEXT NOT NULL,
    input       JSONB,
    output      JSONB,
    cost_usd    NUMERIC(12,8),
    duration_ms INT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_te_task    ON tool_executions(task_id);
CREATE INDEX IF NOT EXISTS idx_te_agent   ON tool_executions(agent_id);
CREATE INDEX IF NOT EXISTS idx_te_created ON tool_executions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_te_tool    ON tool_executions(tool_name);

COMMENT ON TABLE tool_executions IS 'APEX v1 Kernel: execution ledger — one row per tool call, durable across restarts.';

-- ── Attributed approvals ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS approvals (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id           BIGINT REFERENCES agent_tasks(id)         ON DELETE SET NULL,
    tool_execution_id UUID   REFERENCES tool_executions(id)     ON DELETE SET NULL,
    approved_by       UUID   NOT NULL REFERENCES humans(id),
    action_type       TEXT   NOT NULL,
    pattern           TEXT,
    is_standing       BOOLEAN NOT NULL DEFAULT false,
    granted_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at        TIMESTAMPTZ,
    revoked_at        TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_approvals_human    ON approvals(approved_by);
CREATE INDEX IF NOT EXISTS idx_approvals_task     ON approvals(task_id);
CREATE INDEX IF NOT EXISTS idx_approvals_standing ON approvals(is_standing) WHERE is_standing = true;
CREATE INDEX IF NOT EXISTS idx_approvals_type     ON approvals(action_type);

COMMENT ON TABLE approvals IS 'APEX v1 Kernel: every approval has an approver. Replaces anonymous standing_approvals.';
