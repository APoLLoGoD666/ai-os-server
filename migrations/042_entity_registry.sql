-- Migration 042: Entity Registry — Constitution Article 1 (one source of truth per entity)
-- Generic entity table underpins layers 2, 3, 6, 8, 12, 13, 14 of the civilisation model.

CREATE TABLE IF NOT EXISTS entities (
  entity_id   uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  kind        text        NOT NULL CHECK (kind IN ('person','organisation','project','asset','concept','place')),
  name        text        NOT NULL,
  aliases     text[]      NOT NULL DEFAULT '{}',
  attrs       jsonb       NOT NULL DEFAULT '{}',
  provenance  jsonb       NOT NULL DEFAULT '{}',
  merged_into uuid        REFERENCES entities(entity_id),
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS entities_kind_name_uidx
  ON entities (kind, lower(name))
  WHERE merged_into IS NULL;

CREATE INDEX IF NOT EXISTS entities_kind_idx ON entities (kind);
CREATE INDEX IF NOT EXISTS entities_aliases_gin_idx ON entities USING gin (aliases);

-- Queue for entity deduplication — reviewed weekly by admission engine
CREATE TABLE IF NOT EXISTS entity_merge_queue (
  merge_id    uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_a uuid        NOT NULL REFERENCES entities(entity_id),
  candidate_b uuid        NOT NULL REFERENCES entities(entity_id),
  confidence  real        NOT NULL CHECK (confidence BETWEEN 0 AND 1),
  evidence    jsonb       NOT NULL DEFAULT '{}',
  status      text        NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','merged')),
  created_at  timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz
);

CREATE INDEX IF NOT EXISTS entity_merge_queue_status_idx ON entity_merge_queue (status) WHERE status = 'pending';
