'use strict';
// scripts/seed-beta-user.js — Seeds synthetic data for the BETA test user.
// Run AFTER migration 093: node scripts/seed-beta-user.js
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const BETA_UUID = '00000000-0000-4000-8000-000000000002';
const sb = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY
);

const today     = new Date().toISOString().split('T')[0];
const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
const weekAgo   = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0];

async function seed(table, rows) {
  const tagged = rows.map(r => ({ ...r, human_id: BETA_UUID }));
  const { error } = await sb.from(table).insert(tagged);
  if (error) console.warn(`  ⚠  ${table}: ${error.message}`);
  else       console.log(`  ✓  ${table} — ${rows.length} rows`);
}

async function run() {
  console.log(`\nSeeding beta user ${BETA_UUID}...\n`);

  // Finance — apex_transactions
  await seed('apex_transactions', [
    { description: 'Freelance invoice — client A', amount: 1200,  type: 'income',  category: 'freelance',    date: weekAgo },
    { description: 'Freelance invoice — client B', amount: 850,   type: 'income',  category: 'freelance',    date: yesterday },
    { description: 'AWS hosting',                  amount: 45.99, type: 'expense', category: 'tech',         date: weekAgo },
    { description: 'Figma subscription',           amount: 12,    type: 'expense', category: 'software',     date: yesterday },
    { description: 'Groceries',                    amount: 78.50, type: 'expense', category: 'food',         date: today },
    { description: 'Transport — monthly pass',     amount: 60,    type: 'expense', category: 'transport',    date: weekAgo },
    { description: 'Notion Pro',                   amount: 8,     type: 'expense', category: 'software',     date: yesterday },
  ]);

  // Finance — transactions (legacy table used by src/routes/finance.js)
  await seed('transactions', [
    { description: 'Freelance income', amount: 1200,  type: 'income',  category: 'freelance', date: weekAgo,   created_at: new Date().toISOString() },
    { description: 'Software tools',  amount: 57.99, type: 'expense', category: 'software',  date: yesterday, created_at: new Date().toISOString() },
    { description: 'Groceries',       amount: 78.50, type: 'expense', category: 'food',      date: today,     created_at: new Date().toISOString() },
  ]);

  // Finance — apex_invoices
  await seed('apex_invoices', [
    { title: 'Website build — TechCorp',    amount: 2500, client_name: 'TechCorp',    status: 'unpaid', due_date: new Date(Date.now() + 7*86400000).toISOString().split('T')[0] },
    { title: 'Brand identity — StartupXYZ', amount: 1800, client_name: 'StartupXYZ', status: 'paid',   due_date: yesterday },
    { title: 'Consulting retainer — Q3',    amount: 800,  client_name: 'AlphaCo',    status: 'sent',   due_date: today },
  ]);

  // Finance — apex_subscriptions
  await seed('apex_subscriptions', [
    { name: 'Claude Pro',      amount: 20,    billing_cycle: 'monthly', category: 'ai',       active: true, next_billing_date: new Date(Date.now() + 20*86400000).toISOString().split('T')[0] },
    { name: 'GitHub Pro',      amount: 4,     billing_cycle: 'monthly', category: 'dev',      active: true, next_billing_date: new Date(Date.now() + 14*86400000).toISOString().split('T')[0] },
    { name: 'Figma',           amount: 12,    billing_cycle: 'monthly', category: 'design',   active: true, next_billing_date: new Date(Date.now() + 10*86400000).toISOString().split('T')[0] },
    { name: 'AWS',             amount: 45.99, billing_cycle: 'monthly', category: 'hosting',  active: true, next_billing_date: new Date(Date.now() + 5*86400000).toISOString().split('T')[0] },
  ]);

  // Finance — apex_investments
  await seed('apex_investments', [
    { name: 'FTSE All-World ETF', type: 'ETF',    amount: 5000, current_value: 5340, platform: 'Vanguard',  notes: 'Core index holding' },
    { name: 'S&P 500 ETF',       type: 'ETF',    amount: 3000, current_value: 3210, platform: 'Vanguard',  notes: 'US exposure' },
    { name: 'Bitcoin',            type: 'crypto', amount: 1000, current_value: 1180, platform: 'Coinbase',  notes: 'Small speculative position' },
  ]);

  // Health — apex_nutrition_log
  await seed('apex_nutrition_log', [
    { log_date: today,     calories: 2150, protein_g: 140, carbs_g: 220, fat_g: 75, notes: 'Good macros day' },
    { log_date: yesterday, calories: 1980, protein_g: 125, carbs_g: 195, fat_g: 70, notes: 'Light training day' },
    { log_date: weekAgo,   calories: 2300, protein_g: 150, carbs_g: 240, fat_g: 80, notes: 'Heavy workout — surplus' },
  ]);

  // Health — apex_sleep_log
  await seed('apex_sleep_log', [
    { date: yesterday, hours: 7.5, quality_score: 8, notes: 'Felt well rested' },
    { date: weekAgo,   hours: 6.5, quality_score: 6, notes: 'Late night coding session' },
  ]);

  // Health — apex_workouts
  await seed('apex_workouts', [
    { type: 'Strength',  duration_minutes: 60, workout_date: today,     notes: 'Push day — bench, OHP, triceps' },
    { type: 'Running',   duration_minutes: 35, workout_date: yesterday, notes: '5k easy pace' },
    { type: 'Strength',  duration_minutes: 55, workout_date: weekAgo,   notes: 'Pull day — deadlift, rows' },
  ]);

  // Journal — apex_journal_entries
  await seed('apex_journal_entries', [
    { entry_text: 'Big progress on APEX today — the council deliberation system is genuinely impressive. Feeling motivated to push the identity architecture forward. Focus is high.',        mood_score: 8, created_at: new Date().toISOString() },
    { entry_text: 'Bit scattered this morning but recovered. Completed the finance module and seeder. Starting to see the vision of a full personal OS coming together.',                      mood_score: 7, created_at: new Date(Date.now() - 86400000).toISOString() },
    { entry_text: 'Reflected on long-term goals. APEX is the foundation for everything — the executive council gives me leverage to think at scale. Need to stay consistent.',                mood_score: 9, created_at: new Date(Date.now() - 2*86400000).toISOString() },
  ]);

  // University — apex_university_assignments
  await seed('apex_university_assignments', [
    { title: 'Data Structures coursework — B-tree implementation', due_date: new Date(Date.now() + 5*86400000).toISOString().split('T')[0],  completed: false },
    { title: 'Algorithms — dynamic programming problem set',       due_date: new Date(Date.now() + 10*86400000).toISOString().split('T')[0], completed: false },
    { title: 'Systems design essay — distributed caching',         due_date: new Date(Date.now() + 18*86400000).toISOString().split('T')[0], completed: false },
    { title: 'Database module — SQL optimisation lab',             due_date: yesterday,                                                       completed: true  },
  ]);

  // Notifications for beta user
  await seed('apex_notifications', [
    { message: 'Invoice due in 7 days — TechCorp £2,500',                          type: 'finance',  read: false, created_at: new Date().toISOString() },
    { message: 'Assignment due in 5 days — Data Structures coursework',            type: 'academic', read: false, created_at: new Date().toISOString() },
    { message: 'Weekly fitness goal on track — 3 workouts completed',              type: 'health',   read: false, created_at: new Date().toISOString() },
    { message: 'APEX council deliberated 2 strategic questions this week',         type: 'system',   read: true,  created_at: new Date(Date.now() - 86400000).toISOString() },
  ]);

  // Tasks for beta user
  await seed('apex_tasks', [
    { title: 'Complete APEX identity architecture',       status: 'in_progress', priority: 'high',   created_at: new Date().toISOString() },
    { title: 'Submit university data structures work',    status: 'pending',     priority: 'high',   created_at: new Date().toISOString() },
    { title: 'Follow up with TechCorp on invoice',       status: 'pending',     priority: 'medium', created_at: new Date().toISOString() },
    { title: 'Review investment portfolio performance',   status: 'pending',     priority: 'low',    created_at: new Date().toISOString() },
    { title: 'Write weekly journal reflection',           status: 'completed',   priority: 'medium', created_at: new Date(Date.now() - 86400000).toISOString() },
  ]);

  console.log('\nDone. Beta user data seeded.\n');
}

run().catch(e => { console.error(e); process.exit(1); });
