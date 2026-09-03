-- Migration 004: Observability tables
-- Evidence basis:
--   Category A: apex_sync_checkpoints absent (HTTP 404) — cron-logger.js writes to this table on every cron tick
--   Category B: deployment_events absent (HTTP 404) — no deployment timeline reconstruction possible
--   Category B: request_logs absent (HTTP 404) — HTTP request traceability not persisted
--   Category C: execution_events absent (HTTP 404) — pipeline intermediate events not persisted
-- Applied: 2026-06-08 via Supabase Management API

-- apex_sync_checkpoints: key-value store for cron job last-run state
CREATE TABLE IF NOT EXISTS apex_sync_checkpoints (
    key        TEXT PRIMARY KEY,
    value      TEXT NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- deployment_events: one row per server startup / Render deploy
CREATE TABLE IF NOT EXISTS deployment_events (
    id            TEXT PRIMARY KEY DEFAULT ('dep-ev-' || gen_random_uuid()::text),
    deploy_id     TEXT,
    commit_sha    TEXT,
    build_version TEXT,
    status        TEXT NOT NULL,
    started_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    metadata      JSONB
);
CREATE INDEX IF NOT EXISTS idx_deployment_events_started ON deployment_events(started_at DESC);

-- execution_events: pipeline stage transitions and key runtime events
CREATE TABLE IF NOT EXISTS execution_events (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type  TEXT NOT NULL,
    task_id     TEXT,
    run_id      TEXT,
    stage       TEXT,
    request_id  TEXT,
    payload     JSONB,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_execution_events_task    ON execution_events(task_id);
CREATE INDEX IF NOT EXISTS idx_execution_events_created ON execution_events(created_at DESC);

-- request_logs: HTTP request records for /api/ routes
CREATE TABLE IF NOT EXISTS request_logs (
    id              TEXT PRIMARY KEY DEFAULT ('req-' || gen_random_uuid()::text),
    request_id      TEXT NOT NULL,
    method          TEXT NOT NULL,
    path            TEXT NOT NULL,
    status_code     INT,
    latency_ms      INT,
    ip              TEXT,
    task_id         TEXT,
    conversation_id TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_request_logs_created    ON request_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_request_logs_request_id ON request_logs(request_id);
CREATE INDEX IF NOT EXISTS idx_request_logs_task_id    ON request_logs(task_id);
