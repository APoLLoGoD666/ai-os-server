-- @apex-migration
-- @ent-refs:   ENT-000006
-- @arch-refs:  ARCH-14
-- @block:      24
-- @status:     PROPOSED
-- @description: Architecture snapshot table for temporal diff queries (snapshot temporal reasoning)

CREATE TABLE IF NOT EXISTS architecture_snapshots (
    id                  BIGSERIAL        PRIMARY KEY,
    label               TEXT,
    entity_count        INTEGER          NOT NULL,
    relationship_count  INTEGER          NOT NULL,
    capability_health   JSONB            NOT NULL DEFAULT '{}',
    health_distribution JSONB            NOT NULL DEFAULT '{}',
    high_risk_entities  JSONB            NOT NULL DEFAULT '[]',
    snapshot_data       JSONB            NOT NULL DEFAULT '{}',
    created_at          TIMESTAMPTZ      NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_architecture_snapshots_created
    ON architecture_snapshots (created_at DESC);

COMMENT ON TABLE architecture_snapshots IS
    'Periodic full architecture snapshots. Written by snapshot.takeSnapshot(). '
    'Used for temporal diff queries: "what changed between June 1 and July 1?"';
