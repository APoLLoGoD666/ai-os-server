-- ── Supabase Row Level Security ──────────────────────────────────────────────
-- Run this once in the Supabase SQL editor.
-- The backend connects via the service_role key and bypasses RLS.
-- These policies block unauthenticated (anon) access for every table.
-- Authenticated Supabase users are granted full read/write access.

-- ── agent_actions ─────────────────────────────────────────────────────────────
ALTER TABLE agent_actions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated_all" ON agent_actions
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

-- ── agent_tasks ───────────────────────────────────────────────────────────────
ALTER TABLE agent_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated_all" ON agent_tasks
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

-- ── agent_schedules ───────────────────────────────────────────────────────────
ALTER TABLE agent_schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated_all" ON agent_schedules
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

-- ── notifications ─────────────────────────────────────────────────────────────
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated_all" ON notifications
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

-- ── agent_reflections ─────────────────────────────────────────────────────────
ALTER TABLE agent_reflections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated_all" ON agent_reflections
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

-- ── standing_approvals ────────────────────────────────────────────────────────
ALTER TABLE standing_approvals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated_all" ON standing_approvals
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

-- ── email_queue ───────────────────────────────────────────────────────────────
ALTER TABLE email_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated_all" ON email_queue
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

-- ── transactions ──────────────────────────────────────────────────────────────
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated_all" ON transactions
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

-- ── budgets ───────────────────────────────────────────────────────────────────
ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated_all" ON budgets
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

-- ── routines ──────────────────────────────────────────────────────────────────
ALTER TABLE routines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated_all" ON routines
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

-- ── gmail_tokens ──────────────────────────────────────────────────────────────
ALTER TABLE gmail_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated_all" ON gmail_tokens
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

-- ── documents ─────────────────────────────────────────────────────────────────
-- M10 fix: documents table was missing RLS — anon key could read all documents.
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated_all" ON documents
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

-- ── apex_agent_runs ───────────────────────────────────────────────────────────
-- M10 fix: apex_agent_runs table was missing RLS — anon key could read task history.
ALTER TABLE apex_agent_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated_all" ON apex_agent_runs
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

-- ── memory (generic) ──────────────────────────────────────────────────────────
-- M10 fix: memory table was missing RLS.
ALTER TABLE memory ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated_all" ON memory
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);
