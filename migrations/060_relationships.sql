-- @apex-migration
-- @ent-refs:   ENT-000006
-- @arch-refs:  ARCH-15
-- @block:      24
-- @status:     PROPOSED
-- @description: Registry relationship persistence with full provenance

CREATE TABLE IF NOT EXISTS registry_relationships (
    id                uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
    from_id           TEXT        NOT NULL,
    to_id             TEXT        NOT NULL,
    type              TEXT        NOT NULL,
    label             TEXT        DEFAULT NULL,

    -- Provenance
    confidence        FLOAT       NOT NULL DEFAULT 1.0,
    source            TEXT        NOT NULL DEFAULT 'manual',
                                            -- manual | js-import-scan | sql-ddl-scan |
                                            --   migration-header | doc-ref-scan
    derived_from      TEXT        DEFAULT NULL,  -- file:line or file path

    -- Observation lifecycle
    first_observed    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_observed     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    observation_count INT         NOT NULL DEFAULT 1,
    active            BOOLEAN     NOT NULL DEFAULT TRUE,

    UNIQUE (from_id, to_id, type, source)
);

CREATE INDEX IF NOT EXISTS rr_from_idx    ON registry_relationships (from_id);
CREATE INDEX IF NOT EXISTS rr_to_idx      ON registry_relationships (to_id);
CREATE INDEX IF NOT EXISTS rr_type_idx    ON registry_relationships (type);
CREATE INDEX IF NOT EXISTS rr_source_idx  ON registry_relationships (source);
CREATE INDEX IF NOT EXISTS rr_active_idx  ON registry_relationships (active);
