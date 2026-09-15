-- Migration 076: Reality Dynamics Gates
-- Gate verification between lifecycle stages + claim dependency graph.

CREATE TABLE IF NOT EXISTS claim_gates (
    id          text        PRIMARY KEY DEFAULT gen_random_uuid()::text,
    claim_id    text        NOT NULL REFERENCES reality_claims(id) ON DELETE CASCADE,
    from_stage  text        NOT NULL,
    to_stage    text        NOT NULL,
    gate_name   text        NOT NULL,
    passed      boolean     NOT NULL,
    reason      text,
    checked_by  text,
    created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_cg_claim  ON claim_gates(claim_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_cg_passed ON claim_gates(passed, to_stage);

CREATE TABLE IF NOT EXISTS claim_dependencies (
    id          text        PRIMARY KEY DEFAULT gen_random_uuid()::text,
    claim_id    text        NOT NULL REFERENCES reality_claims(id) ON DELETE CASCADE,
    depends_on  text        NOT NULL REFERENCES reality_claims(id) ON DELETE CASCADE,
    dep_type    text        NOT NULL DEFAULT 'supports',
    strength    numeric     NOT NULL DEFAULT 0.5 CHECK (strength >= 0 AND strength <= 1),
    created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_cd_pair ON claim_dependencies(claim_id, depends_on);
CREATE INDEX IF NOT EXISTS idx_cd_dep ON claim_dependencies(depends_on);
