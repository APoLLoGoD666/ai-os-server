'use strict';
// lib/db-migrate.js — Runs CREATE TABLE IF NOT EXISTS for life-domain tables via Supabase Management API
const logger = require('./logger');

const LIFE_DOMAIN_SQL = `
CREATE TABLE IF NOT EXISTS apex_people (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL, email text, phone text, birthday date,
  relationship_type text DEFAULT 'other', company text, notes text,
  last_contact_date date, created_at timestamptz DEFAULT now()
);
CREATE TABLE IF NOT EXISTS apex_interactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id uuid REFERENCES apex_people(id) ON DELETE CASCADE,
  type text DEFAULT 'other', interaction_date date NOT NULL DEFAULT CURRENT_DATE,
  notes text, sentiment_score int, created_at timestamptz DEFAULT now()
);
CREATE TABLE IF NOT EXISTS apex_follow_ups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id uuid REFERENCES apex_people(id) ON DELETE CASCADE,
  note text NOT NULL, due_date date, completed boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);
CREATE TABLE IF NOT EXISTS apex_trips (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL, destination text, start_date date, end_date date,
  status text DEFAULT 'planned', budget_gbp numeric(10,2), notes text,
  created_at timestamptz DEFAULT now()
);
CREATE TABLE IF NOT EXISTS apex_trip_expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id uuid REFERENCES apex_trips(id) ON DELETE CASCADE,
  description text NOT NULL, amount_gbp numeric(10,2) NOT NULL,
  category text, expense_date date DEFAULT CURRENT_DATE,
  created_at timestamptz DEFAULT now()
);
CREATE TABLE IF NOT EXISTS apex_itinerary_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id uuid REFERENCES apex_trips(id) ON DELETE CASCADE,
  item_date date, title text NOT NULL, location text, notes text,
  created_at timestamptz DEFAULT now()
);
CREATE TABLE IF NOT EXISTS apex_properties (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL, address text, type text DEFAULT 'rental',
  monthly_cost_gbp numeric(10,2), lease_end_date date, notes text,
  created_at timestamptz DEFAULT now()
);
CREATE TABLE IF NOT EXISTS apex_property_expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid REFERENCES apex_properties(id) ON DELETE CASCADE,
  description text NOT NULL, amount_gbp numeric(10,2) NOT NULL,
  category text, expense_date date DEFAULT CURRENT_DATE,
  created_at timestamptz DEFAULT now()
);
CREATE TABLE IF NOT EXISTS apex_maintenance_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid REFERENCES apex_properties(id) ON DELETE CASCADE,
  description text NOT NULL, status text DEFAULT 'pending',
  scheduled_date date, cost_gbp numeric(10,2), notes text,
  created_at timestamptz DEFAULT now()
);
CREATE TABLE IF NOT EXISTS apex_contracts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL, counterparty text, type text DEFAULT 'other',
  start_date date, end_date date, status text DEFAULT 'active',
  file_url text, notes text, created_at timestamptz DEFAULT now()
);
CREATE TABLE IF NOT EXISTS apex_legal_deadlines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id uuid REFERENCES apex_contracts(id) ON DELETE CASCADE,
  description text NOT NULL, due_date date NOT NULL,
  completed boolean DEFAULT false, created_at timestamptz DEFAULT now()
);
CREATE TABLE IF NOT EXISTS apex_job_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company text NOT NULL, role text NOT NULL, status text DEFAULT 'applied',
  applied_date date DEFAULT CURRENT_DATE, salary_range text, url text, notes text,
  created_at timestamptz DEFAULT now()
);
CREATE TABLE IF NOT EXISTS apex_interviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid REFERENCES apex_job_applications(id) ON DELETE CASCADE,
  interview_date timestamptz, type text DEFAULT 'other',
  notes text, outcome text, created_at timestamptz DEFAULT now()
);
CREATE TABLE IF NOT EXISTS apex_skills (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL, category text, level text DEFAULT 'intermediate',
  target_level text, notes text, created_at timestamptz DEFAULT now()
);
CREATE TABLE IF NOT EXISTS apex_wishlist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL, url text, price_target_gbp numeric(10,2),
  current_price_gbp numeric(10,2), priority text DEFAULT 'medium',
  purchased boolean DEFAULT false, notes text, created_at timestamptz DEFAULT now()
);
CREATE TABLE IF NOT EXISTS apex_purchases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL, amount_gbp numeric(10,2) NOT NULL,
  category text, purchase_date date DEFAULT CURRENT_DATE,
  notes text, created_at timestamptz DEFAULT now()
);
CREATE TABLE IF NOT EXISTS apex_social_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  platform text NOT NULL, username text, status text DEFAULT 'active',
  notes text, created_at timestamptz DEFAULT now()
);
CREATE TABLE IF NOT EXISTS apex_social_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid REFERENCES apex_social_accounts(id) ON DELETE CASCADE,
  platform text, content text, status text DEFAULT 'draft',
  scheduled_at timestamptz, posted_at timestamptz,
  metrics jsonb DEFAULT '{}', created_at timestamptz DEFAULT now()
);
`;

async function runLifeDomainMigration() {
    const supabaseUrl  = process.env.SUPABASE_URL;
    const accessToken  = process.env.SUPABASE_ACCESS_TOKEN;

    if (!supabaseUrl || !accessToken) {
        logger.warn('db-migrate', 'skipped — SUPABASE_URL or SUPABASE_ACCESS_TOKEN not set');
        return;
    }

    const refMatch = supabaseUrl.match(/https:\/\/([a-z0-9]+)\.supabase\.co/);
    if (!refMatch) {
        logger.warn('db-migrate', 'could not extract project ref from SUPABASE_URL');
        return;
    }
    const projectRef = refMatch[1];

    try {
        const res = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ query: LIFE_DOMAIN_SQL }),
        });

        if (!res.ok) {
            const body = await res.text().catch(() => '');
            logger.warn('db-migrate', 'life-domain migration failed', { status: res.status, body: body.slice(0, 200) });
            return;
        }

        logger.info('db-migrate', 'life-domain tables ensured (18 tables)');
    } catch (e) {
        logger.warn('db-migrate', 'life-domain migration error', { error: e.message });
    }
}

module.exports = { runLifeDomainMigration };
