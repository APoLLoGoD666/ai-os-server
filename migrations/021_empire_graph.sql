-- Migration 021: Empire Graph
-- Master world model: everything outside the founder that they interact with,
-- control, own, influence, depend on, or wish to acquire.

CREATE TABLE IF NOT EXISTS egraph_nodes (
  id           TEXT        PRIMARY KEY,
  type         TEXT        NOT NULL,
  label        TEXT        NOT NULL,
  category     TEXT        NOT NULL DEFAULT 'general',
  properties   JSONB       NOT NULL DEFAULT '{}',
  weight       FLOAT       NOT NULL DEFAULT 1.0,
  health_score FLOAT,
  status       TEXT        NOT NULL DEFAULT 'active',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS egraph_nodes_type_idx     ON egraph_nodes(type);
CREATE INDEX IF NOT EXISTS egraph_nodes_category_idx ON egraph_nodes(category);
CREATE INDEX IF NOT EXISTS egraph_nodes_status_idx   ON egraph_nodes(status);
CREATE INDEX IF NOT EXISTS egraph_nodes_weight_idx   ON egraph_nodes(weight DESC);

CREATE TABLE IF NOT EXISTS egraph_edges (
  id           TEXT        PRIMARY KEY,
  from_id      TEXT        NOT NULL REFERENCES egraph_nodes(id) ON DELETE CASCADE,
  to_id        TEXT        NOT NULL REFERENCES egraph_nodes(id) ON DELETE CASCADE,
  relationship TEXT        NOT NULL,
  weight       FLOAT       NOT NULL DEFAULT 1.0,
  properties   JSONB       NOT NULL DEFAULT '{}',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS egraph_edges_from_idx ON egraph_edges(from_id);
CREATE INDEX IF NOT EXISTS egraph_edges_to_idx   ON egraph_edges(to_id);
CREATE INDEX IF NOT EXISTS egraph_edges_rel_idx  ON egraph_edges(relationship);
CREATE UNIQUE INDEX IF NOT EXISTS egraph_edges_pair_idx ON egraph_edges(from_id, relationship, to_id);

CREATE TABLE IF NOT EXISTS empire_health_scores (
  id           TEXT        PRIMARY KEY,
  node_id      TEXT        NOT NULL REFERENCES egraph_nodes(id) ON DELETE CASCADE,
  dimension    TEXT        NOT NULL,
  score        FLOAT       NOT NULL DEFAULT 0,
  details      JSONB       NOT NULL DEFAULT '{}',
  computed_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS empire_health_node_idx ON empire_health_scores(node_id);
CREATE INDEX IF NOT EXISTS empire_health_dim_idx  ON empire_health_scores(dimension);
