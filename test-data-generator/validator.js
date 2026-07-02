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

async function _countFiles(dir, prefix) {
  try {
    const files = await fs.readdir(dir);
    return files.filter(f => f.startsWith(prefix)).length;
  } catch (_) {
    return 0;
  }
}

async function _countSbRows(table, column, pattern) {
  try {
    const sb = _supabase();
    const { count, error } = await sb.from(table).select('*', { count: 'exact', head: true }).like(column, pattern);
    if (error) return { count: 0, error: error.message };
    return { count: count || 0, error: null };
  } catch (e) {
    return { count: 0, error: e.message };
  }
}

async function _readJson(filePath) {
  try {
    return JSON.parse(await fs.readFile(filePath, 'utf8'));
  } catch (_) {
    return null;
  }
}

async function _readText(filePath) {
  try {
    return await fs.readFile(filePath, 'utf8');
  } catch (_) {
    return '';
  }
}

// ─── CHECKPOINT VALIDATORS ────────────────────────────────────────────────────

async function validateTier1() {
  const checks = [];

  // Episodes
  const episodeCount = await _countFiles(PATHS.EPISODES_DIR, 'ep-synth-sdv1-dim');
  checks.push({ check: 'episode files (sdv1-dim)', expected: 2, actual: episodeCount, pass: episodeCount === 2 });

  // Goals
  const goalCount = await _countFiles(PATHS.GOALS_DIR, 'goal-synth-sdv1-dim');
  checks.push({ check: 'goal files (sdv1-dim)', expected: 3, actual: goalCount, pass: goalCount === 3 });

  // Supabase: apex_agent_runs
  const runs = await _countSbRows('apex_agent_runs', 'task_id', 'synth-sdv1-dim-%');
  checks.push({ check: 'apex_agent_runs (sdv1-dim)', expected: 2, actual: runs.count, pass: runs.count === 2, error: runs.error });

  // Goal content: 2 completed, 1 blocked
  try {
    const goalFiles = await fs.readdir(PATHS.GOALS_DIR);
    const dimGoalFiles = goalFiles.filter(f => f.startsWith('goal-synth-sdv1-dim'));
    const goals = await Promise.all(dimGoalFiles.map(f =>
      fs.readFile(path.join(PATHS.GOALS_DIR, f), 'utf8').then(JSON.parse).catch(() => null)
    ));
    const completed = goals.filter(g => g && g.status === 'completed').length;
    const blocked   = goals.filter(g => g && g.status === 'blocked').length;
    checks.push({ check: 'goals: 2 completed', expected: 2, actual: completed, pass: completed === 2 });
    checks.push({ check: 'goals: 1 blocked',   expected: 1, actual: blocked,   pass: blocked === 1 });
  } catch (_) {
    checks.push({ check: 'goals: status verification', pass: false, error: 'Could not read goal files' });
  }

  // Episode content: 1 success + 1 failure
  try {
    const epFiles = (await fs.readdir(PATHS.EPISODES_DIR)).filter(f => f.includes('sdv1-dim'));
    const episodes = await Promise.all(epFiles.map(f =>
      fs.readFile(path.join(PATHS.EPISODES_DIR, f), 'utf8').then(JSON.parse).catch(() => null)
    ));
    const successes = episodes.filter(e => e && e.success === true).length;
    const failures  = episodes.filter(e => e && e.success === false).length;
    checks.push({ check: 'episodes: 1 success', expected: 1, actual: successes, pass: successes === 1 });
    checks.push({ check: 'episodes: 1 failure', expected: 1, actual: failures,  pass: failures === 1 });
  } catch (_) {
    checks.push({ check: 'episodes: content verification', pass: false, error: 'Could not read episode files' });
  }

  return { tier: 'tier1 (sdv1-dim)', checks };
}

async function validateTier2() {
  const tier1 = await validateTier1();
  const checks = [...tier1.checks];

  // Total episodes across tier1 + tier2
  const totalEpisodes = await _countFiles(PATHS.EPISODES_DIR, 'ep-synth-');
  checks.push({ check: 'total episode files (tier1+2)', expected: 10, actual: totalEpisodes, pass: totalEpisodes === 10 });

  // Plan records
  const registry = await _readJson(PATHS.PLAN_QUALITY_FILE);
  const planCount = registry ? (registry.records || []).filter(r => r.synthetic === true).length : 0;
  checks.push({ check: 'plan records (synthetic)', expected: 3, actual: planCount, pass: planCount === 3 });

  // Lessons.md
  const lessonsContent = await _readText(PATHS.LESSONS_FILE);
  const hasLoopMarker  = lessonsContent.includes('<!-- SYNTHETIC-BEGIN:sdv1-loop -->');
  const lessonBlocks   = (lessonsContent.match(/\[SYNTHETIC:sdv1-loop\]/g) || []).length;
  checks.push({ check: 'Lessons.md has sdv1-loop marker', expected: true,  actual: hasLoopMarker, pass: hasLoopMarker });
  checks.push({ check: 'Lessons.md lesson count (sdv1-loop)', expected: 8, actual: lessonBlocks, pass: lessonBlocks === 8 });

  // Supabase: total agent runs
  const allRuns = await _countSbRows('apex_agent_runs', 'task_id', 'synth-%');
  checks.push({ check: 'apex_agent_runs total synthetic', expected: 10, actual: allRuns.count, pass: allRuns.count === 10, error: allRuns.error });

  // Developer failures for adaptation engine
  try {
    const epFiles = (await fs.readdir(PATHS.EPISODES_DIR)).filter(f => f.startsWith('ep-synth-'));
    const episodes = await Promise.all(epFiles.map(f =>
      fs.readFile(path.join(PATHS.EPISODES_DIR, f), 'utf8').then(JSON.parse).catch(() => null)
    ));
    const devFails = episodes.filter(e => e && e.failedStage === 'DEVELOPER').length;
    checks.push({ check: 'DEVELOPER failures ≥ 4 (adaptation gate)', expected: '≥4', actual: devFails, pass: devFails >= 4 });
  } catch (_) {
    checks.push({ check: 'DEVELOPER failure count', pass: false, error: 'Could not read episodes' });
  }

  return { tier: 'tier2 (sdv1-loop)', checks };
}

async function validateTier3() {
  const tier2 = await validateTier2();
  const checks = [...tier2.checks];

  // Total episodes
  const totalEpisodes = await _countFiles(PATHS.EPISODES_DIR, 'ep-synth-');
  checks.push({ check: 'total episode files (tier1+2+3)', expected: 20, actual: totalEpisodes, pass: totalEpisodes === 20 });

  // Supabase: transactions
  const txns = await _countSbRows('transactions', 'description', '[SYNTHETIC]%');
  checks.push({ check: 'transactions (synthetic)', expected: 24, actual: txns.count, pass: txns.count === 24, error: txns.error });

  // Supabase: invoices
  const invs = await _countSbRows('invoices', 'invoice_number', 'SYNTH-%');
  checks.push({ check: 'invoices (synthetic)', expected: 6, actual: invs.count, pass: invs.count === 6, error: invs.error });

  // Supabase: email threads
  const emails = await _countSbRows('email_threads', 'thread_id', 'synth-thread-%');
  checks.push({ check: 'email threads (synthetic)', expected: 52, actual: emails.count, pass: emails.count === 52, error: emails.error });

  // Chat history files
  const chatCount = await _countFiles(PATHS.CONVERSATIONS_DIR, 'synth-');
  checks.push({ check: 'chat conversation files', expected: 5, actual: chatCount, pass: chatCount === 5 });

  // Project archive files
  const archiveCount = await _countFiles(PATHS.PROJECTS_ARCHIVE, 'synth-');
  const activeCount  = await _countFiles(PATHS.PROJECTS_ACTIVE, 'synth-');
  const totalProjects = archiveCount + activeCount;
  checks.push({ check: 'project history files', expected: 3, actual: totalProjects, pass: totalProjects === 3 });

  // Plan records total
  const registry = await _readJson(PATHS.PLAN_QUALITY_FILE);
  const planCount = registry ? (registry.records || []).filter(r => r.synthetic === true).length : 0;
  checks.push({ check: 'plan records total (synthetic)', expected: 13, actual: planCount, pass: planCount === 13 });

  // Agent runs total
  const allRuns = await _countSbRows('apex_agent_runs', 'task_id', 'synth-%');
  checks.push({ check: 'apex_agent_runs total synthetic', expected: 20, actual: allRuns.count, pass: allRuns.count === 20, error: allRuns.error });

  return { tier: 'tier3 (sdv1-scale)', checks };
}

async function validateSyntheticDataset(tier = 'tier3') {
  const fn = tier === 'tier1' ? validateTier1
           : tier === 'tier2' ? validateTier2
           :                    validateTier3;
  return fn();
}

async function statusSummary() {
  const episodes     = await _countFiles(PATHS.EPISODES_DIR, 'ep-synth-');
  const goals        = await _countFiles(PATHS.GOALS_DIR, 'goal-synth-');
  const chats        = await _countFiles(PATHS.CONVERSATIONS_DIR, 'synth-');
  const archProjects = await _countFiles(PATHS.PROJECTS_ARCHIVE, 'synth-');
  const actProjects  = await _countFiles(PATHS.PROJECTS_ACTIVE, 'synth-');
  const registry     = await _readJson(PATHS.PLAN_QUALITY_FILE);
  const planRecords  = registry ? (registry.records || []).filter(r => r.synthetic === true).length : 0;
  const lessonsText  = await _readText(PATHS.LESSONS_FILE);
  const lessonBlocks = (lessonsText.match(/\[SYNTHETIC:/g) || []).length;

  const runs   = await _countSbRows('apex_agent_runs', 'task_id', 'synth-%');
  const txns   = await _countSbRows('transactions', 'description', '[SYNTHETIC]%');
  const invs   = await _countSbRows('invoices', 'invoice_number', 'SYNTH-%');
  const emails = await _countSbRows('email_threads', 'thread_id', 'synth-thread-%');

  return {
    vault: { episodes, goals, chats, projects: archProjects + actProjects, planRecords, lessons: lessonBlocks },
    supabase: { agentRuns: runs.count, transactions: txns.count, invoices: invs.count, emailThreads: emails.count },
  };
}

module.exports = { validateSyntheticDataset, validateTier1, validateTier2, validateTier3, statusSummary };
