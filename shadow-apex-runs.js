'use strict';
require('dotenv').config({ path: '.env' });
const { createClient } = require('@supabase/supabase-js');
const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

// Insert 15 shadow runs into apex_agent_runs to match the episode corpus
const now = Date.now();
const runs = [
  { task_id:'shadow-run-001', objective:"[SHADOW] Implement rate limiting middleware for API endpoints", success:true,  cost_usd:0.023, complexity:'moderate', created_at: new Date(now - 5*3600000).toISOString() },
  { task_id:'shadow-run-002', objective:"[SHADOW] Add pagination to user activity feed query",           success:true,  cost_usd:0.008, complexity:'simple',   created_at: new Date(now - 4.75*3600000).toISOString() },
  { task_id:'shadow-run-003', objective:"[SHADOW] Refactor invoice PDF generation to use templates",     success:true,  cost_usd:0.071, complexity:'complex',  created_at: new Date(now - 4.5*3600000).toISOString() },
  { task_id:'shadow-run-004', objective:"[SHADOW] Set up nightly backup cron job for Supabase data",     success:true,  cost_usd:0.019, complexity:'moderate', created_at: new Date(now - 4.25*3600000).toISOString() },
  { task_id:'shadow-run-005', objective:"[SHADOW] Build email digest scheduler with retry logic",        success:true,  cost_usd:0.034, complexity:'moderate', created_at: new Date(now - 4*3600000).toISOString() },
  { task_id:'shadow-run-006', objective:"[SHADOW] Add role-based access control to admin routes",        success:true,  cost_usd:0.055, complexity:'complex',  created_at: new Date(now - 3.75*3600000).toISOString() },
  { task_id:'shadow-run-007', objective:"[SHADOW] Implement WebSocket reconnection with exponential backoff", success:true, cost_usd:0.028, complexity:'moderate', created_at: new Date(now - 3.5*3600000).toISOString() },
  { task_id:'shadow-run-008', objective:"[SHADOW] Create Postgres index on email_threads sender column", success:true,  cost_usd:0.006, complexity:'simple',   created_at: new Date(now - 3.25*3600000).toISOString() },
  { task_id:'shadow-run-009', objective:"[SHADOW] Extract invoice line items into separate database table", success:true, cost_usd:0.082, complexity:'complex',  created_at: new Date(now - 3*3600000).toISOString() },
  { task_id:'shadow-run-010', objective:"[SHADOW] Deploy health check endpoint returning service status JSON", success:true, cost_usd:0.007, complexity:'simple', created_at: new Date(now - 2.75*3600000).toISOString() },
  { task_id:'shadow-run-011', objective:"[SHADOW] Migrate sessions from Redis to Postgres with zero downtime", success:false, cost_usd:0.091, complexity:'critical', created_at: new Date(now - 2.5*3600000).toISOString() },
  { task_id:'shadow-run-012', objective:"[SHADOW] Build real-time dashboard widget for active user count", success:false, cost_usd:0.042, complexity:'moderate', created_at: new Date(now - 2.25*3600000).toISOString() },
  { task_id:'shadow-run-013', objective:"[SHADOW] Add full-text search index on Supabase invoices table", success:false, cost_usd:0.038, complexity:'moderate', created_at: new Date(now - 2*3600000).toISOString() },
  { task_id:'shadow-run-014', objective:"[SHADOW] Implement two-factor authentication via TOTP",          success:false, cost_usd:0.067, complexity:'complex',  created_at: new Date(now - 1.75*3600000).toISOString() },
  { task_id:'shadow-run-015', objective:"[SHADOW] Refactor agent orchestrator to support parallel stage execution", success:false, cost_usd:0.103, complexity:'critical', created_at: new Date(now - 1.5*3600000).toISOString() },
];

async function run() {
  const t = Date.now();
  const { error } = await sb.from('apex_agent_runs').insert(runs);
  const ms = Date.now() - t;
  console.log(JSON.stringify({ inserted: runs.length, ms, error: error?.message || null }));
}
run().catch(e => console.error('ERR:', e.message));
