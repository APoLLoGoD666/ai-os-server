-- 063_consensus_sessions.sql
-- Consensus session persistence for civilisation/consensus.js
-- Survives Render redeploys; flat-file .civilisation/consensus/ remains as fallback.

CREATE TABLE IF NOT EXISTS consensus_sessions (
    id            TEXT PRIMARY KEY,                 -- e.g. CSS-000001
    type          TEXT NOT NULL,
    title         TEXT NOT NULL,
    description   TEXT NOT NULL,
    proposer_id   TEXT NOT NULL,
    status        TEXT NOT NULL DEFAULT 'PENDING',  -- PENDING | APPROVED | REJECTED | EXPIRED
    quorum        INTEGER NOT NULL DEFAULT 5,
    votes         JSONB NOT NULL DEFAULT '[]',
    content_hash  TEXT,
    expires_at    TIMESTAMPTZ NOT NULL,
    ratified_at   TIMESTAMPTZ,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_consensus_sessions_status ON consensus_sessions(status);
CREATE INDEX IF NOT EXISTS idx_consensus_sessions_created ON consensus_sessions(created_at DESC);
