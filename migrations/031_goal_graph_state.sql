CREATE TABLE IF NOT EXISTS goal_graph_state (
  id TEXT PRIMARY KEY DEFAULT 'singleton',
  graph_data JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
