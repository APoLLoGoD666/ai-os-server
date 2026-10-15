-- Migration 043: Relationship Memory — edges and interactions between entities
-- Requires migration 042 (entities table) to be applied first.

CREATE TABLE IF NOT EXISTS relationships (
  edge_id      uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_a     uuid        NOT NULL REFERENCES entities(entity_id) ON DELETE CASCADE,
  entity_b     uuid        NOT NULL REFERENCES entities(entity_id) ON DELETE CASCADE,
  rel_type     text        NOT NULL,
  strength     real        NOT NULL DEFAULT 0 CHECK (strength BETWEEN 0 AND 1),
  last_contact timestamptz,
  notes        text,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (entity_a, entity_b, rel_type)
);

CREATE INDEX IF NOT EXISTS relationships_entity_a_idx ON relationships (entity_a);
CREATE INDEX IF NOT EXISTS relationships_entity_b_idx ON relationships (entity_b);
CREATE INDEX IF NOT EXISTS relationships_strength_idx ON relationships (strength DESC);

-- Interactions log: individual contact events contributing to relationship strength
CREATE TABLE IF NOT EXISTS interactions (
  interaction_id uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  edge_id        uuid        REFERENCES relationships(edge_id) ON DELETE SET NULL,
  event_id       uuid        REFERENCES events(event_id) ON DELETE SET NULL,
  channel        text        NOT NULL CHECK (channel IN ('email','meeting','voice','calendar','message','other')),
  summary        text,
  sentiment      real        CHECK (sentiment BETWEEN -1 AND 1),
  occurred_at    timestamptz NOT NULL DEFAULT now(),
  created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS interactions_edge_id_idx ON interactions (edge_id);
CREATE INDEX IF NOT EXISTS interactions_occurred_idx ON interactions (occurred_at DESC);
CREATE INDEX IF NOT EXISTS interactions_channel_idx  ON interactions (channel);
