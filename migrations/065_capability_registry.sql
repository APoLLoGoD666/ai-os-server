-- 065_capability_registry.sql
-- Self-Expansion Engine — tracks every detected gap through its full lifecycle

CREATE TABLE IF NOT EXISTS capability_registry (
    id               TEXT PRIMARY KEY,
    name             TEXT        NOT NULL,
    category         TEXT        NOT NULL DEFAULT 'general',
    gap_source       TEXT,
    description      TEXT,
    status           TEXT        NOT NULL DEFAULT 'proposed'
                                 CHECK (status IN ('proposed','pending_approval','auto_approved','approved','rejected','blocked','deployed','monitoring','active')),
    decision         TEXT,
    scores           JSONB       NOT NULL DEFAULT '{}',
    spec             JSONB       NOT NULL DEFAULT '{}',
    deployed_at      TIMESTAMPTZ,
    deployed_commit  TEXT,
    monitoring_until TIMESTAMPTZ,
    monitoring_kpis  JSONB       NOT NULL DEFAULT '{}',
    post_deploy_health JSONB     NOT NULL DEFAULT '{}',
    last_checked_at  TIMESTAMPTZ,
    rejected_reason  TEXT,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cr_status  ON capability_registry(status);
CREATE INDEX IF NOT EXISTS idx_cr_created ON capability_registry(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_cr_source  ON capability_registry(gap_source);
