-- 102_revenue_layer.sql
-- Extend existing apex_clients, apex_proposals, apex_invoices with revenue columns.

-- apex_clients: existing cols = id, name, stage, value, contact_email, follow_up_date, created_at
ALTER TABLE apex_clients ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE apex_clients ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE apex_clients ADD COLUMN IF NOT EXISTS company TEXT;
ALTER TABLE apex_clients ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE apex_clients ADD COLUMN IF NOT EXISTS rate_per_hour NUMERIC(10,2);
ALTER TABLE apex_clients ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'GBP';
ALTER TABLE apex_clients ADD COLUMN IF NOT EXISTS source TEXT;
ALTER TABLE apex_clients ADD COLUMN IF NOT EXISTS human_id TEXT;
ALTER TABLE apex_clients ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

CREATE INDEX IF NOT EXISTS apex_clients_human_id_idx ON apex_clients (human_id);
CREATE INDEX IF NOT EXISTS apex_clients_stage_idx ON apex_clients (stage);

-- apex_proposals: existing cols = id, title, client_id, status, amount, notes, created_at
ALTER TABLE apex_proposals ADD COLUMN IF NOT EXISTS client_name TEXT;
ALTER TABLE apex_proposals ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE apex_proposals ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'GBP';
ALTER TABLE apex_proposals ADD COLUMN IF NOT EXISTS valid_until DATE;
ALTER TABLE apex_proposals ADD COLUMN IF NOT EXISTS sent_at TIMESTAMPTZ;
ALTER TABLE apex_proposals ADD COLUMN IF NOT EXISTS responded_at TIMESTAMPTZ;
ALTER TABLE apex_proposals ADD COLUMN IF NOT EXISTS invoice_id BIGINT;
ALTER TABLE apex_proposals ADD COLUMN IF NOT EXISTS human_id TEXT;
ALTER TABLE apex_proposals ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

CREATE INDEX IF NOT EXISTS apex_proposals_status_idx ON apex_proposals (status);
CREATE INDEX IF NOT EXISTS apex_proposals_human_id_idx ON apex_proposals (human_id);

-- apex_invoices: existing cols = id, title, amount, status, due_date, client_name, notes, created_at, human_id
ALTER TABLE apex_invoices ADD COLUMN IF NOT EXISTS client_id BIGINT;
ALTER TABLE apex_invoices ADD COLUMN IF NOT EXISTS proposal_id BIGINT;
ALTER TABLE apex_invoices ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ;
ALTER TABLE apex_invoices ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'GBP';
