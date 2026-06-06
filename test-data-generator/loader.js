'use strict';
const fs = require('fs').promises;
const path = require('path');
const { PATHS, DATASET_IDS } = require('./config');
const g = require('./generators');
const { createClient } = require('@supabase/supabase-js');

let _sb = null;
function _supabase() {
  if (!_sb) {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) throw new Error('SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY not set in .env');
    _sb = createClient(url, key);
  }
  return _sb;
}

async function _ensureDir(dir) {
  await fs.mkdir(dir, { recursive: true });
}

// ─── VAULT WRITERS ────────────────────────────────────────────────────────────

async function writeEpisodes(datasetId) {
  await _ensureDir(PATHS.EPISODES_DIR);
  const episodes = g.generateEpisodes(datasetId);
  let written = 0;
  for (const ep of episodes) {
    const file = path.join(PATHS.EPISODES_DIR, `ep-${ep.id}.json`);
    await fs.writeFile(file, JSON.stringify(ep, null, 2), 'utf8');
    written++;
  }
  return written;
}

async function writeGoals(datasetId) {
  await _ensureDir(PATHS.GOALS_DIR);
  const goals = g.generateGoals(datasetId);
  let written = 0;
  for (const goal of goals) {
    const file = path.join(PATHS.GOALS_DIR, `${goal.id}.json`);
    await fs.writeFile(file, JSON.stringify(goal, null, 2), 'utf8');
    written++;
  }
  return written;
}

async function writePlanRecords(datasetId) {
  const records = g.generatePlanRecords(datasetId);
  if (!records.length) return 0;

  await _ensureDir(path.dirname(PATHS.PLAN_QUALITY_FILE));

  let existing = { version: '1.0', generatedAt: new Date().toISOString(), totalRecords: 0, records: [] };
  try {
    const raw = await fs.readFile(PATHS.PLAN_QUALITY_FILE, 'utf8');
    existing = JSON.parse(raw);
  } catch (_) { /* file doesn't exist yet */ }

  const existingIds = new Set((existing.records || []).map(r => r.planId));
  const newRecords = records.filter(r => !existingIds.has(r.planId));

  existing.records = [...(existing.records || []), ...newRecords];
  existing.totalRecords = existing.records.length;
  existing.generatedAt = new Date().toISOString();

  await fs.writeFile(PATHS.PLAN_QUALITY_FILE, JSON.stringify(existing, null, 2), 'utf8');
  return newRecords.length;
}

async function writeLessons(datasetId) {
  const lessons = g.generateLessons(datasetId);
  if (!lessons.length) return 0;

  await _ensureDir(path.dirname(PATHS.LESSONS_FILE));

  let content = '';
  try {
    content = await fs.readFile(PATHS.LESSONS_FILE, 'utf8');
  } catch (_) {
    content = '# Lessons\n\nNone yet.\n';
  }

  const beginMarker = `<!-- SYNTHETIC-BEGIN:${datasetId} -->`;
  const endMarker = `<!-- SYNTHETIC-END:${datasetId} -->`;

  if (content.includes(beginMarker)) {
    return 0; // already loaded — skip (idempotent)
  }

  const block = [
    '',
    beginMarker,
    '',
    ...lessons.map(l => `---\n${l}`),
    '',
    endMarker,
    '',
  ].join('\n');

  await fs.appendFile(PATHS.LESSONS_FILE, block, 'utf8');
  return lessons.length;
}

async function writeChatHistory(datasetId) {
  const chats = g.generateChatHistory(datasetId);
  if (!chats.length) return 0;

  await _ensureDir(PATHS.CONVERSATIONS_DIR);
  let written = 0;
  for (const chat of chats) {
    const fm = chat.frontmatter;
    const fmLines = Object.entries(fm).map(([k, v]) => `${k}: ${v}`).join('\n');
    const fileContent = `---\n${fmLines}\n---\n\n${chat.content}`;
    await fs.writeFile(path.join(PATHS.CONVERSATIONS_DIR, chat.filename), fileContent, 'utf8');
    written++;
  }
  return written;
}

async function writeProjectArchives(datasetId) {
  const projects = g.generateProjectArchives(datasetId);
  if (!projects.length) return 0;

  await _ensureDir(PATHS.PROJECTS_ARCHIVE);
  await _ensureDir(PATHS.PROJECTS_ACTIVE);
  let written = 0;
  for (const proj of projects) {
    const dir = proj.location === 'Active' ? PATHS.PROJECTS_ACTIVE : PATHS.PROJECTS_ARCHIVE;
    const fm = proj.frontmatter;
    const fmLines = Object.entries(fm).map(([k, v]) => v == null ? null : `${k}: ${v}`).filter(Boolean).join('\n');
    const fileContent = `---\n${fmLines}\n---\n\n${proj.content}`;
    await fs.writeFile(path.join(dir, proj.filename), fileContent, 'utf8');
    written++;
  }
  return written;
}

// ─── SUPABASE WRITERS ─────────────────────────────────────────────────────────

async function insertAgentRuns(datasetId) {
  const rows = g.generateAgentRuns(datasetId);
  if (!rows.length) return 0;

  const sb = _supabase();
  const dbRows = rows.map(r => ({
    task_id:       r.task_id,
    objective:     r.objective,
    success:       r.success,
    cost_usd:      r.cost_usd,
    complexity:    r.complexity,
    agent_summary: r.agent_summary,
    created_at:    r.created_at,
  }));

  // upsert — idempotent on task_id
  const { error } = await sb.from('apex_agent_runs').upsert(dbRows, { onConflict: 'task_id' });
  if (error) throw new Error(`apex_agent_runs insert failed: ${error.message}`);
  return dbRows.length;
}

async function insertTransactions(datasetId) {
  const { transactions } = g.generateFinancialRecords(datasetId);
  if (!transactions.length) return 0;

  const sb = _supabase();
  const rows = transactions.map(t => ({
    date:        (t.date || '').split('T')[0],
    description: t.description,
    amount:      t.amount,
    type:        t.type,
    category:    t.category,
    source:      t.source || 'synthetic',
  }));

  // delete-then-insert for idempotency
  await sb.from('transactions').delete().like('description', '[SYNTHETIC]%');
  const { error } = await sb.from('transactions').insert(rows);
  if (error) throw new Error(`transactions insert failed: ${error.message}`);
  return rows.length;
}

async function insertInvoices(datasetId) {
  const { invoices } = g.generateFinancialRecords(datasetId);
  if (!invoices.length) return 0;

  const sb = _supabase();
  const rows = invoices.map(inv => ({
    client_name:    inv.client_name,
    client_email:   inv.client_email,
    amount:         inv.amount,
    currency:       inv.currency,
    status:         inv.status,
    due_date:       inv.due_date,
    items:          inv.items,
    invoice_number: inv.invoice_number,
  }));

  await sb.from('invoices').delete().like('invoice_number', 'SYNTH-%');
  const { error } = await sb.from('invoices').insert(rows);
  if (error) throw new Error(`invoices insert failed: ${error.message}`);
  return rows.length;
}

async function insertEmailThreads(datasetId) {
  const threads = g.generateEmailThreads(datasetId);
  if (!threads.length) return 0;

  const sb = _supabase();
  const rows = threads.map(t => ({
    thread_id:  t.thread_id,
    subject:    t.subject,
    sender:     t.sender,
    recipient:  Array.isArray(t.recipients) ? t.recipients[0] : (t.recipients || null),
    body:       t.body,
    summary:    t.snippet,
    labels:     t.labels,
  }));

  await sb.from('email_threads').delete().like('thread_id', 'synth-thread-%');
  const { error } = await sb.from('email_threads').insert(rows);
  if (error) throw new Error(`email_threads insert failed: ${error.message}`);
  return rows.length;
}

// ─── TIER LOADERS ─────────────────────────────────────────────────────────────

async function loadTier(tierNum) {
  const results = {};

  const tiers = tierNum === 1 ? [DATASET_IDS.TIER1]
              : tierNum === 2 ? [DATASET_IDS.TIER1, DATASET_IDS.TIER2]
              :                  [DATASET_IDS.TIER1, DATASET_IDS.TIER2, DATASET_IDS.TIER3];

  for (const datasetId of tiers) {
    console.log(`\n  Loading ${datasetId}...`);
    const r = {};

    r.episodes     = await writeEpisodes(datasetId);
    r.goals        = await writeGoals(datasetId);
    r.planRecords  = await writePlanRecords(datasetId);
    r.lessons      = await writeLessons(datasetId);
    r.agentRuns    = await insertAgentRuns(datasetId);

    if (datasetId === DATASET_IDS.TIER3) {
      r.chatHistory   = await writeChatHistory(datasetId);
      r.projects      = await writeProjectArchives(datasetId);
      r.transactions  = await insertTransactions(datasetId);
      r.invoices      = await insertInvoices(datasetId);
      r.emailThreads  = await insertEmailThreads(datasetId);
    }

    results[datasetId] = r;
    console.log(`  ${datasetId}:`, r);
  }

  return results;
}

module.exports = {
  loadTier,
  writeEpisodes, writeGoals, writePlanRecords, writeLessons,
  writeChatHistory, writeProjectArchives,
  insertAgentRuns, insertTransactions, insertInvoices, insertEmailThreads,
};
