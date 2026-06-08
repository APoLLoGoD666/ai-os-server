-- Migration 002: All missing tables + schema fixes
-- Generated: 2026-06-08 during Operation Recovery & Remediation Campaign
-- Run via: SUPABASE_ACCESS_TOKEN=sbp_xxx node run-migrations.js
-- Or paste into: https://supabase.com/dashboard/project/devmtexqjstappalqbeg/sql/new

-- ── Schema fixes on existing tables ─────────────────────────────────────────

-- apex_agent_runs: add missing columns (startup migration was blocked by invalid DATABASE_URL)
ALTER TABLE apex_agent_runs
  ADD COLUMN IF NOT EXISTS duration_ms BIGINT,
  ADD COLUMN IF NOT EXISTS token_usage JSONB;

-- vault_embeddings: fix dimension — was created as VECTOR(1536), code uses 768
-- Drop and recreate to fix (table is empty so no data loss)
DROP TABLE IF EXISTS vault_embeddings;
CREATE TABLE vault_embeddings (
    id          BIGSERIAL PRIMARY KEY,
    chunk_hash  TEXT UNIQUE,
    chunk_text  TEXT NOT NULL,
    embedding   VECTOR(768),
    source      TEXT,
    filename    TEXT,
    mtime       TEXT,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_vault_embeddings_source ON vault_embeddings(source);
CREATE INDEX IF NOT EXISTS idx_vault_embeddings_hash ON vault_embeddings(chunk_hash);

-- ── Finance tables ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS apex_transactions (
    id          BIGSERIAL PRIMARY KEY,
    description TEXT,
    amount      NUMERIC(12,2),
    category    TEXT,
    date        DATE,
    source      TEXT,
    type        TEXT DEFAULT 'expense',
    created_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_apex_transactions_date ON apex_transactions(date DESC);
CREATE INDEX IF NOT EXISTS idx_apex_transactions_type ON apex_transactions(type);

CREATE TABLE IF NOT EXISTS apex_invoices (
    id          BIGSERIAL PRIMARY KEY,
    title       TEXT,
    amount      NUMERIC(12,2),
    status      TEXT DEFAULT 'draft',
    due_date    DATE,
    client_name TEXT,
    notes       TEXT,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_apex_invoices_status ON apex_invoices(status);

CREATE TABLE IF NOT EXISTS apex_subscriptions (
    id                BIGSERIAL PRIMARY KEY,
    name              TEXT NOT NULL,
    amount            NUMERIC(12,2),
    billing_cycle     TEXT DEFAULT 'monthly',
    category          TEXT,
    active            BOOLEAN DEFAULT TRUE,
    next_billing_date DATE,
    created_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS apex_investments (
    id            BIGSERIAL PRIMARY KEY,
    name          TEXT NOT NULL,
    type          TEXT,
    amount        NUMERIC(12,2),
    current_value NUMERIC(12,2),
    platform      TEXT,
    notes         TEXT,
    created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ── Health tables ──────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS apex_workouts (
    id               BIGSERIAL PRIMARY KEY,
    type             TEXT NOT NULL,
    duration_minutes INTEGER,
    notes            TEXT,
    workout_date     DATE DEFAULT CURRENT_DATE,
    created_at       TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_apex_workouts_date ON apex_workouts(workout_date DESC);

CREATE TABLE IF NOT EXISTS apex_nutrition_log (
    id         BIGSERIAL PRIMARY KEY,
    food_name  TEXT NOT NULL,
    calories   INTEGER,
    protein_g  NUMERIC(6,1),
    carbs_g    NUMERIC(6,1),
    fat_g      NUMERIC(6,1),
    log_date   DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_apex_nutrition_date ON apex_nutrition_log(log_date DESC);

CREATE TABLE IF NOT EXISTS apex_sleep_log (
    id            BIGSERIAL PRIMARY KEY,
    date          DATE UNIQUE NOT NULL,
    hours         NUMERIC(4,1),
    quality_score INTEGER,
    notes         TEXT,
    created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS apex_mood_log (
    id         BIGSERIAL PRIMARY KEY,
    date       DATE UNIQUE NOT NULL,
    score      NUMERIC(3,1),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS apex_body_measurements (
    id           BIGSERIAL PRIMARY KEY,
    weight_kg    NUMERIC(5,2),
    body_fat_pct NUMERIC(4,1),
    notes        TEXT,
    measured_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_apex_body_measurements_at ON apex_body_measurements(measured_at DESC);

CREATE TABLE IF NOT EXISTS apex_supplements (
    id         TEXT,
    name       TEXT,
    taken      BOOLEAN DEFAULT FALSE,
    log_date   DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (id, log_date)
);
CREATE INDEX IF NOT EXISTS idx_apex_supplements_date ON apex_supplements(log_date DESC);

-- ── Habits tables ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS apex_habits (
    id          BIGSERIAL PRIMARY KEY,
    habit_name  TEXT NOT NULL,
    frequency   TEXT DEFAULT 'daily',
    active      BOOLEAN DEFAULT TRUE,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS apex_habit_logs (
    id         BIGSERIAL PRIMARY KEY,
    habit_id   BIGINT NOT NULL,
    log_date   DATE NOT NULL,
    completed  BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(habit_id, log_date)
);
CREATE INDEX IF NOT EXISTS idx_apex_habit_logs_date ON apex_habit_logs(log_date DESC);

-- ── Life / Journal tables ──────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS apex_journal_entries (
    id              BIGSERIAL PRIMARY KEY,
    entry_text      TEXT NOT NULL,
    sentiment_score NUMERIC(3,1),
    mood_score      NUMERIC(3,1),
    created_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_apex_journal_created_at ON apex_journal_entries(created_at DESC);

CREATE TABLE IF NOT EXISTS apex_spiritual_sessions (
    id          BIGSERIAL PRIMARY KEY,
    type        TEXT,
    duration_m  INTEGER,
    notes       TEXT,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── Agent system tables ────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS apex_agents (
    id            SERIAL PRIMARY KEY,
    slug          TEXT UNIQUE NOT NULL,
    name          TEXT NOT NULL,
    category      TEXT NOT NULL,
    description   TEXT,
    system_prompt TEXT NOT NULL,
    vault_path    TEXT,
    github_path   TEXT,
    synced_at     TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_apex_agents_category ON apex_agents(category);
CREATE INDEX IF NOT EXISTS idx_apex_agents_slug ON apex_agents(slug);

-- ── Add retention indexes for purge performance ────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_apex_notifications_read_created ON apex_notifications(read, created_at);
CREATE INDEX IF NOT EXISTS idx_apex_agent_runs_created ON apex_agent_runs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_agent_tasks_status_updated ON agent_tasks(status, updated_at);
CREATE INDEX IF NOT EXISTS idx_apex_lessons_created ON apex_lessons(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_cron_logs_triggered_at ON cron_logs(triggered_at DESC);
CREATE INDEX IF NOT EXISTS idx_apex_agent_stages_task_id ON apex_agent_stages(task_id);
CREATE INDEX IF NOT EXISTS idx_apex_agent_stages_created ON apex_agent_stages(created_at DESC);

-- ── Verify all tables created ──────────────────────────────────────────────────

SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN (
    'apex_transactions','apex_invoices','apex_subscriptions','apex_investments',
    'apex_workouts','apex_nutrition_log','apex_sleep_log','apex_mood_log',
    'apex_body_measurements','apex_supplements',
    'apex_habits','apex_habit_logs',
    'apex_journal_entries','apex_spiritual_sessions',
    'apex_agents','vault_embeddings'
  )
ORDER BY table_name;
