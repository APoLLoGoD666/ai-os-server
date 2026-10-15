-- 092_actions_owner_scope.sql
-- V-11-H-B1: BACKEND OWNERSHIP & AUTHORITY CONVERGENCE
--
-- Adds `human_id TEXT NULL` to the six ACTIONS-surface tables so that
-- requireOwnerScope middleware in lib/middleware.js can enforce per-user
-- scoping. Master (role='master') bypasses the check; Users are filtered
-- to their own rows. See docs/ux/V-11-H-B-IMPLEMENTATION-READINESS.md §15.
--
-- Safety:
--   * All ALTER TABLE statements use ADD COLUMN IF NOT EXISTS (Postgres 9.6+),
--     making the migration idempotent.
--   * agent_actions and standing_approvals have no canonical CREATE TABLE in
--     any migration (they are ad-hoc Supabase tables); wrap their ALTER in a
--     DO block that swallows undefined_table so the migration is safe even
--     if the tables were dropped in Supabase.
--   * All indexes use IF NOT EXISTS.
--   * Backfill uses the canonical Master UUID
--     '00000000-0000-4000-8000-000000000001' (APEX_HUMAN_ID env default).
--   * Wrapped in a single transaction for atomic apply/rollback.

BEGIN;

-- ── 1. apex_tasks ────────────────────────────────────────────────────────────
ALTER TABLE apex_tasks         ADD COLUMN IF NOT EXISTS human_id TEXT NULL;

-- ── 2. apex_notifications ────────────────────────────────────────────────────
ALTER TABLE apex_notifications ADD COLUMN IF NOT EXISTS human_id TEXT NULL;

-- ── 3. apex_agent_runs ───────────────────────────────────────────────────────
ALTER TABLE apex_agent_runs    ADD COLUMN IF NOT EXISTS human_id TEXT NULL;

-- ── 4. apex_timeline ─────────────────────────────────────────────────────────
ALTER TABLE apex_timeline      ADD COLUMN IF NOT EXISTS human_id TEXT NULL;

-- ── 5. agent_actions (ad-hoc — table may not exist) ──────────────────────────
DO $$
BEGIN
    ALTER TABLE agent_actions ADD COLUMN IF NOT EXISTS human_id TEXT NULL;
EXCEPTION
    WHEN undefined_table THEN
        RAISE NOTICE 'agent_actions table does not exist — skipping human_id addition';
    WHEN duplicate_column THEN
        NULL;
END $$;

-- ── 6. standing_approvals (ad-hoc — table may not exist) ─────────────────────
DO $$
BEGIN
    ALTER TABLE standing_approvals ADD COLUMN IF NOT EXISTS human_id TEXT NULL;
EXCEPTION
    WHEN undefined_table THEN
        RAISE NOTICE 'standing_approvals table does not exist — skipping human_id addition';
    WHEN duplicate_column THEN
        NULL;
END $$;

-- ── COMPOSITE INDEXES ────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_apex_tasks_human_status
    ON apex_tasks         (human_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_apex_notif_human_read
    ON apex_notifications (human_id, read,   created_at DESC);

CREATE INDEX IF NOT EXISTS idx_apex_runs_human
    ON apex_agent_runs    (human_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_apex_timeline_human
    ON apex_timeline      (human_id, completed_at DESC);

-- Guarded indexes for ad-hoc tables
DO $$
BEGIN
    CREATE INDEX IF NOT EXISTS idx_agent_actions_human
        ON agent_actions (human_id, id DESC);
EXCEPTION
    WHEN undefined_table THEN
        RAISE NOTICE 'agent_actions missing — skipping idx_agent_actions_human';
END $$;

DO $$
BEGIN
    CREATE INDEX IF NOT EXISTS idx_standing_human
        ON standing_approvals (human_id, enabled);
EXCEPTION
    WHEN undefined_table THEN
        RAISE NOTICE 'standing_approvals missing — skipping idx_standing_human';
    WHEN undefined_column THEN
        RAISE NOTICE 'standing_approvals.enabled missing — skipping idx_standing_human';
END $$;

-- ── BACKFILL — assign all existing rows to Master ────────────────────────────
UPDATE apex_tasks
   SET human_id = '00000000-0000-4000-8000-000000000001'
 WHERE human_id IS NULL;

UPDATE apex_notifications
   SET human_id = '00000000-0000-4000-8000-000000000001'
 WHERE human_id IS NULL;

UPDATE apex_agent_runs
   SET human_id = '00000000-0000-4000-8000-000000000001'
 WHERE human_id IS NULL;

UPDATE apex_timeline
   SET human_id = '00000000-0000-4000-8000-000000000001'
 WHERE human_id IS NULL;

DO $$
BEGIN
    UPDATE agent_actions
       SET human_id = '00000000-0000-4000-8000-000000000001'
     WHERE human_id IS NULL;
EXCEPTION
    WHEN undefined_table THEN
        RAISE NOTICE 'agent_actions missing — skipping backfill';
    WHEN undefined_column THEN
        RAISE NOTICE 'agent_actions.human_id missing — skipping backfill';
END $$;

DO $$
BEGIN
    UPDATE standing_approvals
       SET human_id = '00000000-0000-4000-8000-000000000001'
     WHERE human_id IS NULL;
EXCEPTION
    WHEN undefined_table THEN
        RAISE NOTICE 'standing_approvals missing — skipping backfill';
    WHEN undefined_column THEN
        RAISE NOTICE 'standing_approvals.human_id missing — skipping backfill';
END $$;

COMMIT;
