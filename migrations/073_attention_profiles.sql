-- Migration 073: Attention Profiles
-- First-class attention tracking: demand, debt, pressure, priority per entity.
-- Extends existing attention-engine.js (pure scorer) with persistence.

CREATE TABLE IF NOT EXISTS attention_profiles (
    id              text        PRIMARY KEY DEFAULT gen_random_uuid()::text,
    entity_id       text        NOT NULL,
    entity_type     text        NOT NULL DEFAULT 'domain',
    domain          text        NOT NULL,
    demand          numeric     NOT NULL DEFAULT 0.5 CHECK (demand >= 0 AND demand <= 1),
    debt            numeric     NOT NULL DEFAULT 0.0 CHECK (debt >= 0),
    pressure        numeric     NOT NULL DEFAULT 0.5 CHECK (pressure >= 0 AND pressure <= 1),
    priority        integer     NOT NULL DEFAULT 5,
    attention_score numeric     NOT NULL DEFAULT 0.5 CHECK (attention_score >= 0 AND attention_score <= 1),
    last_scored_at  timestamptz NOT NULL DEFAULT now(),
    window_hours    integer     NOT NULL DEFAULT 24,
    detail          jsonb       NOT NULL DEFAULT '{}',
    created_at      timestamptz NOT NULL DEFAULT now(),
    updated_at      timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_ap_entity ON attention_profiles(entity_id, domain);
CREATE INDEX IF NOT EXISTS idx_ap_score    ON attention_profiles(attention_score DESC);
CREATE INDEX IF NOT EXISTS idx_ap_pressure ON attention_profiles(pressure DESC);
CREATE INDEX IF NOT EXISTS idx_ap_debt     ON attention_profiles(debt DESC);
