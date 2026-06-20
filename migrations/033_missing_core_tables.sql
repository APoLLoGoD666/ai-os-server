-- Migration 033: Missing core tables
-- Creates 27 tables referenced in server.js / lib / agent-system that have no migration.
-- All statements are idempotent (IF NOT EXISTS). Safe to re-run.

-- ── Agent pipeline ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS apex_agent_runs (
    task_id          TEXT PRIMARY KEY,
    objective        TEXT,
    success          BOOLEAN,
    cost_usd         NUMERIC(10,6),
    complexity       TEXT,
    agent_summary    JSONB,
    duration_ms      BIGINT,
    token_usage      JSONB,
    model            TEXT,
    model_used       TEXT,
    agent_name       TEXT,
    task_description TEXT,
    domain           TEXT,
    error_message    TEXT,
    token_count      INTEGER,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_aar_created_at ON apex_agent_runs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_aar_success    ON apex_agent_runs (success);
CREATE INDEX IF NOT EXISTS idx_aar_domain     ON apex_agent_runs (domain);

CREATE TABLE IF NOT EXISTS apex_agent_stages (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id     TEXT        NOT NULL REFERENCES apex_agent_runs(task_id) ON DELETE CASCADE,
    stage       TEXT        NOT NULL,
    success     BOOLEAN,
    error       TEXT,
    duration_ms INTEGER,
    attempt     INTEGER     DEFAULT 1,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_aas_task_id ON apex_agent_stages (task_id);

CREATE TABLE IF NOT EXISTS agent_tasks (
    id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id      TEXT        UNIQUE,
    goal         TEXT,
    status       TEXT        DEFAULT 'pending',
    plan         TEXT,
    context_json JSONB,
    actions_json JSONB,
    current_step TEXT,
    result       TEXT,
    error        TEXT,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_at_status ON agent_tasks (status);

CREATE TABLE IF NOT EXISTS agent_schedules (
    id          SERIAL PRIMARY KEY,
    name        TEXT    NOT NULL,
    goal        TEXT,
    frequency   TEXT,
    enabled     BOOLEAN NOT NULL DEFAULT TRUE,
    last_run_at TIMESTAMPTZ,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Timeline & notifications ──────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS apex_timeline (
    id           TEXT PRIMARY KEY,
    task_id      TEXT,
    objective    TEXT,
    commit_hash  TEXT,
    files_changed JSONB,
    duration     INTEGER,
    completed_at TIMESTAMPTZ,
    agent_logs   JSONB,
    success      BOOLEAN,
    error        TEXT
);
CREATE INDEX IF NOT EXISTS idx_atl_completed_at ON apex_timeline (completed_at DESC);

CREATE TABLE IF NOT EXISTS apex_notifications (
    id         TEXT        PRIMARY KEY,
    message    TEXT,
    type       TEXT,
    read       BOOLEAN     NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS notifications (
    id           BIGSERIAL   PRIMARY KEY,
    type         TEXT,
    title        TEXT,
    message      TEXT,
    event_key    TEXT,
    related_type TEXT,
    related_id   TEXT,
    read         BOOLEAN     NOT NULL DEFAULT FALSE,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_notif_read       ON notifications (read);
CREATE INDEX IF NOT EXISTS idx_notif_created_at ON notifications (created_at DESC);

-- ── Email ─────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS email_queue (
    id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    gmail_id   TEXT        UNIQUE,
    subject    TEXT,
    recipient  TEXT,
    body       TEXT,
    status     TEXT        NOT NULL DEFAULT 'pending',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_eq_status ON email_queue (status);

-- ── Documents ─────────────────────────────────────────────────────────────────
-- embedding column is TEXT; upgrade to VECTOR(768) if pgvector is enabled.

CREATE TABLE IF NOT EXISTS documents (
    id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id        TEXT,
    filename       TEXT,
    title          TEXT,
    type           TEXT,
    content        TEXT,
    file_url       TEXT,
    classification TEXT,
    summary        TEXT,
    embedding      TEXT,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_docs_type ON documents (type);

-- ── News ──────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS apex_news_cache (
    id           BIGSERIAL   PRIMARY KEY,
    title        TEXT,
    url          TEXT,
    source       TEXT,
    category     TEXT,
    summary      TEXT,
    published_at TIMESTAMPTZ,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_anc_category   ON apex_news_cache (category);
CREATE INDEX IF NOT EXISTS idx_anc_created_at ON apex_news_cache (created_at DESC);

-- ── Tasks (lightweight, dashboard-facing) ─────────────────────────────────────

CREATE TABLE IF NOT EXISTS apex_tasks (
    id         TEXT        PRIMARY KEY,
    title      TEXT,
    status     TEXT        DEFAULT 'pending',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Calendar ──────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS apex_calendar_events (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    google_event_id TEXT,
    title           TEXT,
    event_date      DATE,
    start_time      TIMESTAMPTZ,
    end_time        TIMESTAMPTZ,
    all_day         BOOLEAN     DEFAULT FALSE,
    location        TEXT,
    description     TEXT,
    status          TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ace_event_date ON apex_calendar_events (event_date);

-- ── Relationships / CRM ───────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS apex_people (
    id                 UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    name               TEXT        NOT NULL,
    email              TEXT,
    phone              TEXT,
    birthday           DATE,
    relationship_type  TEXT,
    company            TEXT,
    notes              TEXT,
    last_contact_date  DATE,
    created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS apex_interactions (
    id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    person_id        UUID        REFERENCES apex_people(id) ON DELETE CASCADE,
    type             TEXT,
    interaction_date DATE,
    notes            TEXT,
    sentiment_score  INTEGER,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ai_person_id ON apex_interactions (person_id);

CREATE TABLE IF NOT EXISTS apex_follow_ups (
    id        UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    person_id UUID        REFERENCES apex_people(id) ON DELETE CASCADE,
    note      TEXT,
    due_date  DATE,
    completed BOOLEAN     DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_afu_person_id ON apex_follow_ups (person_id);
CREATE INDEX IF NOT EXISTS idx_afu_due_date  ON apex_follow_ups (due_date);

-- ── Career ────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS apex_job_applications (
    id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    company      TEXT,
    role         TEXT,
    status       TEXT        DEFAULT 'applied',
    applied_date DATE,
    salary_range TEXT,
    url          TEXT,
    notes        TEXT,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS apex_interviews (
    id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    application_id UUID        REFERENCES apex_job_applications(id) ON DELETE CASCADE,
    interview_date TIMESTAMPTZ,
    type           TEXT,
    notes          TEXT,
    outcome        TEXT,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_aint_app_id ON apex_interviews (application_id);

CREATE TABLE IF NOT EXISTS apex_skills (
    id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    name         TEXT        NOT NULL,
    category     TEXT,
    level        TEXT,
    target_level TEXT,
    notes        TEXT,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Property ──────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS apex_properties (
    id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    name             TEXT,
    address          TEXT,
    type             TEXT,
    monthly_cost_gbp NUMERIC(10,2),
    lease_end_date   DATE,
    notes            TEXT,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS apex_maintenance_items (
    id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id  UUID        REFERENCES apex_properties(id) ON DELETE CASCADE,
    description  TEXT,
    status       TEXT        DEFAULT 'open',
    scheduled_date DATE,
    cost_gbp     NUMERIC(10,2),
    notes        TEXT,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ami_property_id ON apex_maintenance_items (property_id);

-- ── Legal ─────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS apex_contracts (
    id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    title        TEXT,
    counterparty TEXT,
    type         TEXT,
    start_date   DATE,
    end_date     DATE,
    status       TEXT        DEFAULT 'active',
    file_url     TEXT,
    notes        TEXT,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS apex_legal_deadlines (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    contract_id UUID        REFERENCES apex_contracts(id) ON DELETE CASCADE,
    description TEXT,
    due_date    DATE,
    completed   BOOLEAN     DEFAULT FALSE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ald_due_date ON apex_legal_deadlines (due_date);

-- ── Shopping / lifestyle ──────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS apex_wishlist (
    id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    name              TEXT        NOT NULL,
    url               TEXT,
    price_target_gbp  NUMERIC(10,2),
    current_price_gbp NUMERIC(10,2),
    priority          TEXT,
    purchased         BOOLEAN     DEFAULT FALSE,
    notes             TEXT,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS apex_purchases (
    id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    name          TEXT,
    amount_gbp    NUMERIC(10,2),
    category      TEXT,
    purchase_date DATE,
    notes         TEXT,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Travel ────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS apex_trips (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    name        TEXT,
    destination TEXT,
    start_date  DATE,
    end_date    DATE,
    status      TEXT        DEFAULT 'planned',
    budget_gbp  NUMERIC(10,2),
    notes       TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Social ────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS apex_social_accounts (
    id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    platform   TEXT        NOT NULL,
    username   TEXT,
    status     TEXT,
    notes      TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS apex_social_posts (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id  UUID        REFERENCES apex_social_accounts(id) ON DELETE CASCADE,
    platform    TEXT,
    content     TEXT,
    status      TEXT        DEFAULT 'draft',
    scheduled_at TIMESTAMPTZ,
    posted_at   TIMESTAMPTZ,
    metrics     JSONB,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_asp_account_id ON apex_social_posts (account_id);
CREATE INDEX IF NOT EXISTS idx_asp_status     ON apex_social_posts (status);
