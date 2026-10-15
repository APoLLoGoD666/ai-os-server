-- 103_revenue_engines.sql
-- Tables for ads copy engine, etsy listing generator, and outreach campaigns.

CREATE TABLE IF NOT EXISTS apex_ad_copies (
    id          BIGSERIAL PRIMARY KEY,
    product     TEXT NOT NULL,
    audience    TEXT,
    objective   TEXT,
    copies      JSONB NOT NULL,
    human_id    TEXT,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS apex_ad_copies_human_id_idx ON apex_ad_copies (human_id);

CREATE TABLE IF NOT EXISTS apex_etsy_listings (
    id               BIGSERIAL PRIMARY KEY,
    product_name     TEXT NOT NULL,
    niche            TEXT,
    title            TEXT NOT NULL,
    description      TEXT,
    tags             TEXT[],
    price_suggestion NUMERIC(10,2),
    keywords         TEXT[],
    status           TEXT DEFAULT 'draft',
    human_id         TEXT,
    created_at       TIMESTAMPTZ DEFAULT NOW(),
    updated_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS apex_etsy_listings_human_id_idx ON apex_etsy_listings (human_id);
CREATE INDEX IF NOT EXISTS apex_etsy_listings_status_idx   ON apex_etsy_listings (status);

CREATE TABLE IF NOT EXISTS apex_outreach_campaigns (
    id               BIGSERIAL PRIMARY KEY,
    name             TEXT NOT NULL,
    service_offering TEXT,
    target_industry  TEXT,
    status           TEXT DEFAULT 'active',
    human_id         TEXT,
    created_at       TIMESTAMPTZ DEFAULT NOW(),
    updated_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS apex_outreach_campaigns_human_id_idx ON apex_outreach_campaigns (human_id);

CREATE TABLE IF NOT EXISTS apex_outreach_prospects (
    id               BIGSERIAL PRIMARY KEY,
    campaign_id      BIGINT,
    business_name    TEXT NOT NULL,
    website          TEXT,
    contact_name     TEXT,
    contact_email    TEXT,
    research_notes   TEXT,
    email_copy       TEXT,
    status           TEXT DEFAULT 'draft',
    human_id         TEXT,
    created_at       TIMESTAMPTZ DEFAULT NOW(),
    updated_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS apex_outreach_prospects_campaign_idx  ON apex_outreach_prospects (campaign_id);
CREATE INDEX IF NOT EXISTS apex_outreach_prospects_human_id_idx  ON apex_outreach_prospects (human_id);
CREATE INDEX IF NOT EXISTS apex_outreach_prospects_status_idx    ON apex_outreach_prospects (status);
