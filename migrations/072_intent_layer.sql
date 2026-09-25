-- Migration 072: Intent Layer
-- Records WHY an action was selected, between Decision and Action in the execution chain.
-- Enables causal attribution and Theory of Change tracking.

CREATE TABLE IF NOT EXISTS intent_records (
    id              text        PRIMARY KEY DEFAULT gen_random_uuid()::text,
    actor_id        text        NOT NULL,
    domain          text        NOT NULL,
    action_ref      text,
    intent_type     text        NOT NULL DEFAULT 'goal_pursuit',
    goal            text        NOT NULL,
    rationale       text,
    expected_impact jsonb       NOT NULL DEFAULT '{}',
    alternative_considered jsonb NOT NULL DEFAULT '[]',
    confidence      numeric     NOT NULL DEFAULT 0.5,
    outcome_ref     text,
    attribution_closed boolean  NOT NULL DEFAULT false,
    outcome_matched boolean,
    created_at      timestamptz NOT NULL DEFAULT now(),
    closed_at       timestamptz
);
CREATE INDEX IF NOT EXISTS idx_intent_actor    ON intent_records(actor_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_intent_domain   ON intent_records(domain, intent_type);
CREATE INDEX IF NOT EXISTS idx_intent_open     ON intent_records(attribution_closed, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_intent_action   ON intent_records(action_ref);
