-- Ministry weekly reports: narrative intelligence from all 10 ministries → Council → Founder briefing
CREATE TABLE IF NOT EXISTS ministry_reports (
    id            TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    ministry      TEXT NOT NULL,
    week_start    DATE NOT NULL,
    status        TEXT NOT NULL DEFAULT 'generated',
    headline      TEXT,
    content       JSONB NOT NULL DEFAULT '{}',
    generated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_ministry_reports_ministry_week
    ON ministry_reports (ministry, week_start);

CREATE INDEX IF NOT EXISTS idx_ministry_reports_week_start
    ON ministry_reports (week_start DESC);

CREATE INDEX IF NOT EXISTS idx_ministry_reports_ministry
    ON ministry_reports (ministry);
