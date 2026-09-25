-- 064_council_tables.sql
-- Supreme Council session persistence (Stage 4)

CREATE TABLE IF NOT EXISTS council_sessions (
    id              TEXT PRIMARY KEY,
    session_type    TEXT NOT NULL DEFAULT 'weekly_strategic',
    agenda          TEXT NOT NULL DEFAULT '',
    context         JSONB NOT NULL DEFAULT '{}',
    health_score    NUMERIC,
    status          TEXT NOT NULL DEFAULT 'completed',
    deliberation_id TEXT,
    recommendation  TEXT,
    consensus_level NUMERIC,
    escalated       BOOLEAN NOT NULL DEFAULT FALSE,
    participants    TEXT[] NOT NULL DEFAULT '{}',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS council_decisions (
    id            BIGSERIAL PRIMARY KEY,
    session_id    TEXT NOT NULL REFERENCES council_sessions(id) ON DELETE CASCADE,
    decision_type TEXT NOT NULL DEFAULT 'strategic',
    description   TEXT NOT NULL,
    owner         TEXT,
    priority      INTEGER NOT NULL DEFAULT 5,
    status        TEXT NOT NULL DEFAULT 'pending',
    due_date      TIMESTAMPTZ,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_council_sessions_created  ON council_sessions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_council_sessions_type     ON council_sessions(session_type);
CREATE INDEX IF NOT EXISTS idx_council_decisions_session ON council_decisions(session_id);
CREATE INDEX IF NOT EXISTS idx_council_decisions_status  ON council_decisions(status);
