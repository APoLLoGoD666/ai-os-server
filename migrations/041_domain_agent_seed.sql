-- APEX v1 Kernel — Migration 041
-- Seeds the 5 domain agents (user-facing) into the agents table.
-- Requires 038 to have run first (agents table must exist).
-- Safe to re-run (ON CONFLICT DO NOTHING).

INSERT INTO agents (id, role, is_active) VALUES
    ('00000000-0000-4000-8000-00000000000a', 'SYSTEM_AGENT',   true),
    ('00000000-0000-4000-8000-00000000000b', 'FILE_AGENT',     true),
    ('00000000-0000-4000-8000-00000000000c', 'UNI_AGENT',      true),
    ('00000000-0000-4000-8000-00000000000d', 'FINANCE_AGENT',  true),
    ('00000000-0000-4000-8000-00000000000e', 'BUSINESS_AGENT', true)
ON CONFLICT (id) DO NOTHING;
