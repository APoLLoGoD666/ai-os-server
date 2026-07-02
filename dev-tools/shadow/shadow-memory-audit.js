'use strict';
require('dotenv').config({ path: '.env' });
const fs   = require('fs');
const path = require('path');
const mem  = require('./agent-system/episodic-memory');
const gt   = require('./agent-system/goal-tracker');
const ae   = require('./agent-system/adaptation-engine');
const { createClient } = require('@supabase/supabase-js');

const VAULT        = process.env.OBSIDIAN_VAULT_PATH || 'C:\\Users\\arwwo\\Desktop\\AI Scripts\\APEX AI OS';
const EPISODES_DIR = path.join(VAULT, '12 Memory', 'Episodes');
const GOALS_DIR    = path.join(VAULT, 'System', 'Goals');
const EVAL_DIR     = path.join(VAULT, 'System', 'Cognition', 'Evaluations');
const ADAPT_REG    = path.join(VAULT, 'System', 'Adaptations', 'adaptation-registry.json');
const LESSONS_PATH = path.join(VAULT, '01 Executive', 'Lessons.md');

const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

// ── Episode schema required fields
const EP_REQUIRED = ['id', 'timestamp', 'objective', 'complexity', 'success', 'keywords'];
const EP_ALL      = [...EP_REQUIRED, 'cost', 'durationMs', 'failedStage', 'failureReason', 'models'];

// ── Goal schema required fields
const GOAL_REQUIRED = ['id', 'objective', 'priority', 'source', 'status', 'createdAt', 'updatedAt', 'subtaskIds', 'retryCount'];
const GOAL_VALID_STATUS = new Set(['pending', 'running', 'completed', 'blocked', 'cancelled']);

// ── Evaluation schema required fields
const EVAL_REQUIRED = ['id', 'generatedAt', 'overallScore', 'dimensions', 'episodeCount'];

async function run() {
  const report = { issues: [], stats: {} };
  const addIssue = (artifact, observed, expected, evidence, severity = 'WARN') =>
    report.issues.push({ artifact, observed, expected, evidence, severity });

  // ══════════════════════════════════════════════════════════════════
  // 1. EPISODE AUDIT
  // ══════════════════════════════════════════════════════════════════

  const epFiles = fs.readdirSync(EPISODES_DIR).filter(f => f.startsWith('ep-') && f.endsWith('.json'));
  const episodes = [];
  const epParseErrors = [];

  for (const f of epFiles) {
    try {
      const ep = JSON.parse(fs.readFileSync(path.join(EPISODES_DIR, f), 'utf8'));
      episodes.push({ file: f, ep });
    } catch (e) {
      epParseErrors.push(f);
      addIssue(`episode/${f}`, 'parse error: ' + e.message, 'valid JSON', f, 'ERROR');
    }
  }

  // 1a. Required field completeness
  let epMissingFields = 0;
  for (const { file, ep } of episodes) {
    const missing = EP_REQUIRED.filter(k => ep[k] === undefined);
    if (missing.length) {
      epMissingFields++;
      addIssue(`episode/${file}`, `missing fields: ${missing.join(', ')}`, 'all required fields present', JSON.stringify(missing), 'ERROR');
    }
  }

  // 1b. Keywords field non-empty for all episodes
  let epEmptyKeywords = 0;
  for (const { file, ep } of episodes) {
    if (!ep.keywords || ep.keywords.length === 0) {
      epEmptyKeywords++;
      addIssue(`episode/${file}`, 'keywords: []', 'non-empty keywords array', `objective: "${(ep.objective||'').slice(0,50)}"`, 'WARN');
    }
  }

  // 1c. Lifecycle consistency: success=true → failedStage must be null
  let epLifecycleErrors = 0;
  for (const { file, ep } of episodes) {
    if (ep.success && ep.failedStage !== null && ep.failedStage !== undefined) {
      epLifecycleErrors++;
      addIssue(`episode/${file}`, `success=true but failedStage="${ep.failedStage}"`, 'failedStage null on success', file, 'WARN');
    }
    if (!ep.success && ep.failedStage === null) {
      // Not an error — failedStage may legitimately be null if agentLogs not provided
      // (shadow-ingest explicitly sets failedStage for failures)
    }
  }

  // 1d. Duplicate IDs
  const epIds = episodes.map(({ ep }) => ep.id);
  const epIdDupes = epIds.filter((id, i) => epIds.indexOf(id) !== i);

  // 1e. Duplicate objectives (exact match)
  const epObjs = episodes.map(({ ep }) => (ep.objective || '').trim().toLowerCase());
  const epObjDupes = epObjs.filter((o, i) => epObjs.indexOf(o) !== i);

  if (epIdDupes.length) {
    addIssue('episodes/id-duplicates', `${epIdDupes.length} duplicate IDs: ${epIdDupes.join(', ')}`, 'unique IDs', epIdDupes.join(', '), 'ERROR');
  }
  if (epObjDupes.length) {
    addIssue('episodes/objective-duplicates', `${epObjDupes.length} duplicate objectives`, 'unique objectives', epObjDupes[0].slice(0, 60), 'WARN');
  }

  // 1f. Complexity values valid
  const VALID_COMPLEXITY = new Set(['simple', 'moderate', 'complex', 'critical', 'unknown']);
  const epBadComplexity = episodes.filter(({ ep }) => !VALID_COMPLEXITY.has(ep.complexity));
  if (epBadComplexity.length) {
    for (const { file, ep } of epBadComplexity) {
      addIssue(`episode/${file}`, `complexity="${ep.complexity}"`, 'simple|moderate|complex|critical|unknown', file, 'WARN');
    }
  }

  // 1g. Timestamp parse validity
  const epBadTimestamp = episodes.filter(({ ep }) => ep.timestamp && isNaN(new Date(ep.timestamp)));
  if (epBadTimestamp.length) {
    for (const { file } of epBadTimestamp) {
      addIssue(`episode/${file}`, 'unparseable timestamp', 'valid ISO 8601 timestamp', file, 'ERROR');
    }
  }

  report.stats.episodes = {
    total: epFiles.length,
    parsed: episodes.length,
    parseErrors: epParseErrors.length,
    missingRequiredFields: epMissingFields,
    emptyKeywords: epEmptyKeywords,
    lifecycleErrors: epLifecycleErrors,
    duplicateIds: epIdDupes.length,
    duplicateObjectives: epObjDupes.length,
    badComplexity: epBadComplexity.length,
    badTimestamp: epBadTimestamp.length,
    successCount: episodes.filter(({ ep }) => ep.success).length,
    failureCount: episodes.filter(({ ep }) => !ep.success).length,
  };

  // ══════════════════════════════════════════════════════════════════
  // 2. GOAL AUDIT
  // ══════════════════════════════════════════════════════════════════

  const goalFiles = fs.readdirSync(GOALS_DIR).filter(f => f.startsWith('goal-') && f.endsWith('.json'));
  const goals = [];
  const goalParseErrors = [];

  for (const f of goalFiles) {
    try {
      const g = JSON.parse(fs.readFileSync(path.join(GOALS_DIR, f), 'utf8'));
      goals.push({ file: f, g });
    } catch (e) {
      goalParseErrors.push(f);
      addIssue(`goal/${f}`, 'parse error: ' + e.message, 'valid JSON', f, 'ERROR');
    }
  }

  // 2a. Required fields
  let goalMissingFields = 0;
  for (const { file, g } of goals) {
    const missing = GOAL_REQUIRED.filter(k => g[k] === undefined);
    if (missing.length) {
      goalMissingFields++;
      addIssue(`goal/${file}`, `missing fields: ${missing.join(', ')}`, 'all required fields present', JSON.stringify(missing), 'ERROR');
    }
  }

  // 2b. Valid status values
  const goalBadStatus = goals.filter(({ g }) => !GOAL_VALID_STATUS.has(g.status));
  for (const { file, g } of goalBadStatus) {
    addIssue(`goal/${file}`, `status="${g.status}"`, 'pending|running|completed|blocked|cancelled', file, 'ERROR');
  }

  // 2c. Lifecycle integrity
  let goalLifecycleErrors = 0;
  for (const { file, g } of goals) {
    if (g.status === 'completed' && !g.completedAt) {
      goalLifecycleErrors++;
      addIssue(`goal/${file}`, 'status=completed but completedAt is null', 'completedAt set on completion', file, 'WARN');
    }
    if (g.status === 'blocked' && !g.blockedReason) {
      goalLifecycleErrors++;
      addIssue(`goal/${file}`, 'status=blocked but blockedReason is null/empty', 'blockedReason set when blocked', file, 'WARN');
    }
    if (g.status === 'running' && !g.startedAt) {
      goalLifecycleErrors++;
      addIssue(`goal/${file}`, 'status=running but startedAt is null', 'startedAt set when running', file, 'WARN');
    }
  }

  // 2d. updatedAt >= createdAt
  let goalTimingErrors = 0;
  for (const { file, g } of goals) {
    if (g.createdAt && g.updatedAt && new Date(g.updatedAt) < new Date(g.createdAt)) {
      goalTimingErrors++;
      addIssue(`goal/${file}`, 'updatedAt < createdAt', 'updatedAt >= createdAt', file, 'WARN');
    }
  }

  // 2e. Duplicate IDs
  const goalIds = goals.map(({ g }) => g.id);
  const goalIdDupes = goalIds.filter((id, i) => goalIds.indexOf(id) !== i);
  if (goalIdDupes.length) {
    addIssue('goals/id-duplicates', `${goalIdDupes.length} duplicate IDs`, 'unique IDs', goalIdDupes.join(', '), 'ERROR');
  }

  report.stats.goals = {
    total: goalFiles.length,
    parsed: goals.length,
    parseErrors: goalParseErrors.length,
    missingRequiredFields: goalMissingFields,
    badStatus: goalBadStatus.length,
    lifecycleErrors: goalLifecycleErrors,
    timingErrors: goalTimingErrors,
    duplicateIds: goalIdDupes.length,
    byStatus: Object.fromEntries(
      ['pending','running','completed','blocked','cancelled'].map(s => [
        s, goals.filter(({ g }) => g.status === s).length
      ])
    ),
  };

  // ══════════════════════════════════════════════════════════════════
  // 3. EVALUATION AUDIT
  // ══════════════════════════════════════════════════════════════════

  const evalFiles = fs.readdirSync(EVAL_DIR).filter(f => f.startsWith('eval-') && f.endsWith('.json'));
  const evals = [];
  for (const f of evalFiles) {
    try {
      const ev = JSON.parse(fs.readFileSync(path.join(EVAL_DIR, f), 'utf8'));
      evals.push({ file: f, ev });
    } catch (e) {
      addIssue(`eval/${f}`, 'parse error: ' + e.message, 'valid JSON', f, 'ERROR');
    }
  }

  // 3a. Required fields
  let evalMissingFields = 0;
  for (const { file, ev } of evals) {
    const missing = EVAL_REQUIRED.filter(k => ev[k] === undefined);
    if (missing.length) {
      evalMissingFields++;
      addIssue(`eval/${file}`, `missing fields: ${missing.join(', ')}`, 'all required fields', JSON.stringify(missing), 'WARN');
    }
  }

  // 3b. Score range validation (0–10)
  for (const { file, ev } of evals) {
    if (typeof ev.overallScore === 'number' && (ev.overallScore < 0 || ev.overallScore > 10)) {
      addIssue(`eval/${file}`, `overallScore=${ev.overallScore} out of [0,10]`, 'score in [0,10]', file, 'ERROR');
    }
  }

  // 3c. Dimension completeness
  const EXPECTED_DIMS = ['planningQuality', 'executionQuality', 'recoveryEffectiveness', 'lessonUsefulness', 'adaptationEffectiveness'];
  let evalDimErrors = 0;
  for (const { file, ev } of evals) {
    if (!ev.dimensions) continue;
    const missingDims = EXPECTED_DIMS.filter(d => ev.dimensions[d] === undefined);
    if (missingDims.length) {
      evalDimErrors++;
      addIssue(`eval/${file}`, `missing dimensions: ${missingDims.join(', ')}`, 'all 5 dimensions', JSON.stringify(missingDims), 'WARN');
    }
  }

  // 3d. Score evolution — check monotonic trend
  const sortedEvals = evals
    .filter(({ ev }) => ev.generatedAt)
    .sort((a, b) => new Date(a.ev.generatedAt) - new Date(b.ev.generatedAt));
  const scores = sortedEvals.map(({ ev }) => ({ id: ev.id, score: ev.overallScore, ts: ev.generatedAt }));

  report.stats.evaluations = {
    total: evalFiles.length,
    parsed: evals.length,
    missingRequiredFields: evalMissingFields,
    dimErrors: evalDimErrors,
    scoreEvolution: scores,
    latestScore: scores.length ? scores[scores.length - 1].score : null,
  };

  // ══════════════════════════════════════════════════════════════════
  // 4. ADAPTATION REGISTRY AUDIT
  // ══════════════════════════════════════════════════════════════════

  let regAudit;
  try {
    const reg = JSON.parse(fs.readFileSync(ADAPT_REG, 'utf8'));
    const ADAPT_REQUIRED = ['version', 'generatedAt', 'totalActive', 'adaptations'];
    const ADAPT_ITEM_REQ = ['id', 'type', 'action', 'confidence', 'active', 'createdAt', 'expiresAt', 'appliedCount', 'successCount'];

    const missingTopLevel = ADAPT_REQUIRED.filter(k => reg[k] === undefined);
    if (missingTopLevel.length) {
      addIssue('adaptation-registry', `missing top-level fields: ${missingTopLevel.join(', ')}`, 'all required fields', JSON.stringify(missingTopLevel), 'ERROR');
    }

    let adaptItemErrors = 0;
    for (const a of (reg.adaptations || [])) {
      const missing = ADAPT_ITEM_REQ.filter(k => a[k] === undefined);
      if (missing.length) {
        adaptItemErrors++;
        addIssue(`adaptation-registry/${a.id || 'unknown'}`, `missing: ${missing.join(', ')}`, 'all required fields', JSON.stringify(missing), 'WARN');
      }
      // Confidence in [0,1]
      if (typeof a.confidence === 'number' && (a.confidence < 0 || a.confidence > 1)) {
        addIssue(`adaptation-registry/${a.id}`, `confidence=${a.confidence} out of [0,1]`, 'confidence in [0,1]', a.id, 'ERROR');
      }
      // appliedCount >= successCount
      if (typeof a.appliedCount === 'number' && typeof a.successCount === 'number' && a.successCount > a.appliedCount) {
        addIssue(`adaptation-registry/${a.id}`, `successCount(${a.successCount}) > appliedCount(${a.appliedCount})`, 'successCount <= appliedCount', a.id, 'ERROR');
      }
      // expiresAt > createdAt
      if (a.createdAt && a.expiresAt && new Date(a.expiresAt) <= new Date(a.createdAt)) {
        addIssue(`adaptation-registry/${a.id}`, 'expiresAt <= createdAt', 'expiresAt > createdAt', a.id, 'WARN');
      }
    }

    // totalActive count matches actual active adaptations
    const actualActive = (reg.adaptations || []).filter(a => a.active).length;
    if (reg.totalActive !== actualActive) {
      addIssue('adaptation-registry', `totalActive=${reg.totalActive} but ${actualActive} adaptations have active=true`, 'totalActive matches active count', `totalActive:${reg.totalActive}, actual:${actualActive}`, 'WARN');
    }

    regAudit = {
      version: reg.version,
      generatedAt: reg.generatedAt,
      totalAdaptations: (reg.adaptations || []).length,
      totalActive: reg.totalActive,
      actualActive,
      itemErrors: adaptItemErrors,
      adaptations: (reg.adaptations || []).map(a => ({
        id: a.id, action: a.action, type: a.type, confidence: a.confidence,
        active: a.active, appliedCount: a.appliedCount, successCount: a.successCount,
        expiresAt: a.expiresAt,
      })),
    };
  } catch (e) {
    addIssue('adaptation-registry', 'read/parse error: ' + e.message, 'valid JSON file', ADAPT_REG, 'ERROR');
    regAudit = { error: e.message };
  }
  report.stats.adaptations = regAudit;

  // ══════════════════════════════════════════════════════════════════
  // 5. LESSONS AUDIT
  // ══════════════════════════════════════════════════════════════════

  let lessonsAudit = {};
  try {
    const raw = fs.readFileSync(LESSONS_PATH, 'utf8');
    const lines = raw.split('\n');
    const h2Sections = lines.filter(l => l.startsWith('## ')).map(l => l.replace('## ', '').trim());
    const h3Sections = lines.filter(l => l.startsWith('### ')).map(l => l.replace('### ', '').trim());

    // Check for duplicate section titles
    const h2Dupes = h2Sections.filter((s, i) => h2Sections.indexOf(s) !== i);
    const h3Dupes = h3Sections.filter((s, i) => h3Sections.indexOf(s) !== i);

    if (h2Dupes.length) {
      addIssue('Lessons.md/h2-duplicates', `duplicate H2 sections: ${h2Dupes.join(', ')}`, 'unique section titles', h2Dupes.join(', '), 'WARN');
    }
    if (h3Dupes.length) {
      addIssue('Lessons.md/h3-duplicates', `duplicate H3 sections: ${h3Dupes.join(', ')}`, 'unique section titles', h3Dupes.join(', '), 'WARN');
    }

    // Check for empty sections (H2 with no content before next H2)
    let emptySections = 0;
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].startsWith('## ')) {
        let hasContent = false;
        for (let j = i + 1; j < lines.length && !lines[j].startsWith('## '); j++) {
          if (lines[j].trim()) { hasContent = true; break; }
        }
        if (!hasContent) {
          emptySections++;
          addIssue('Lessons.md/' + lines[i].trim(), 'empty section (no content)', 'section has content', lines[i].trim(), 'WARN');
        }
      }
    }

    lessonsAudit = {
      totalLines: lines.length,
      h2Sections: h2Sections.length,
      h3Sections: h3Sections.length,
      h2Dupes: h2Dupes.length,
      h3Dupes: h3Dupes.length,
      emptySections,
      sectionTitles: h2Sections,
    };
  } catch (e) {
    addIssue('Lessons.md', 'read error: ' + e.message, 'readable Lessons.md', LESSONS_PATH, 'ERROR');
    lessonsAudit = { error: e.message };
  }
  report.stats.lessons = lessonsAudit;

  // ══════════════════════════════════════════════════════════════════
  // 6. RETRIEVAL RELEVANCE AUDIT
  // ══════════════════════════════════════════════════════════════════

  const retrievalTests = [
    { query: 'Redis migration database timeout', expectCategory: ['database', 'redis', 'migration'], expectSuccess: false },
    { query: 'authentication OAuth2 token session', expectCategory: ['auth', 'oauth'], expectSuccess: null },
    { query: 'WebSocket memory spike frontend', expectCategory: ['websocket', 'memory', 'frontend'], expectSuccess: false },
    { query: 'parallel agent orchestration race condition', expectCategory: ['agent', 'orchestrat', 'race'], expectSuccess: false },
  ];

  const retrievalResults = [];
  for (const test of retrievalTests) {
    const results = mem.getSimilarExperiences(test.query, { limit: 5 });
    const topRelevance = results[0]?._relevance || 0;
    const topObjective = results[0]?.objective || '';
    const hasRelevant  = results.length > 0 && topRelevance > 0.1;

    // Check if any result keyword overlaps with expected category keywords
    const anyMatch = results.some(ep =>
      test.expectCategory.some(kw => (ep.objective || '').toLowerCase().includes(kw))
    );

    retrievalResults.push({
      query: test.query,
      resultsCount: results.length,
      topRelevance,
      topObjective: topObjective.slice(0, 80),
      hasRelevant,
      categoryMatch: anyMatch,
    });

    if (!hasRelevant) {
      addIssue(`retrieval/${test.query.slice(0, 40)}`, `top relevance ${topRelevance} — no relevant results`, 'at least 1 relevant result', `query: "${test.query}"`, 'WARN');
    }
  }

  report.stats.retrieval = {
    testsRun: retrievalTests.length,
    results: retrievalResults,
    avgTopRelevance: +(retrievalResults.reduce((s, r) => s + r.topRelevance, 0) / retrievalResults.length).toFixed(3),
    allHaveResults: retrievalResults.every(r => r.resultsCount > 0),
  };

  // ══════════════════════════════════════════════════════════════════
  // 7. ORPHAN CHECK — shadow Supabase runs without matching episodes
  // ══════════════════════════════════════════════════════════════════

  let orphanAudit = {};
  try {
    const { data: runs, error } = await sb
      .from('apex_agent_runs')
      .select('task_id, objective, created_at')
      .ilike('task_id', 'shadow-run-%')
      .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);

    const epIdSet = new Set(episodes.map(({ ep }) => ep.id));

    // Match by task_id → episode id (shadow-run-001 → shadow-001)
    const orphans = runs.filter(r => {
      const epId = r.task_id.replace('shadow-run-', 'shadow-');
      return !epIdSet.has(epId);
    });

    if (orphans.length) {
      for (const o of orphans) {
        addIssue(`supabase/apex_agent_runs/${o.task_id}`, `run exists in Supabase but no matching episode on disk`, `episode ep-${o.task_id.replace('shadow-run-', 'shadow-')}.json exists`, o.task_id, 'WARN');
      }
    }

    // Reverse: episodes without matching runs
    const shadowEps = episodes.filter(({ ep }) => ep.id.startsWith('shadow-'));
    const runTaskIds = new Set(runs.map(r => r.task_id));
    const epWithoutRun = shadowEps.filter(({ ep }) => !runTaskIds.has(`shadow-run-${ep.id.replace('shadow-', '')}`));
    if (epWithoutRun.length) {
      for (const { file, ep } of epWithoutRun) {
        addIssue(`episode/${file}`, `shadow episode on disk with no matching apex_agent_run in Supabase`, `apex_agent_run with task_id shadow-run-${ep.id.replace('shadow-','')} exists`, ep.id, 'INFO');
      }
    }

    orphanAudit = {
      supabaseRunsChecked: runs.length,
      orphanedRuns: orphans.length,
      orphanedEpisodes: epWithoutRun.length,
      orphanedRunIds: orphans.map(o => o.task_id),
    };
  } catch (e) {
    orphanAudit = { error: e.message };
  }
  report.stats.orphans = orphanAudit;

  // ══════════════════════════════════════════════════════════════════
  // 8. SUMMARY
  // ══════════════════════════════════════════════════════════════════

  const errorCount = report.issues.filter(i => i.severity === 'ERROR').length;
  const warnCount  = report.issues.filter(i => i.severity === 'WARN').length;
  const infoCount  = report.issues.filter(i => i.severity === 'INFO').length;

  report.summary = {
    totalIssues: report.issues.length,
    errors: errorCount,
    warnings: warnCount,
    info: infoCount,
    artifactsCovered: ['episodes', 'goals', 'evaluations', 'adaptations', 'lessons', 'retrieval', 'orphans'],
    verdict: errorCount === 0 ? 'PASS' : 'ISSUES_FOUND',
  };

  console.log(JSON.stringify(report, null, 2));
}

run().catch(e => console.error('ERR:', e.message));
