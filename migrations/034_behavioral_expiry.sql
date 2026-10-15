-- Migration 034: Add expires_at to behavioral_modifications
-- Fixes: constraints had no expiry, could block the pipeline indefinitely.
-- Rows with expires_at IS NULL remain permanent (existing behaviour preserved).

ALTER TABLE behavioral_modifications
    ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_bm_expires
    ON behavioral_modifications(expires_at)
    WHERE expires_at IS NOT NULL;

COMMENT ON COLUMN behavioral_modifications.expires_at IS
    'NULL = permanent constraint. Non-null = auto-cleared by nightly cron after this timestamp.';
