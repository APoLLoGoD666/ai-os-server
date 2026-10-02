-- Migration 071: Epistemic Capital
-- 4-dimension balance sheet: Credibility, Accuracy, Calibration, Evidence Quality.
-- Domain-specific with transfer coefficients (adjacent: 0.7, non-adjacent: 0.2).

CREATE TABLE IF NOT EXISTS epistemic_capital (
    id             text        PRIMARY KEY DEFAULT gen_random_uuid()::text,
    holder_id      text        NOT NULL,
    domain         text        NOT NULL,
    dimension      text        NOT NULL,
    score          numeric     NOT NULL DEFAULT 50 CHECK (score >= 0 AND score <= 100),
    basis_count    integer     NOT NULL DEFAULT 0,
    detail         jsonb       NOT NULL DEFAULT '{}',
    measured_at    timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_ec_holder_domain_dim ON epistemic_capital(holder_id, domain, dimension);
CREATE INDEX IF NOT EXISTS idx_ec_holder  ON epistemic_capital(holder_id, score DESC);
CREATE INDEX IF NOT EXISTS idx_ec_domain  ON epistemic_capital(domain, dimension);

CREATE TABLE IF NOT EXISTS ec_transactions (
    id            text        PRIMARY KEY DEFAULT gen_random_uuid()::text,
    holder_id     text        NOT NULL,
    from_domain   text        NOT NULL,
    to_domain     text        NOT NULL,
    dimension     text        NOT NULL,
    amount        numeric     NOT NULL,
    coefficient   numeric     NOT NULL DEFAULT 1.0,
    net_transfer  numeric     NOT NULL,
    reason        text,
    created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ect_holder ON ec_transactions(holder_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ect_domains ON ec_transactions(from_domain, to_domain);
