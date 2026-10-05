-- 104_pod_pipeline.sql — Print-on-Demand pipeline tables

CREATE TABLE IF NOT EXISTS pod_designs (
    id               BIGSERIAL PRIMARY KEY,
    niche            TEXT,
    concept          TEXT NOT NULL,
    dalle_prompt     TEXT,
    etsy_title       TEXT,
    tags             JSONB,
    image_url        TEXT,
    score            INTEGER DEFAULT 5,
    score_reason     TEXT,
    printify_image_id TEXT,
    status           TEXT DEFAULT 'pending',  -- pending|approved|uploaded|live|rejected
    created_at       TIMESTAMPTZ DEFAULT NOW(),
    updated_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS pod_products (
    id                   BIGSERIAL PRIMARY KEY,
    design_id            BIGINT REFERENCES pod_designs(id),
    printify_product_id  TEXT,
    etsy_listing_id      TEXT,
    title                TEXT,
    blueprint_id         INTEGER,
    orders_count         INTEGER DEFAULT 0,
    status               TEXT DEFAULT 'live',  -- live|archived
    created_at           TIMESTAMPTZ DEFAULT NOW(),
    updated_at           TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS pod_campaigns (
    id                   BIGSERIAL PRIMARY KEY,
    product_id           BIGINT REFERENCES pod_products(id),
    type                 TEXT DEFAULT 'static',  -- static|video
    higgsfield_job_id    TEXT,
    video_url            TEXT,
    prompt               TEXT,
    status               TEXT DEFAULT 'pending',
    created_at           TIMESTAMPTZ DEFAULT NOW()
);
