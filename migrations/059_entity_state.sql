-- @apex-migration
-- @ent-refs:   ENT-000006
-- @arch-refs:  ARCH-15
-- @block:      24
-- @status:     PROPOSED
-- @description: Digital Twin — live operational state for every Registry entity

CREATE TABLE IF NOT EXISTS entity_state (
    id               TEXT        PRIMARY KEY,           -- ENT-NNNNNN
    health           TEXT        NOT NULL DEFAULT 'unknown',
                                                        -- unknown | active | inactive | missing | external | present | degraded
    physical         TEXT        DEFAULT NULL,          -- SYNC | DRIFT | SKIP
    runtime_loaded   TEXT        DEFAULT NULL,          -- SYNC | DRIFT | SKIP
    documented       TEXT        DEFAULT NULL,          -- SYNC | DRIFT | SKIP
    last_git_commit  TEXT        DEFAULT NULL,
    last_git_date    TIMESTAMPTZ DEFAULT NULL,
    metrics          JSONB       NOT NULL DEFAULT '{}',
    notes            TEXT        DEFAULT NULL,
    last_checked     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS entity_state_health_idx ON entity_state (health);
CREATE INDEX IF NOT EXISTS entity_state_checked_idx ON entity_state (last_checked DESC);
