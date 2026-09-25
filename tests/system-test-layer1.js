'use strict';
// APEX System Test — Layer 1: Infrastructure
process.env.NODE_ENV = 'test';
require('dotenv').config();

const PASS = (label) => console.log(`  ✓ ${label}`);
const FAIL = (label, err) => { console.error(`  ✗ ${label}: ${err?.message || err}`); process.exitCode = 1; };

async function run() {
  console.log('\n=== LAYER 1: INFRASTRUCTURE ===\n');

  // 1.1 Env vars
  {
    const required = ['ANTHROPIC_API_KEY','SUPABASE_URL','SUPABASE_SERVICE_ROLE_KEY','DATABASE_URL','AGENT_SECRET','CRON_SECRET'];
    const missing = required.filter(k => !process.env[k]);
    missing.length === 0 ? PASS('1.1 Required env vars present') : FAIL('1.1 Missing env vars', new Error(missing.join(', ')));
  }

  // 1.2 Logger
  try {
    const logger = require('../lib/logger');
    typeof logger.debug === 'function' ? PASS('1.2 Logger loads') : FAIL('1.2 Logger missing debug()', new Error('no debug fn'));
  } catch(e) { FAIL('1.2 Logger', e); }

  // 1.3 Supabase client connects + query
  try {
    const { getSupabaseClient } = require('../lib/clients');
    const sb = getSupabaseClient();
    const { data, error } = await sb.from('apex_tasks').select('id').limit(1);
    if (error) throw new Error(error.message);
    PASS(`1.3 Supabase connects (apex_tasks readable, ${data?.length ?? 0} rows sampled)`);
  } catch(e) { FAIL('1.3 Supabase connect', e); }

  // 1.4 Required tables exist
  try {
    const { getSupabaseClient } = require('../lib/clients');
    const sb = getSupabaseClient();
    const required = ['memory','documents','agent_tasks','apex_agent_runs','apex_agent_stages','notifications','apex_lessons','cron_logs'];
    const missing = [];
    for (const t of required) {
      const { error } = await sb.from(t).select('*').limit(0);
      if (error?.code === 'PGRST205' || (error?.message||'').includes('does not exist')) missing.push(t);
    }
    missing.length === 0
      ? PASS(`1.4 All ${required.length} required tables present`)
      : FAIL('1.4 Missing tables', new Error(missing.join(', ')));
  } catch(e) { FAIL('1.4 Table check', e); }

  // 1.5 Anthropic API key valid (models list, no inference cost)
  try {
    const https = require('https');
    await new Promise((resolve, reject) => {
      const req = https.request({
        hostname: 'api.anthropic.com',
        path: '/v1/models',
        method: 'GET',
        headers: { 'x-api-key': process.env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' }
      }, res => {
        let d = '';
        res.on('data', c => d += c);
        res.on('end', () => res.statusCode === 200 ? resolve(d) : reject(new Error(`HTTP ${res.statusCode}: ${d.slice(0,100)}`)));
      });
      req.on('error', reject);
      req.end();
    });
    PASS('1.5 Anthropic API key valid');
  } catch(e) { FAIL('1.5 Anthropic API', e); }

  // 1.6 Event bus — emit + receive
  try {
    const bus = require('../lib/event-bus');
    let received = false;
    bus.on('AGENT_STARTED', (ev) => { received = ev?.payload?.task_id === 'test-1.6'; });
    bus.emitSync('AGENT_STARTED', { task_id: 'test-1.6' });
    received ? PASS('1.6 Event bus emit/receive works') : FAIL('1.6 Event bus', new Error('listener did not fire'));
  } catch(e) { FAIL('1.6 Event bus', e); }

  // 1.7 PG pool connects
  try {
    const pg = require('../lib/pg_database');
    const res = await pg.query('SELECT 1 AS ok');
    res.rows[0]?.ok == 1 ? PASS('1.7 PG pool connects') : FAIL('1.7 PG pool', new Error('unexpected result'));
  } catch(e) { FAIL('1.7 PG pool', e); }

  console.log('\n--- Layer 1 done ---\n');
}

run().catch(e => { console.error('FATAL:', e); process.exit(1); });
