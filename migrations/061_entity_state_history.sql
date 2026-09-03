-- @apex-migration
-- @ent-refs:   ENT-000006
-- @arch-refs:  ARCH-14
-- @block:      24
-- @status:     PROPOSED
-- @description: Append-only health change log for temporal reasoning (Phase D)

CREATE TABLE IF NOT EXISTS entity_state_history (
    id              BIGSERIAL PRIMARY KEY,
    entity_id       TEXT        NOT NULL,
    health_label    TEXT        NOT NULL,
    health_score    INTEGER,
    confidence      NUMERIC(4,3),
    physical        TEXT,
    runtime_loaded  TEXT,
    documented      TEXT,
    metrics         JSONB,
    recorded_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_entity_state_history_entity
    ON entity_state_history (entity_id, recorded_at DESC);

COMMENT ON TABLE entity_state_history IS
    'Append-only log of entity health state snapshots. Written by twin.persistState() whenever health label changes.';
