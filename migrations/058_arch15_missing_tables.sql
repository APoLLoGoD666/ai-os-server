-- @apex-migration
-- @ent-refs:   ENT-001206, ENT-001207
-- @arch-refs:  ARCH-15, ARCH-14
-- @block:      24
-- @status:     EXECUTED
-- @description: Creates sessions and audit_records tables (ARCH-15 §6.5, §6.7)
-- ARCH-15 §6.5 sessions table (SOT-004, ARCH-14)
-- Tracks stateful user sessions through the 8-phase runtime pipeline.
CREATE TABLE IF NOT EXISTS sessions (
    id                    uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    session_id            uuid DEFAULT gen_random_uuid() NOT NULL UNIQUE,
    user_id               uuid NOT NULL,
    identity_snapshot     jsonb NOT NULL DEFAULT '{}',
    effective_trust_level integer NOT NULL DEFAULT 3
                            CHECK (effective_trust_level BETWEEN 1 AND 6),
    status                text NOT NULL DEFAULT 'ACTIVE'
                            CHECK (status IN ('ACTIVE','EXPIRED','TERMINATED')),
    working_context       jsonb NOT NULL DEFAULT '{}',
    turn_count            integer NOT NULL DEFAULT 0,
    cumulative_cost_usd   numeric(10,6) NOT NULL DEFAULT 0,
    expires_at            timestamptz NOT NULL DEFAULT (now() + interval '24 hours'),
    terminated_at         timestamptz,
    termination_reason    text,
    created_at            timestamptz NOT NULL DEFAULT NOW(),
    updated_at            timestamptz NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sessions_user_id   ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_status     ON sessions(status);
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at) WHERE status = 'ACTIVE';

ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sessions_user_isolation"
    ON sessions FOR ALL
    USING (user_id = auth.uid()::uuid);

-- ARCH-15 §6.7 audit_records table (ARCH-08)
-- Append-only audit log for every governed state transition. No updated_at.
CREATE TABLE IF NOT EXISTS audit_records (
    id                        uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    audit_id                  uuid DEFAULT gen_random_uuid() NOT NULL UNIQUE,
    operation_class           text NOT NULL,
    action_name               text NOT NULL,
    actor_identity_snapshot   jsonb NOT NULL DEFAULT '{}',
    entity_type               text NOT NULL,
    entity_id                 uuid,
    outcome                   text NOT NULL DEFAULT 'SUCCESS'
                                CHECK (outcome IN ('SUCCESS','FAILURE','BLOCKED','PARTIAL')),
    outcome_detail            text,
    evidence_refs             jsonb NOT NULL DEFAULT '[]',
    has_constitutional_impact boolean NOT NULL DEFAULT false,
    chain_link                uuid,
    chain_hash                text NOT NULL DEFAULT '',
    predecessor_hash          text,
    request_id                text,
    correlation_id            text,
    recorded_at               timestamptz NOT NULL DEFAULT NOW(),
    created_at                timestamptz NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_records_entity_id
    ON audit_records(entity_id) WHERE entity_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_audit_records_operation_class
    ON audit_records(operation_class);
CREATE INDEX IF NOT EXISTS idx_audit_records_recorded_at
    ON audit_records(recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_records_constitutional
    ON audit_records(recorded_at DESC)
    WHERE has_constitutional_impact = true;

ALTER TABLE audit_records ENABLE ROW LEVEL SECURITY;
