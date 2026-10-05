-- Migration 048: Executive Roles — Constitution Article 5 (generic engines, specific configs)
-- Extracts hardcoded orchestrator.js if-blocks into config rows.
-- Each row drives the shared executive consultation engine.

CREATE TABLE IF NOT EXISTS executive_roles (
  role        text        PRIMARY KEY,
  domain      text        NOT NULL,
  triggers    jsonb       NOT NULL DEFAULT '{}',
  weight      real        NOT NULL DEFAULT 1.0 CHECK (weight > 0),
  veto        boolean     NOT NULL DEFAULT false,
  prompt_ref  text        NOT NULL,
  active      boolean     NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS executive_verdicts (
  verdict_id  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id     text        NOT NULL,
  role        text        NOT NULL REFERENCES executive_roles(role),
  decision    text        NOT NULL,
  rationale   text,
  confidence  real        CHECK (confidence BETWEEN 0 AND 1),
  event_id    uuid        REFERENCES events(event_id) ON DELETE SET NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS executive_verdicts_task_idx ON executive_verdicts (task_id);
CREATE INDEX IF NOT EXISTS executive_verdicts_role_idx  ON executive_verdicts (role);

-- Seed the 3 currently hardcoded executives
-- triggers JSON matches conditions checked in orchestrator.js
INSERT INTO executive_roles (role, domain, triggers, weight, veto, prompt_ref) VALUES
  ('cto', 'technology', '{"deploy_tiers":["staged","critical"],"description":"Consulted on all staged and critical deployments"}', 1.0, false, 'agent-system/orchestrator.js:consultExecutive:cto'),
  ('coo', 'operations', '{"condition":"attempt_gt_2","description":"Alerted when a task requires more than 2 retry attempts — indicates systematic failure pattern"}', 0.8, false, 'agent-system/orchestrator.js:consultExecutive:coo'),
  ('cfo', 'finance',    '{"condition":"cost_usd_gt_1.50","description":"Alerted when task cost exceeds $1.50 within the $2.00 cap"}', 0.8, false, 'agent-system/orchestrator.js:consultExecutive:cfo')
ON CONFLICT (role) DO NOTHING;
