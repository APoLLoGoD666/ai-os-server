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

// ─── DOMAIN TABLE INSERTERS ───────────────────────────────────────────────────

async function insertApexTransactions(datasetId) {
  const rows = g.generateApexTransactions(datasetId);
  if (!rows.length) return 0;
  const sb = _supabase();
  await sb.from('apex_transactions').delete().like('description', '[SYNTHETIC]%');
  const { error } = await sb.from('apex_transactions').insert(rows);
  if (error) throw new Error(`apex_transactions insert failed: ${error.message}`);
  return rows.length;
}

async function insertApexInvoices(datasetId) {
  const rows = g.generateApexInvoices(datasetId);
  if (!rows.length) return 0;
  const sb = _supabase();
  await sb.from('apex_invoices').delete().like('title', '[SYNTHETIC]%');
  const { error } = await sb.from('apex_invoices').insert(rows);
  if (error) throw new Error(`apex_invoices insert failed: ${error.message}`);
  return rows.length;
}

async function insertHealthRecords(datasetId) {
  const { workouts, nutritionLogs, sleepLogs, bodyMeasurements } = g.generateHealthRecords(datasetId);
  if (!workouts.length) return { workouts: 0, nutritionLogs: 0, sleepLogs: 0, bodyMeasurements: 0 };
  const sb = _supabase();

  await sb.from('apex_workouts').delete().like('notes', '[SYNTHETIC]%');
  const { error: e1 } = await sb.from('apex_workouts').insert(workouts);
  if (e1) throw new Error(`apex_workouts insert failed: ${e1.message}`);

  await sb.from('apex_nutrition_log').delete().like('food_name', '[SYNTHETIC]%');
  const { error: e2 } = await sb.from('apex_nutrition_log').insert(nutritionLogs);
  if (e2) throw new Error(`apex_nutrition_log insert failed: ${e2.message}`);

  await sb.from('apex_sleep_log').delete().like('notes', '[SYNTHETIC]%');
  const { error: e3 } = await sb.from('apex_sleep_log').upsert(sleepLogs, { onConflict: 'date' });
  if (e3) throw new Error(`apex_sleep_log upsert failed: ${e3.message}`);

  await sb.from('apex_body_measurements').delete().like('notes', '[SYNTHETIC]%');
  const { error: e4 } = await sb.from('apex_body_measurements').insert(bodyMeasurements);
  if (e4) throw new Error(`apex_body_measurements insert failed: ${e4.message}`);

  return { workouts: workouts.length, nutritionLogs: nutritionLogs.length, sleepLogs: sleepLogs.length, bodyMeasurements: bodyMeasurements.length };
}

async function insertMoodLogs(datasetId) {
  const rows = g.generateMoodLogs(datasetId);
  if (!rows.length) return 0;
  const sb = _supabase();
  const dates = rows.map(r => r.date);
  await sb.from('apex_mood_log').delete().in('date', dates);
  const { error } = await sb.from('apex_mood_log').upsert(rows.map(({ synthetic, dataset_id, removable, source, ...rest }) => rest), { onConflict: 'date' });
  if (error) throw new Error(`apex_mood_log upsert failed: ${error.message}`);
  return rows.length;
}

async function insertSupplements(datasetId) {
  const rows = g.generateSupplements(datasetId);
  if (!rows.length) return 0;
  const sb = _supabase();
  await sb.from('apex_supplements').delete().like('name', '[SYNTHETIC]%');
  const { error } = await sb.from('apex_supplements').insert(rows.map(({ synthetic, dataset_id, removable, source, ...rest }) => rest));
  if (error) throw new Error(`apex_supplements insert failed: ${error.message}`);
  return rows.length;
}

async function insertJournalRecords(datasetId) {
  const { journalEntries, habits } = g.generateJournalRecords(datasetId);
  if (!journalEntries.length) return { journalEntries: 0, habits: 0 };
  const sb = _supabase();

  await sb.from('apex_journal_entries').delete().like('entry_text', '[SYNTHETIC]%');
  const { error: e1 } = await sb.from('apex_journal_entries').insert(journalEntries.map(({ synthetic, dataset_id, removable, source, ...rest }) => rest));
  if (e1) throw new Error(`apex_journal_entries insert failed: ${e1.message}`);

  await sb.from('apex_habits').delete().like('habit_name', '[SYNTHETIC]%');
  const { error: e2 } = await sb.from('apex_habits').insert(habits.map(({ synthetic, dataset_id, removable, source, ...rest }) => rest));
  if (e2) throw new Error(`apex_habits insert failed: ${e2.message}`);

  return { journalEntries: journalEntries.length, habits: habits.length };
}

async function insertSpiritualRecords(datasetId) {
  const rows = g.generateSpiritualRecords(datasetId);
  if (!rows.length) return 0;
  const sb = _supabase();
  await sb.from('apex_spiritual_sessions').delete().like('notes', '[SYNTHETIC]%');
  const { error } = await sb.from('apex_spiritual_sessions').insert(rows.map(({ synthetic, dataset_id, removable, source, ...rest }) => rest));
  if (error) throw new Error(`apex_spiritual_sessions insert failed: ${error.message}`);
  return rows.length;
}

async function insertUniversityRecords(datasetId) {
  const { modules, assignments, flashcards, readingList } = g.generateUniversityRecords(datasetId);
  if (!modules.length) return { modules: 0, assignments: 0, flashcards: 0, readingList: 0 };
  const sb = _supabase();

  await sb.from('apex_university_modules').delete().like('name', '[SYNTHETIC]%');
  const { error: e1 } = await sb.from('apex_university_modules').insert(modules.map(({ synthetic, dataset_id, removable, source, ...rest }) => rest));
  if (e1) throw new Error(`apex_university_modules insert failed: ${e1.message}`);

  await sb.from('apex_university_assignments').delete().like('title', '[SYNTHETIC]%');
  const { error: e2 } = await sb.from('apex_university_assignments').insert(assignments.map(({ synthetic, dataset_id, removable, source, ...rest }) => rest));
  if (e2) throw new Error(`apex_university_assignments insert failed: ${e2.message}`);

  await sb.from('apex_university_flashcards').delete().like('front', '[SYNTHETIC]%');
  const { error: e3 } = await sb.from('apex_university_flashcards').insert(flashcards.map(({ synthetic, dataset_id, removable, source, ...rest }) => rest));
  if (e3) throw new Error(`apex_university_flashcards insert failed: ${e3.message}`);

  await sb.from('apex_reading_list').delete().like('title', '[SYNTHETIC]%');
  const { error: e4 } = await sb.from('apex_reading_list').insert(readingList.map(({ synthetic, dataset_id, removable, source, ...rest }) => rest));
  if (e4) throw new Error(`apex_reading_list insert failed: ${e4.message}`);

  return { modules: modules.length, assignments: assignments.length, flashcards: flashcards.length, readingList: readingList.length };
}

async function insertContacts(datasetId) {
  const rows = g.generateContactRecords(datasetId);
  if (!rows.length) return 0;
  const sb = _supabase();
  await sb.from('apex_contacts').delete().like('name', '[SYNTHETIC]%');
  const { error } = await sb.from('apex_contacts').insert(rows.map(({ synthetic, dataset_id, removable, source, ...rest }) => rest));
  if (error) throw new Error(`apex_contacts insert failed: ${error.message}`);
  return rows.length;
}

async function insertSubscriptions(datasetId) {
  const rows = g.generateSubscriptions(datasetId);
  if (!rows.length) return 0;
  const sb = _supabase();
  await sb.from('apex_subscriptions').delete().like('name', '[SYNTHETIC]%');
  const { error } = await sb.from('apex_subscriptions').insert(rows.map(({ synthetic, dataset_id, removable, source, ...rest }) => rest));
  if (error) throw new Error(`apex_subscriptions insert failed: ${error.message}`);
  return rows.length;
}

async function insertInvestments(datasetId) {
  const rows = g.generateInvestments(datasetId);
  if (!rows.length) return 0;
  const sb = _supabase();
  await sb.from('apex_investments').delete().like('name', '[SYNTHETIC]%');
  const { error } = await sb.from('apex_investments').insert(rows.map(({ synthetic, dataset_id, removable, source, ...rest }) => rest));
  if (error) throw new Error(`apex_investments insert failed: ${error.message}`);
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
      r.chatHistory      = await writeChatHistory(datasetId);
      r.projects         = await writeProjectArchives(datasetId);
      r.transactions     = await insertTransactions(datasetId);
      r.invoices         = await insertInvoices(datasetId);
      r.emailThreads     = await insertEmailThreads(datasetId);
      r.apexTransactions = await insertApexTransactions(datasetId);
      r.apexInvoices     = await insertApexInvoices(datasetId);
      r.health           = await insertHealthRecords(datasetId);
      r.mood             = await insertMoodLogs(datasetId);
      r.supplements      = await insertSupplements(datasetId);
      r.journal          = await insertJournalRecords(datasetId);
      r.spiritual        = await insertSpiritualRecords(datasetId);
      r.university       = await insertUniversityRecords(datasetId);
      r.contacts         = await insertContacts(datasetId);
      r.subscriptions    = await insertSubscriptions(datasetId);
      r.investments      = await insertInvestments(datasetId);
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
  insertApexTransactions, insertApexInvoices,
  insertHealthRecords, insertMoodLogs, insertSupplements,
  insertJournalRecords, insertSpiritualRecords, insertUniversityRecords,
  insertContacts, insertSubscriptions, insertInvestments,
};
