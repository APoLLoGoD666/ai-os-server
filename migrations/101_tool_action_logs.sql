-- @apex-migration
-- @status:     APPROVED
-- @description: Tool action execution log for external tool calls via tool-registry
-- Tool action execution log
CREATE TABLE IF NOT EXISTS tool_action_logs (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug         TEXT NOT NULL,
    action       TEXT NOT NULL,
    params       JSONB,
    result       JSONB,
    error        TEXT,
    duration_ms  INTEGER,
    triggered_by TEXT NOT NULL DEFAULT 'chat', -- 'chat' | 'agent' | 'api'
    human_id     TEXT,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tool_action_logs_slug        ON tool_action_logs(slug);
CREATE INDEX IF NOT EXISTS idx_tool_action_logs_created_at  ON tool_action_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tool_action_logs_human_id    ON tool_action_logs(human_id);

ALTER TABLE tool_action_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tool_action_logs_all" ON tool_action_logs FOR ALL USING (true) WITH CHECK (true);
