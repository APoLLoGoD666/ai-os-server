-- Migration 001: Create missing tables + cleanup
-- Run via: node run-migrations.js
-- Or paste into: https://supabase.com/dashboard/project/devmtexqjstappalqbeg/sql/new

-- Agent reflection lessons (persisted across Render restarts)
CREATE TABLE IF NOT EXISTS apex_lessons (
    id BIGSERIAL PRIMARY KEY,
    lesson TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Cron execution audit trail
CREATE TABLE IF NOT EXISTS cron_logs (
    id BIGSERIAL PRIMARY KEY,
    triggered_at TIMESTAMPTZ DEFAULT NOW(),
    triggered_by TEXT,
    schedules_checked INTEGER DEFAULT 0,
    schedules_run INTEGER DEFAULT 0,
    errors TEXT,
    duration_ms INTEGER
);

-- Vault vector embeddings for RAG (requires pgvector extension)
CREATE EXTENSION IF NOT EXISTS vector;
CREATE TABLE IF NOT EXISTS vault_embeddings (
    id BIGSERIAL PRIMARY KEY,
    chunk_text TEXT NOT NULL,
    embedding VECTOR(1536),
    source TEXT,
    filename TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Habits tracker
CREATE TABLE IF NOT EXISTS habits (
    id BIGSERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    frequency TEXT DEFAULT 'daily',
    target_count INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Cleanup: reject tasks stuck in waiting_approval for > 7 days
UPDATE agent_tasks
SET status = 'rejected'
WHERE status = 'waiting_approval'
  AND created_at < NOW() - INTERVAL '7 days';

-- Cleanup: delete old Gmail auth spam notifications (keep last 1 day)
DELETE FROM notifications
WHERE type = 'email'
  AND title LIKE '%Gmail auth%'
  AND created_at < NOW() - INTERVAL '1 day';

-- Cleanup: delete read notifications older than 30 days
DELETE FROM notifications
WHERE read = true
  AND created_at < NOW() - INTERVAL '30 days';

-- Verify
SELECT table_name, 0 AS rows
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('apex_lessons', 'cron_logs', 'vault_embeddings', 'habits')
ORDER BY table_name;

SELECT
  (SELECT COUNT(*) FROM agent_tasks WHERE status = 'waiting_approval') AS waiting_approval_remaining,
  (SELECT COUNT(*) FROM notifications) AS notifications_total,
  (SELECT COUNT(*) FROM notifications WHERE read = false) AS notifications_unread;
