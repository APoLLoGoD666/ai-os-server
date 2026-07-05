-- governance_records table — ARCH-15 §6.3 + gate-record extensions
-- One row per constitutional gate evaluation and governed state transition.
-- Append-only: no updated_at column.
CREATE TABLE IF NOT EXISTS governance_records (
    id                        uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    record_id                 uuid DEFAULT gen_random_uuid() NOT NULL UNIQUE,
    record_type               text NOT NULL,
    actor_identity_snapshot   jsonb NOT NULL DEFAULT '{}',
    action_type               text NOT NULL,
    entity_type               text NOT NULL,
    entity_id                 uuid,
    request_id                text,
    decision                  text NOT NULL DEFAULT 'NOTED'
                                CHECK (decision IN ('APPROVED','REJECTED','NOTED','BLOCKED')),
    decision_basis            text NOT NULL DEFAULT '',
    evidence_refs             jsonb NOT NULL DEFAULT '[]',
    autonomy_level            integer NOT NULL DEFAULT 3
                                CHECK (autonomy_level BETWEEN 1 AND 6),
    has_constitutional_impact boolean NOT NULL DEFAULT false,
    chain_link                uuid,
    chain_hash                text NOT NULL DEFAULT '',
    predecessor_hash          text,
    gate_result               text CHECK (gate_result IN ('PASS','BLOCK')),
    governance_score          numeric(5,2),
    verdict                   text,
    risks                     text[],
    rule_results              jsonb,
    created_at                timestamptz NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_governance_records_entity_id
    ON governance_records(entity_id) WHERE entity_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_governance_records_record_type
    ON governance_records(record_type);
CREATE INDEX IF NOT EXISTS idx_governance_records_created_at
    ON governance_records(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_governance_records_request_id
    ON governance_records(request_id) WHERE request_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_governance_records_constitutional
    ON governance_records(created_at DESC)
    WHERE has_constitutional_impact = true;

ALTER TABLE governance_records ENABLE ROW LEVEL SECURITY;
