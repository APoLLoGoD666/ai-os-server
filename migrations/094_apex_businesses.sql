DO $$ BEGIN
    CREATE TABLE IF NOT EXISTS apex_businesses (
        id          BIGSERIAL PRIMARY KEY,
        name        TEXT NOT NULL,
        type        TEXT,
        description TEXT,
        human_id    TEXT,
        created_at  TIMESTAMPTZ DEFAULT NOW()
    );
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes WHERE tablename = 'apex_businesses' AND indexname = 'apex_businesses_human_id_idx'
    ) THEN
        CREATE INDEX apex_businesses_human_id_idx ON apex_businesses (human_id);
    END IF;
END $$;
