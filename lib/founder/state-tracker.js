'use strict';
// lib/founder/state-tracker.js
// Tracks founder's actual state vs target across all domains and goals.
// All data is either input by the founder or derived from real DB rows.

const { getSupabaseClient } = require('../clients');
const logger = require('../logger');

function _sb() { return getSupabaseClient(); }

// getDomains — all life domains with health scores
async function getDomains() {
  const { data, error } = await _sb()
    .from('founder_domains')
    .select('*')
    .order('priority', { ascending: false });
  if (error) { logger.warn('state-tracker', 'getDomains error', { error: error.message }); return []; }
  return data || [];
}

// getGoals — all goals optionally filtered by domain or status
async function getGoals({ domainId = null, status = 'active' } = {}) {
  let q = _sb().from('founder_goals').select('*').order('priority', { ascending: false });
  if (domainId) q = q.eq('domain_id', domainId);
  if (status)   q = q.eq('status', status);
  const { data, error } = await q;
  if (error) return [];
  return data || [];
}

// updateGoalProgress — record actual progress on a goal
async function updateGoalProgress(goalId, { currentValue, progressPct, notes = null }) {
  const update = {
    current_value: String(currentValue).slice(0, 200),
    progress_pct:  Math.max(0, Math.min(100, parseInt(progressPct) || 0)),
    updated_at:    new Date().toISOString(),
  };
  if (progressPct >= 100) update.status = 'achieved';

  const { data, error } = await _sb().from('founder_goals').update(update).eq('id', goalId).select().single();
  if (error) throw new Error(`updateGoalProgress: ${error.message}`);

  // Persist progress as a lesson
  if (notes) {
    try {
      const gateway = require('../memory/gateway');
      await gateway.storeMemory({
        layer: 10, content: `Goal progress: ${data.title} — ${progressPct}% (${currentValue}). ${notes}`,
        tags: ['goal_progress', data.domain_id || 'general'],
        source: 'state_tracker', taskId: goalId,
        importance: progressPct >= 100 ? 9 : 6,
        requestingEntity: 'founder_os',
      });
    } catch {}
  }

  return data;
}

// updateDomainState — update the current_state for a domain
async function updateDomainState(domainId, currentState, healthScore = null) {
  const update = {
    current_state: currentState,
    last_updated:  new Date().toISOString(),
  };
  if (healthScore !== null) update.health_score = Math.max(0, Math.min(100, parseInt(healthScore)));

  const { data, error } = await _sb().from('founder_domains').update(update).eq('id', domainId).select().single();
  if (error) throw new Error(`updateDomainState: ${error.message}`);
  return data;
}

// snapshot — compute and persist a state snapshot
async function snapshot() {
  const [domains, goals] = await Promise.allSettled([getDomains(), getGoals({ status: null })]);

  const domainRows = domains.status === 'fulfilled' ? domains.value : [];
  const goalRows   = goals.status   === 'fulfilled' ? goals.value   : [];

  // Domain scores
  const domainScores = {};
  for (const d of domainRows) {
    domainScores[d.id] = d.health_score;
  }

  // Overall score: average of non-null domain scores weighted by priority
  const scoredDomains = domainRows.filter(d => d.health_score !== null);
  let overallScore = null;
  if (scoredDomains.length) {
    const weightedSum  = scoredDomains.reduce((s, d) => s + (d.health_score * d.priority), 0);
    const weightSum    = scoredDomains.reduce((s, d) => s + d.priority, 0);
    overallScore       = Math.round(weightedSum / weightSum);
  }

  // Goals summary
  const activeGoals   = goalRows.filter(g => g.status === 'active');
  const achievedGoals = goalRows.filter(g => g.status === 'achieved');
  const avgProgress   = activeGoals.length
    ? Math.round(activeGoals.reduce((s, g) => s + (g.progress_pct || 0), 0) / activeGoals.length)
    : null;

  // Gap analysis: domains with health_score < 50 or null
  const gapAnalysis = domainRows
    .filter(d => d.health_score === null || d.health_score < 50)
    .map(d => ({
      domain:          d.id,
      gap_description: d.health_score === null
        ? `No measurement recorded for ${d.name}`
        : `${d.name} health at ${d.health_score}% — below 50% threshold`,
      severity:        d.health_score === null ? 'medium' : (d.health_score < 25 ? 'critical' : 'high'),
      action:          `Update ${d.name} domain state and assess gaps`,
    }));

  const { data, error } = await _sb().from('founder_state_snapshots').insert({
    overall_score: overallScore,
    domain_scores: domainScores,
    goals_summary: { active: activeGoals.length, achieved: achievedGoals.length, avg_progress: avgProgress },
    gap_analysis:  gapAnalysis,
  }).select().single();

  if (error) logger.warn('state-tracker', 'snapshot failed', { error: error.message });
  return data || { overall_score: overallScore, domain_scores: domainScores, gap_analysis: gapAnalysis };
}

// getLatestSnapshot
async function getLatestSnapshot() {
  const { data } = await _sb().from('founder_state_snapshots').select('*').order('created_at', { ascending: false }).limit(1).single();
  return data || null;
}

module.exports = { getDomains, getGoals, updateGoalProgress, updateDomainState, snapshot, getLatestSnapshot };
