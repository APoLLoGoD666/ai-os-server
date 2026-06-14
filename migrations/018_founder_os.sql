-- Migration 018: Founder OS
-- Extends founder_memory infrastructure with domain tracking,
-- goal management, alignment logging, and anti-goal monitoring.
-- Safe to re-run (IF NOT EXISTS / ADD COLUMN IF NOT EXISTS).

-- ─────────────────────────────────────────────────────────
-- founder_domains
-- One row per life domain. Tracks current state vs target state.
-- ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS founder_domains (
  id              text        PRIMARY KEY,
  name            text        NOT NULL,
  category        text        NOT NULL,
  description     text,
  current_state   jsonb       NOT NULL DEFAULT '{}',
  target_state    jsonb       NOT NULL DEFAULT '{}',
  health_score    integer,
  priority        integer     NOT NULL DEFAULT 5,
  last_updated    timestamptz NOT NULL DEFAULT now(),
  created_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_founder_domains_category ON founder_domains(category);

-- ─────────────────────────────────────────────────────────
-- founder_goals
-- Concrete, measurable goals linked to domains.
-- ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS founder_goals (
  id              text        PRIMARY KEY DEFAULT gen_random_uuid()::text,
  domain_id       text        REFERENCES founder_domains(id),
  title           text        NOT NULL,
  description     text,
  success_metric  text        NOT NULL,
  current_value   text,
  target_value    text        NOT NULL,
  unit            text,
  status          text        NOT NULL DEFAULT 'active',
  priority        integer     NOT NULL DEFAULT 5,
  deadline        date,
  progress_pct    integer     NOT NULL DEFAULT 0,
  linked_values   jsonb       NOT NULL DEFAULT '[]',
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_founder_goals_status ON founder_goals(status, priority DESC);
CREATE INDEX IF NOT EXISTS idx_founder_goals_domain ON founder_goals(domain_id);

-- ─────────────────────────────────────────────────────────
-- founder_alignment_log
-- Every alignment score computation is recorded here.
-- Enables calibration and retrospective analysis.
-- ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS founder_alignment_log (
  id              text        PRIMARY KEY DEFAULT gen_random_uuid()::text,
  subject_type    text        NOT NULL,
  subject_id      text,
  subject_text    text        NOT NULL,
  score           integer     NOT NULL,
  breakdown       jsonb       NOT NULL DEFAULT '{}',
  triggered_values jsonb      NOT NULL DEFAULT '[]',
  triggered_anti_goals jsonb  NOT NULL DEFAULT '[]',
  recommendation  text,
  computed_at     timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_founder_alignment_score ON founder_alignment_log(score DESC, computed_at DESC);
CREATE INDEX IF NOT EXISTS idx_founder_alignment_type ON founder_alignment_log(subject_type, computed_at DESC);

-- ─────────────────────────────────────────────────────────
-- founder_anti_goal_alerts
-- Triggered when a plan, decision, or opportunity touches an anti-goal.
-- ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS founder_anti_goal_alerts (
  id              text        PRIMARY KEY DEFAULT gen_random_uuid()::text,
  anti_goal       text        NOT NULL,
  trigger_text    text        NOT NULL,
  trigger_source  text        NOT NULL,
  trigger_id      text,
  severity        text        NOT NULL DEFAULT 'warning',
  acknowledged    boolean     NOT NULL DEFAULT false,
  created_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_anti_goal_alerts_ack ON founder_anti_goal_alerts(acknowledged, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_anti_goal_alerts_goal ON founder_anti_goal_alerts(anti_goal, created_at DESC);

-- ─────────────────────────────────────────────────────────
-- founder_state_snapshots
-- Periodic captures of actual vs target state across all domains.
-- ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS founder_state_snapshots (
  id              text        PRIMARY KEY DEFAULT gen_random_uuid()::text,
  overall_score   integer,
  domain_scores   jsonb       NOT NULL DEFAULT '{}',
  goals_summary   jsonb       NOT NULL DEFAULT '{}',
  gap_analysis    jsonb       NOT NULL DEFAULT '[]',
  created_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_founder_snapshots_created ON founder_state_snapshots(created_at DESC);
