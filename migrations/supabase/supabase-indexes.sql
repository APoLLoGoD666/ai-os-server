-- ── APEX AI OS — Database Performance Indexes ────────────────────────────────
-- Run once in the Supabase SQL editor.
-- All indexes are IF NOT EXISTS — safe to re-run.
-- Covers every table queried with .order(), .eq(), .gte(), .in() in pg_helpers.js
-- and routes/*.js. Without these, Supabase does sequential scans on every query.

-- ── documents ─────────────────────────────────────────────────────────────────
-- pgSearchDocuments uses ilike on title/filename, pgListDocuments orders by created_at
CREATE INDEX IF NOT EXISTS idx_documents_created_at ON documents (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_documents_filename   ON documents (filename);

-- ── memory ────────────────────────────────────────────────────────────────────
-- pgLoadFacts filters by role='fact', pgLoadMemory orders by id DESC
CREATE INDEX IF NOT EXISTS idx_memory_role ON memory (role);
CREATE INDEX IF NOT EXISTS idx_memory_id   ON memory (id DESC);

-- ── agent_tasks ───────────────────────────────────────────────────────────────
-- pgGetLatestWaitingAgentTask filters by status IN (...), pgGetRecentAgentTasks orders by created_at
CREATE INDEX IF NOT EXISTS idx_agent_tasks_status     ON agent_tasks (status);
CREATE INDEX IF NOT EXISTS idx_agent_tasks_created_at ON agent_tasks (created_at DESC);

-- ── agent_actions ─────────────────────────────────────────────────────────────
-- pgGetRecentAgentActions orders by created_at, pgLogAgentAction inserts
CREATE INDEX IF NOT EXISTS idx_agent_actions_task_id    ON agent_actions (task_id);
CREATE INDEX IF NOT EXISTS idx_agent_actions_created_at ON agent_actions (created_at DESC);

-- ── agent_schedules ───────────────────────────────────────────────────────────
-- pgGetDueAgentSchedules filters enabled=true; runs every 5 minutes
CREATE INDEX IF NOT EXISTS idx_agent_schedules_enabled ON agent_schedules (enabled);

-- ── agent_reflections ─────────────────────────────────────────────────────────
-- pgGetApprovedReflections filters approved=true
CREATE INDEX IF NOT EXISTS idx_agent_reflections_approved ON agent_reflections (approved);

-- ── notifications ─────────────────────────────────────────────────────────────
-- pgCreateNotification deduplicates by (event_key, created_at) within 60s window
CREATE INDEX IF NOT EXISTS idx_notifications_event_key_created
    ON notifications (event_key, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications (created_at DESC);

-- ── standing_approvals ────────────────────────────────────────────────────────
-- pgGetEnabledStandingApprovals filters enabled=true AND action_type=...
CREATE INDEX IF NOT EXISTS idx_standing_approvals_enabled_action
    ON standing_approvals (enabled, action_type);

-- ── email_queue ───────────────────────────────────────────────────────────────
-- pgListEmailQueue deduplicates by gmail_id; make it unique
CREATE UNIQUE INDEX IF NOT EXISTS idx_email_queue_gmail_id ON email_queue (gmail_id);

-- ── transactions ──────────────────────────────────────────────────────────────
-- pgGetFinanceSummaryCurrentMonth filters by date range; pgListTransactions orders by date
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions (date DESC);

-- ── budgets ───────────────────────────────────────────────────────────────────
-- pgSaveBudget upserts by (category, month, year)
CREATE UNIQUE INDEX IF NOT EXISTS idx_budgets_category_month_year
    ON budgets (category, month, year);

-- ── apex_agent_runs ───────────────────────────────────────────────────────────
-- GET /api/intelligence/cost-summary and /agent-runs both order by created_at DESC
CREATE INDEX IF NOT EXISTS idx_apex_agent_runs_created_at ON apex_agent_runs (created_at DESC);

-- ── apex_tasks ────────────────────────────────────────────────────────────────
-- Queried by status, ordered by created_at
CREATE INDEX IF NOT EXISTS idx_apex_tasks_status     ON apex_tasks (status);
CREATE INDEX IF NOT EXISTS idx_apex_tasks_created_at ON apex_tasks (created_at DESC);

-- ── apex_notifications ────────────────────────────────────────────────────────
-- Listed by created_at, filtered by read
CREATE INDEX IF NOT EXISTS idx_apex_notifications_read       ON apex_notifications (read);
CREATE INDEX IF NOT EXISTS idx_apex_notifications_created_at ON apex_notifications (created_at DESC);

-- ── apex_timeline ─────────────────────────────────────────────────────────────
-- Timeline entries ordered by completed_at
CREATE INDEX IF NOT EXISTS idx_apex_timeline_completed_at ON apex_timeline (completed_at DESC);

-- ── gmail_tokens ──────────────────────────────────────────────────────────────
-- pgSaveGmailToken insert+delete pattern; keep only 1 row
CREATE INDEX IF NOT EXISTS idx_gmail_tokens_id ON gmail_tokens (id DESC);

-- ── routines ──────────────────────────────────────────────────────────────────
-- pgListRoutines orders by id; pgGetDueRoutines filters by next_due
CREATE INDEX IF NOT EXISTS idx_routines_next_due ON routines (next_due);

-- ── apex_memories ─────────────────────────────────────────────────────────────
-- Fallback text search path orders by created_at; role used for partitioning
CREATE INDEX IF NOT EXISTS idx_apex_memories_created_at ON apex_memories (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_apex_memories_role       ON apex_memories (role);

-- ── apex_news_cache ───────────────────────────────────────────────────────────
-- toolGetNews orders by published_at DESC, optionally filters by category
CREATE INDEX IF NOT EXISTS idx_apex_news_cache_published_at ON apex_news_cache (published_at DESC);
CREATE INDEX IF NOT EXISTS idx_apex_news_cache_category     ON apex_news_cache (category);

-- ── apex_calendar_events ──────────────────────────────────────────────────────
-- toolGetCalendarEvents filters event_date in [today, +N days]
CREATE INDEX IF NOT EXISTS idx_apex_calendar_events_event_date ON apex_calendar_events (event_date);

-- ── apex_invoices ─────────────────────────────────────────────────────────────
-- Finance summary orders by created_at, may filter by status
CREATE INDEX IF NOT EXISTS idx_apex_invoices_created_at ON apex_invoices (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_apex_invoices_status     ON apex_invoices (status);

-- ── apex_transactions ─────────────────────────────────────────────────────────
-- Finance summary orders by date DESC, filters by type='expense'
CREATE INDEX IF NOT EXISTS idx_apex_transactions_date ON apex_transactions (date DESC);
CREATE INDEX IF NOT EXISTS idx_apex_transactions_type ON apex_transactions (type);

-- ── apex_subscriptions ────────────────────────────────────────────────────────
-- Finance summary filters active=true
CREATE INDEX IF NOT EXISTS idx_apex_subscriptions_active ON apex_subscriptions (active);

-- ── apex_workouts ─────────────────────────────────────────────────────────────
-- Health summary filters date >= last week, orders by date DESC
CREATE INDEX IF NOT EXISTS idx_apex_workouts_date ON apex_workouts (date DESC);

-- ── apex_nutrition_log ────────────────────────────────────────────────────────
-- Health summary filters date = today
CREATE INDEX IF NOT EXISTS idx_apex_nutrition_log_date ON apex_nutrition_log (date);

-- ── apex_sleep_log ────────────────────────────────────────────────────────────
-- Health summary orders by date DESC
CREATE INDEX IF NOT EXISTS idx_apex_sleep_log_date ON apex_sleep_log (date DESC);

-- ── apex_mood_log ─────────────────────────────────────────────────────────────
-- Health summary orders by date DESC
CREATE INDEX IF NOT EXISTS idx_apex_mood_log_date ON apex_mood_log (date DESC);

-- ── apex_lessons ──────────────────────────────────────────────────────────────
-- /api/intelligence/lessons orders by created_at DESC
CREATE INDEX IF NOT EXISTS idx_apex_lessons_created_at ON apex_lessons (created_at DESC);

-- ── apex_agent_runs ───────────────────────────────────────────────────────────
-- /api/cost/today filters created_at >= today; already covered above but add task_id
CREATE INDEX IF NOT EXISTS idx_apex_agent_runs_task_id ON apex_agent_runs (task_id);
