-- 093_identity_scoping.sql
-- Adds human_id to personal data tables so all routes can filter per user.
-- Backfills existing rows to the master UUID.

DO $$
BEGIN

  -- transactions (legacy table used by src/routes/finance.js)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'transactions') THEN
    ALTER TABLE transactions ADD COLUMN IF NOT EXISTS human_id TEXT NULL;
    CREATE INDEX IF NOT EXISTS idx_transactions_human_id ON transactions (human_id) WHERE human_id IS NOT NULL;
    UPDATE transactions SET human_id = '00000000-0000-4000-8000-000000000001' WHERE human_id IS NULL;
  END IF;

  -- apex_transactions (used by routes/finance.js)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'apex_transactions') THEN
    ALTER TABLE apex_transactions ADD COLUMN IF NOT EXISTS human_id TEXT NULL;
    CREATE INDEX IF NOT EXISTS idx_apex_transactions_human_id ON apex_transactions (human_id) WHERE human_id IS NOT NULL;
    UPDATE apex_transactions SET human_id = '00000000-0000-4000-8000-000000000001' WHERE human_id IS NULL;
  END IF;

  -- apex_invoices
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'apex_invoices') THEN
    ALTER TABLE apex_invoices ADD COLUMN IF NOT EXISTS human_id TEXT NULL;
    CREATE INDEX IF NOT EXISTS idx_apex_invoices_human_id ON apex_invoices (human_id) WHERE human_id IS NOT NULL;
    UPDATE apex_invoices SET human_id = '00000000-0000-4000-8000-000000000001' WHERE human_id IS NULL;
  END IF;

  -- apex_subscriptions
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'apex_subscriptions') THEN
    ALTER TABLE apex_subscriptions ADD COLUMN IF NOT EXISTS human_id TEXT NULL;
    CREATE INDEX IF NOT EXISTS idx_apex_subscriptions_human_id ON apex_subscriptions (human_id) WHERE human_id IS NOT NULL;
    UPDATE apex_subscriptions SET human_id = '00000000-0000-4000-8000-000000000001' WHERE human_id IS NULL;
  END IF;

  -- apex_investments
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'apex_investments') THEN
    ALTER TABLE apex_investments ADD COLUMN IF NOT EXISTS human_id TEXT NULL;
    CREATE INDEX IF NOT EXISTS idx_apex_investments_human_id ON apex_investments (human_id) WHERE human_id IS NOT NULL;
    UPDATE apex_investments SET human_id = '00000000-0000-4000-8000-000000000001' WHERE human_id IS NULL;
  END IF;

  -- apex_nutrition_log
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'apex_nutrition_log') THEN
    ALTER TABLE apex_nutrition_log ADD COLUMN IF NOT EXISTS human_id TEXT NULL;
    CREATE INDEX IF NOT EXISTS idx_apex_nutrition_log_human_id ON apex_nutrition_log (human_id) WHERE human_id IS NOT NULL;
    UPDATE apex_nutrition_log SET human_id = '00000000-0000-4000-8000-000000000001' WHERE human_id IS NULL;
  END IF;

  -- apex_sleep_log
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'apex_sleep_log') THEN
    ALTER TABLE apex_sleep_log ADD COLUMN IF NOT EXISTS human_id TEXT NULL;
    CREATE INDEX IF NOT EXISTS idx_apex_sleep_log_human_id ON apex_sleep_log (human_id) WHERE human_id IS NOT NULL;
    UPDATE apex_sleep_log SET human_id = '00000000-0000-4000-8000-000000000001' WHERE human_id IS NULL;
  END IF;

  -- apex_workouts
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'apex_workouts') THEN
    ALTER TABLE apex_workouts ADD COLUMN IF NOT EXISTS human_id TEXT NULL;
    CREATE INDEX IF NOT EXISTS idx_apex_workouts_human_id ON apex_workouts (human_id) WHERE human_id IS NOT NULL;
    UPDATE apex_workouts SET human_id = '00000000-0000-4000-8000-000000000001' WHERE human_id IS NULL;
  END IF;

  -- apex_journal_entries
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'apex_journal_entries') THEN
    ALTER TABLE apex_journal_entries ADD COLUMN IF NOT EXISTS human_id TEXT NULL;
    CREATE INDEX IF NOT EXISTS idx_apex_journal_entries_human_id ON apex_journal_entries (human_id) WHERE human_id IS NOT NULL;
    UPDATE apex_journal_entries SET human_id = '00000000-0000-4000-8000-000000000001' WHERE human_id IS NULL;
  END IF;

  -- apex_university_assignments
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'apex_university_assignments') THEN
    ALTER TABLE apex_university_assignments ADD COLUMN IF NOT EXISTS human_id TEXT NULL;
    CREATE INDEX IF NOT EXISTS idx_apex_university_assignments_human_id ON apex_university_assignments (human_id) WHERE human_id IS NOT NULL;
    UPDATE apex_university_assignments SET human_id = '00000000-0000-4000-8000-000000000001' WHERE human_id IS NULL;
  END IF;

  -- apex_assignments (used in briefing priority-inbox)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'apex_assignments') THEN
    ALTER TABLE apex_assignments ADD COLUMN IF NOT EXISTS human_id TEXT NULL;
    CREATE INDEX IF NOT EXISTS idx_apex_assignments_human_id ON apex_assignments (human_id) WHERE human_id IS NOT NULL;
    UPDATE apex_assignments SET human_id = '00000000-0000-4000-8000-000000000001' WHERE human_id IS NULL;
  END IF;

END $$;
