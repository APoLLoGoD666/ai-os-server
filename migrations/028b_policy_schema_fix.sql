-- Migration 028: Fix cognitive_policy_settings schema
-- Adds applies_to and active columns that gateway.js retrievePolicies expects.
-- The original table (migration 012) only had policy_name/policy_value; the
-- gateway query filtering on .in('applies_to', [...]).eq('active', true) always
-- failed with "column does not exist", forcing permanent fallback to defaults.

ALTER TABLE cognitive_policy_settings
    ADD COLUMN IF NOT EXISTS applies_to TEXT NOT NULL DEFAULT 'all',
    ADD COLUMN IF NOT EXISTS active     BOOLEAN NOT NULL DEFAULT TRUE;

CREATE INDEX IF NOT EXISTS idx_cps_applies_to ON cognitive_policy_settings(applies_to);
CREATE INDEX IF NOT EXISTS idx_cps_active     ON cognitive_policy_settings(active);

-- Back-fill existing rows so they match any task category
UPDATE cognitive_policy_settings SET applies_to = 'all', active = TRUE
    WHERE applies_to IS NULL OR active IS NULL;
