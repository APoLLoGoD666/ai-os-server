'use strict';
const fs = require('fs').promises;
const path = require('path');
const { PATHS, DATASET_IDS } = require('./config');
const { createClient } = require('@supabase/supabase-js');

let _sb = null;
function _supabase() {
  if (!_sb) {
    _sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  }
  return _sb;
}

async function _removeMatchingFiles(dir, prefixOrFn) {
  let removed = 0;
  try {
    const files = await fs.readdir(dir);
    for (const f of files) {
      const match = typeof prefixOrFn === 'function' ? prefixOrFn(f) : f.startsWith(prefixOrFn);
      if (match) {
        await fs.unlink(path.join(dir, f));
        removed++;
      }
    }
  } catch (_) { /* dir doesn't exist */ }
  return removed;
}

async function _cleanLessonsFile(datasetId) {
  let content = '';
  try {
    content = await fs.readFile(PATHS.LESSONS_FILE, 'utf8');
  } catch (_) {
    return 0; // file doesn't exist — nothing to clean
  }

  const targets = datasetId === 'all'
    ? Object.values(DATASET_IDS)
    : [datasetId];

  let changed = false;
  let removed = 0;
  for (const id of targets) {
    const begin = `<!-- SYNTHETIC-BEGIN:${id} -->`;
    const end   = `<!-- SYNTHETIC-END:${id} -->`;
    const re    = new RegExp(`\\n*${_escapeRe(begin)}[\\s\\S]*?${_escapeRe(end)}\\n*`, 'g');
    const newContent = content.replace(re, '\n');
    if (newContent !== content) {
      content = newContent;
      changed = true;
      removed++;
    }
  }

  if (changed) {
    await fs.writeFile(PATHS.LESSONS_FILE, content, 'utf8');
  }
  return removed;
}

function _escapeRe(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function _cleanPlanRegistry(datasetId) {
  let registry = null;
  try {
    registry = JSON.parse(await fs.readFile(PATHS.PLAN_QUALITY_FILE, 'utf8'));
  } catch (_) {
    return 0;
  }

  const before = (registry.records || []).length;
  registry.records = (registry.records || []).filter(r => {
    if (datasetId === 'all') return r.synthetic !== true;
    return !(r.synthetic === true && r.dataset_id === datasetId);
  });
  const removed = before - registry.records.length;
  registry.totalRecords = registry.records.length;
  registry.generatedAt  = new Date().toISOString();

  await fs.writeFile(PATHS.PLAN_QUALITY_FILE, JSON.stringify(registry, null, 2), 'utf8');
  return removed;
}

async function _cleanSupabase(datasetId) {
  const sb = _supabase();
  const results = {};

  const runPattern     = datasetId === 'all' ? 'synth-%' : `synth-${datasetId}-%`;
  const emailPattern   = datasetId === 'all' ? 'synth-thread-%' : `synth-thread-${datasetId}-%`;

  const { error: e1 } = await sb.from('apex_agent_runs').delete().like('task_id', runPattern);
  results.agentRuns = e1 ? `ERROR: ${e1.message}` : 'ok';

  // Transactions and invoices only exist for sdv1-scale / 'all'
  if (datasetId === 'all' || datasetId === DATASET_IDS.TIER3) {
    const { error: e2 } = await sb.from('transactions').delete().like('description', '[SYNTHETIC]%');
    results.transactions = e2 ? `ERROR: ${e2.message}` : 'ok';

    const { error: e3 } = await sb.from('invoices').delete().like('invoice_number', 'SYNTH-%');
    results.invoices = e3 ? `ERROR: ${e3.message}` : 'ok';
  }

  if (datasetId === 'all' || datasetId === DATASET_IDS.TIER3) {
    const { error: e4 } = await sb.from('email_threads').delete().like('thread_id', emailPattern);
    results.emailThreads = e4 ? `ERROR: ${e4.message}` : 'ok';
  }

  // Domain tables
  const domainCleanups = [
    ['apex_transactions',          'description', '[SYNTHETIC]%'],
    ['apex_invoices',              'title',       '[SYNTHETIC]%'],
    ['apex_workouts',              'notes',       '[SYNTHETIC]%'],
    ['apex_nutrition_log',         'food_name',   '[SYNTHETIC]%'],
    ['apex_sleep_log',             'notes',       '[SYNTHETIC]%'],
    ['apex_body_measurements',     'notes',       '[SYNTHETIC]%'],
    ['apex_supplements',           'name',        '[SYNTHETIC]%'],
    ['apex_journal_entries',       'entry_text',  '[SYNTHETIC]%'],
    ['apex_habits',                'habit_name',  '[SYNTHETIC]%'],
    ['apex_spiritual_sessions',    'notes',       '[SYNTHETIC]%'],
    ['apex_university_modules',    'name',        '[SYNTHETIC]%'],
    ['apex_university_assignments','title',       '[SYNTHETIC]%'],
    ['apex_university_flashcards', 'front',       '[SYNTHETIC]%'],
    ['apex_reading_list',          'title',       '[SYNTHETIC]%'],
    ['apex_contacts',              'name',        '[SYNTHETIC]%'],
    ['apex_subscriptions',         'name',        '[SYNTHETIC]%'],
    ['apex_investments',           'name',        '[SYNTHETIC]%'],
  ];
  for (const [table, col, pattern] of domainCleanups) {
    if (datasetId === 'all' || datasetId === DATASET_IDS.TIER3) {
      const { error } = await sb.from(table).delete().like(col, pattern);
      results[table] = error ? `ERROR: ${error.message}` : 'ok';
    }
  }
  // apex_mood_log: no text field — clean by date range used in synthetic data
  if (datasetId === 'all' || datasetId === DATASET_IDS.TIER3) {
    const syntheticMoodDates = ['2026-06-23','2026-06-24','2026-06-25','2026-06-26','2026-06-27','2026-06-28','2026-06-29'];
    const { error } = await sb.from('apex_mood_log').delete().in('date', syntheticMoodDates);
    results.apex_mood_log = error ? `ERROR: ${error.message}` : 'ok';
  }

  return results;
}

// ─── PUBLIC API ────────────────────────────────────────────────────────────────

async function cleanupSyntheticDataset(datasetId = 'all') {
  const results = {};

  // 1. Episodes
  const epPrefix = datasetId === 'all' ? 'ep-synth-' : `ep-synth-${datasetId}-`;
  results.episodes = await _removeMatchingFiles(PATHS.EPISODES_DIR, epPrefix);

  // 2. Goals
  const goalPrefix = datasetId === 'all' ? 'goal-synth-' : `goal-synth-${datasetId}-`;
  results.goals = await _removeMatchingFiles(PATHS.GOALS_DIR, goalPrefix);

  // 3. Plan records
  results.planRecords = await _cleanPlanRegistry(datasetId);

  // 4. Lessons.md
  results.lessonBlocks = await _cleanLessonsFile(datasetId);

  // 5. Memory index — always delete when cleaning (auto-rebuilt from remaining episodes)
  if (datasetId === 'all') {
    try {
      await fs.unlink(PATHS.MEMORY_INDEX);
      results.memoryIndex = 'deleted';
    } catch (_) {
      results.memoryIndex = 'not found';
    }
  }

  // 6. Chat history files
  if (datasetId === 'all' || datasetId === DATASET_IDS.TIER3) {
    results.chatFiles = await _removeMatchingFiles(PATHS.CONVERSATIONS_DIR, 'synth-');
  }

  // 7. Project files
  if (datasetId === 'all' || datasetId === DATASET_IDS.TIER3) {
    const archProj = await _removeMatchingFiles(PATHS.PROJECTS_ARCHIVE, 'synth-');
    const actProj  = await _removeMatchingFiles(PATHS.PROJECTS_ACTIVE, 'synth-');
    results.projectFiles = archProj + actProj;
  }

  // 8. Supabase cleanup
  results.supabase = await _cleanSupabase(datasetId);

  return results;
}

module.exports = { cleanupSyntheticDataset };
