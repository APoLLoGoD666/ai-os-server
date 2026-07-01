-- Migration 050: ROADMAP feature tables — Health, Journal, Finance, University, Spiritual

-- ── Health & Diet ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS apex_nutrition_log (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  meal        text        NOT NULL,
  calories    int,
  protein_g   real,
  carbs_g     real,
  fat_g       real,
  image_url   text,
  notes       text,
  logged_at   timestamptz NOT NULL DEFAULT now(),
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS apex_nutrition_log_date_idx ON apex_nutrition_log (logged_at DESC);

CREATE TABLE IF NOT EXISTS apex_water_log (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  amount_ml   int         NOT NULL DEFAULT 250,
  logged_at   timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS apex_supplements (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text        NOT NULL,
  dose        text,
  frequency   text        NOT NULL DEFAULT 'daily',
  reminder_time time,
  active      boolean     NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS apex_supplement_log (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  supplement_id  uuid        REFERENCES apex_supplements(id) ON DELETE CASCADE,
  taken_at       timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS apex_fasting_log (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  started_at  timestamptz NOT NULL,
  ended_at    timestamptz,
  target_hours real       NOT NULL DEFAULT 16,
  notes       text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS apex_body_metrics (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  weight_kg    real,
  body_fat_pct real,
  waist_cm     real,
  chest_cm     real,
  notes        text,
  measured_at  timestamptz NOT NULL DEFAULT now(),
  created_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS apex_body_metrics_date_idx ON apex_body_metrics (measured_at DESC);

CREATE TABLE IF NOT EXISTS apex_blood_pressure (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  systolic    int         NOT NULL,
  diastolic   int         NOT NULL,
  pulse       int,
  notes       text,
  measured_at timestamptz NOT NULL DEFAULT now()
);

-- ── Journaling & Psychology ────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS apex_journal (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  content       text        NOT NULL,
  sentiment     real        CHECK (sentiment BETWEEN -1 AND 1),
  tags          text[]      NOT NULL DEFAULT '{}',
  entry_date    date        NOT NULL DEFAULT CURRENT_DATE,
  created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS apex_journal_date_idx ON apex_journal (entry_date DESC);

CREATE TABLE IF NOT EXISTS apex_habits (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name          text        NOT NULL,
  description   text,
  frequency     text        NOT NULL DEFAULT 'daily',
  target_streak int         NOT NULL DEFAULT 30,
  active        boolean     NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS apex_habit_log (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  habit_id    uuid        REFERENCES apex_habits(id) ON DELETE CASCADE,
  completed   boolean     NOT NULL DEFAULT true,
  notes       text,
  logged_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS apex_habit_log_habit_date_idx ON apex_habit_log (habit_id, logged_at DESC);

CREATE TABLE IF NOT EXISTS apex_gratitude_log (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  wins        text[]      NOT NULL DEFAULT '{}',
  grateful    text,
  entry_date  date        NOT NULL DEFAULT CURRENT_DATE,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- ── Finance & Wealth ──────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS apex_finance_entries (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  type          text        NOT NULL CHECK (type IN ('income','expense','transfer','asset','liability')),
  amount        numeric(12,2) NOT NULL,
  currency      text        NOT NULL DEFAULT 'GBP',
  category      text,
  description   text        NOT NULL,
  merchant      text,
  receipt_url   text,
  transaction_date date     NOT NULL DEFAULT CURRENT_DATE,
  created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS apex_finance_entries_date_idx ON apex_finance_entries (transaction_date DESC);
CREATE INDEX IF NOT EXISTS apex_finance_entries_type_idx ON apex_finance_entries (type);

CREATE TABLE IF NOT EXISTS apex_subscriptions (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name            text        NOT NULL,
  amount          numeric(10,2) NOT NULL,
  currency        text        NOT NULL DEFAULT 'GBP',
  billing_cycle   text        NOT NULL DEFAULT 'monthly',
  next_billing    date,
  category        text,
  active          boolean     NOT NULL DEFAULT true,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS apex_net_worth_snapshot (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  assets_gbp    numeric(14,2) NOT NULL DEFAULT 0,
  liabilities_gbp numeric(14,2) NOT NULL DEFAULT 0,
  net_worth_gbp numeric(14,2) GENERATED ALWAYS AS (assets_gbp - liabilities_gbp) STORED,
  breakdown     jsonb       NOT NULL DEFAULT '{}',
  snapped_at    timestamptz NOT NULL DEFAULT now()
);

-- ── University ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS apex_assignments (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  module        text        NOT NULL,
  title         text        NOT NULL,
  description   text,
  due_date      date,
  submission_type text,
  grade         text,
  weight_pct    real,
  status        text        NOT NULL DEFAULT 'pending'
                            CHECK (status IN ('pending','in_progress','submitted','graded')),
  created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS apex_assignments_due_idx ON apex_assignments (due_date ASC NULLS LAST);

CREATE TABLE IF NOT EXISTS apex_modules (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  code          text        NOT NULL UNIQUE,
  name          text        NOT NULL,
  credits       int,
  year          int,
  current       boolean     NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS apex_study_sessions (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id     uuid        REFERENCES apex_modules(id) ON DELETE SET NULL,
  topic         text,
  duration_min  int         NOT NULL,
  notes         text,
  started_at    timestamptz NOT NULL DEFAULT now()
);

-- ── Spiritual ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS apex_spiritual_log (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  type          text        NOT NULL CHECK (type IN ('meditation','reading','sigil','reflection','gratitude','ritual','other')),
  duration_min  int,
  notes         text,
  logged_at     timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS apex_spiritual_log_date_idx ON apex_spiritual_log (logged_at DESC);
