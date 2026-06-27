-- Migration 030: Improvement Proposals Registry (L-12)
-- Mirrors the vault-based proposals.json into Supabase for DB-level observability.
-- Vault remains authoritative — this table is populated by fire-and-forget upserts
-- from _saveRegistry() in improvement-executor.js. Reads still go to vault.
-- Enables: analytics queries, attribution joins, lifecycle auditing across sessions.

CREATE TABLE IF NOT EXISTS improvement_proposals_registry (
    proposal_id     TEXT        PRIMARY KEY,
    template_id     TEXT,
    category        TEXT,
    status          TEXT        NOT NULL DEFAULT 'pending',
    priority_score  FLOAT,
    title           TEXT,
    description     TEXT,
    risk            TEXT,
    target_module   TEXT,
    synced_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_improvement_proposals_status
    ON improvement_proposals_registry (status);

CREATE INDEX IF NOT EXISTS idx_improvement_proposals_category
    ON improvement_proposals_registry (category);

COMMENT ON TABLE improvement_proposals_registry IS
    'DB mirror of vault System/Improvements/proposals.json. '
    'Populated by improvement-executor.js on every _saveRegistry() call. '
    'Vault is authoritative — this table is for observability and attribution only.';
