-- 053_cron_run_log.sql
-- Structured execution history for all cron jobs.
-- Written by cron-scheduler.js wrapCron() helper on each job completion.
-- Used by /api/cron/history endpoint.

CREATE TABLE IF NOT EXISTS cron_run_log (
    id          BIGSERIAL PRIMARY KEY,
    job_name    TEXT NOT NULL,
    started_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    duration_ms INTEGER,
    status      TEXT NOT NULL DEFAULT 'success' CHECK (status IN ('success','error','skipped')),
    error       TEXT,
    meta        JSONB,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_crl_started_at ON cron_run_log (started_at DESC);
CREATE INDEX IF NOT EXISTS idx_crl_job_name   ON cron_run_log (job_name, started_at DESC);
