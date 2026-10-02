-- Migration 019: Founder Knowledge Graph
-- Permanent graph-based representation of founder identity, values, goals, relationships.

CREATE TABLE IF NOT EXISTS fkg_nodes (
  id          TEXT        PRIMARY KEY,
  type        TEXT        NOT NULL,
  label       TEXT        NOT NULL,
  properties  JSONB       NOT NULL DEFAULT '{}',
  weight      FLOAT       NOT NULL DEFAULT 1.0,
  layer       TEXT        NOT NULL DEFAULT 'general',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS fkg_nodes_type_idx  ON fkg_nodes(type);
CREATE INDEX IF NOT EXISTS fkg_nodes_layer_idx ON fkg_nodes(layer);
CREATE INDEX IF NOT EXISTS fkg_nodes_weight_idx ON fkg_nodes(weight DESC);

CREATE TABLE IF NOT EXISTS fkg_edges (
  id           TEXT        PRIMARY KEY,
  from_id      TEXT        NOT NULL,
  to_id        TEXT        NOT NULL,
  relationship TEXT        NOT NULL,
  weight       FLOAT       NOT NULL DEFAULT 1.0,
  properties   JSONB       NOT NULL DEFAULT '{}',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS fkg_edges_from_idx ON fkg_edges(from_id);
CREATE INDEX IF NOT EXISTS fkg_edges_to_idx   ON fkg_edges(to_id);
CREATE INDEX IF NOT EXISTS fkg_edges_rel_idx  ON fkg_edges(relationship);
CREATE INDEX IF NOT EXISTS fkg_edges_pair_idx ON fkg_edges(from_id, to_id);
