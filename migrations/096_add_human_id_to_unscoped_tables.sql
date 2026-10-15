-- Add human_id to every personal data table that was missing it.
-- Existing rows keep NULL (system/legacy). New rows stamped at route layer.
ALTER TABLE apex_mood_log          ADD COLUMN IF NOT EXISTS human_id TEXT;
ALTER TABLE apex_social_accounts   ADD COLUMN IF NOT EXISTS human_id TEXT;
ALTER TABLE apex_wishlist          ADD COLUMN IF NOT EXISTS human_id TEXT;
ALTER TABLE apex_purchases         ADD COLUMN IF NOT EXISTS human_id TEXT;
ALTER TABLE apex_finance_entries   ADD COLUMN IF NOT EXISTS human_id TEXT;
ALTER TABLE apex_body_measurements ADD COLUMN IF NOT EXISTS human_id TEXT;
ALTER TABLE apex_people            ADD COLUMN IF NOT EXISTS human_id TEXT;
ALTER TABLE apex_contracts         ADD COLUMN IF NOT EXISTS human_id TEXT;
ALTER TABLE apex_job_applications  ADD COLUMN IF NOT EXISTS human_id TEXT;
ALTER TABLE apex_properties        ADD COLUMN IF NOT EXISTS human_id TEXT;
ALTER TABLE apex_spiritual_sessions ADD COLUMN IF NOT EXISTS human_id TEXT;

CREATE INDEX IF NOT EXISTS apex_mood_log_hid           ON apex_mood_log(human_id);
CREATE INDEX IF NOT EXISTS apex_social_accounts_hid    ON apex_social_accounts(human_id);
CREATE INDEX IF NOT EXISTS apex_wishlist_hid            ON apex_wishlist(human_id);
CREATE INDEX IF NOT EXISTS apex_purchases_hid           ON apex_purchases(human_id);
CREATE INDEX IF NOT EXISTS apex_finance_entries_hid     ON apex_finance_entries(human_id);
CREATE INDEX IF NOT EXISTS apex_body_measurements_hid   ON apex_body_measurements(human_id);
CREATE INDEX IF NOT EXISTS apex_people_hid              ON apex_people(human_id);
CREATE INDEX IF NOT EXISTS apex_contracts_hid           ON apex_contracts(human_id);
CREATE INDEX IF NOT EXISTS apex_job_applications_hid    ON apex_job_applications(human_id);
CREATE INDEX IF NOT EXISTS apex_properties_hid          ON apex_properties(human_id);
CREATE INDEX IF NOT EXISTS apex_spiritual_sessions_hid  ON apex_spiritual_sessions(human_id);
