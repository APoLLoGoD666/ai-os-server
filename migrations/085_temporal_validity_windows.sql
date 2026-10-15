-- Migration 085: Temporal Validity Windows (KG-01 / RT09-PROC-06)
-- Source-aware freshness model. Different knowledge types expire at different rates.
-- Implements the RT09-PROC-06 temporal validity tracking documented as L-02 limitation
-- in T3-10, T3-10B, T3-10C, T3-10D chain files.
-- Canonical authority: lib/knowledge/knowledge-gap-engine.js

CREATE TABLE IF NOT EXISTS temporal_validity_windows (
    window_id             text        PRIMARY KEY,
    knowledge_type        text        NOT NULL UNIQUE,  -- canonical type identifier
    validity_seconds      integer,                      -- NULL = never expires naturally
    staleness_seconds     integer,                      -- seconds before validity_seconds when STALE warning triggers
    decay_rate_per_day    numeric(6,5) NOT NULL DEFAULT 0.003,  -- daily confidence decay
    requires_revalidation boolean     NOT NULL DEFAULT true,    -- must be actively revalidated on staleness
    description           text,
    created_at            timestamptz NOT NULL DEFAULT now()
);

-- Seed data: canonical freshness windows by knowledge type
INSERT INTO temporal_validity_windows
    (window_id, knowledge_type, validity_seconds, staleness_seconds, decay_rate_per_day, requires_revalidation, description)
VALUES
    -- Events (time-bound, become worthless after the event)
    ('TVW-CALENDAR_EVENT',      'CALENDAR_EVENT',        86400,   3600,  0.050, true,  'Calendar events: stale 1h before, expire same day'),
    -- Financial (changes frequently)
    ('TVW-FINANCIAL_BALANCE',   'FINANCIAL_BALANCE',     3600,    1800,  0.200, true,  'Account balances: stale at 30m, expire at 1h'),
    ('TVW-FINANCIAL_RATE',      'FINANCIAL_RATE',        86400,   21600, 0.050, true,  'Exchange/interest rates: stale at 6h, expire at 24h'),
    -- Contacts/people (stable but change occasionally)
    ('TVW-CONTACT_DETAIL',      'CONTACT_DETAIL',        7776000, 2592000, 0.001, false, 'Contact details: stale at 30d, expire at 90d'),
    ('TVW-PERSON_FACT',         'PERSON_FACT',           null,    null,  0.001, false, 'Person facts (DOB, name): generally permanent'),
    -- University (changes per semester)
    ('TVW-UNIVERSITY_SCHEDULE', 'UNIVERSITY_SCHEDULE',   604800,  86400, 0.010, true,  'University timetable: stale at 1d, expire at 7d'),
    ('TVW-UNIVERSITY_DEADLINE', 'UNIVERSITY_DEADLINE',   86400,   7200,  0.100, true,  'Assignment deadlines: stale at 2h, expire same day'),
    -- Documents (moderate change rate)
    ('TVW-DOCUMENT',            'DOCUMENT',              2592000, 604800, 0.003, false, 'Documents: stale at 7d, expire at 30d'),
    -- Preferences (stable, long-lived)
    ('TVW-PREFERENCE',          'PREFERENCE',            null,    2592000, 0.001, false, 'User preferences: staleness warning at 30d, no hard expiry'),
    -- Conversations (session-scoped)
    ('TVW-CONVERSATION',        'CONVERSATION',          7200,    3600,  0.010, false, 'Conversation context: stale at 1h, expire at 2h'),
    -- Tasks (live until completed or cancelled)
    ('TVW-TASK_STATUS',         'TASK_STATUS',           3600,    1800,  0.050, true,  'Task status: stale at 30m, expire at 1h'),
    -- Intelligence/external data
    ('TVW-NEWS_SIGNAL',         'NEWS_SIGNAL',           86400,   14400, 0.100, false, 'News/intelligence signals: stale at 4h, expire at 24h'),
    -- General/default
    ('TVW-GENERAL_FACT',        'GENERAL_FACT',          2592000, 604800, 0.003, true,  'General facts: stale at 7d, expire at 30d')
ON CONFLICT (knowledge_type) DO NOTHING;

CREATE INDEX IF NOT EXISTS idx_tvw_type ON temporal_validity_windows(knowledge_type);
