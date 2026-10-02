-- Migration 006: Lesson forensics (task_id linkage) + apex_contacts table
-- Applied: 2026-06-09 as part of v10 audit-grade upgrade

-- ── Add task_id and trace_id to apex_lessons ──────────────────────────────────
-- Enables forensic queries by task (routes/governance.js line 55 already expects this)
ALTER TABLE apex_lessons
  ADD COLUMN IF NOT EXISTS task_id  TEXT,
  ADD COLUMN IF NOT EXISTS trace_id TEXT;

CREATE INDEX IF NOT EXISTS idx_apex_lessons_task_id  ON apex_lessons(task_id)  WHERE task_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_apex_lessons_trace_id ON apex_lessons(trace_id) WHERE trace_id IS NOT NULL;

-- ── apex_contacts — required by routes/communications.js ─────────────────────
CREATE TABLE IF NOT EXISTS apex_contacts (
    id         UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
    name       TEXT    NOT NULL,
    email      TEXT,
    phone      TEXT,
    company    TEXT,
    notes      TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_apex_contacts_name  ON apex_contacts(name);
CREATE INDEX IF NOT EXISTS idx_apex_contacts_email ON apex_contacts(email) WHERE email IS NOT NULL;
