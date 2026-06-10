'use strict';
// lib/intelligence/decision-outcome-engine.js
// Tracks decisions from any source (executive_council, digital_twin, strategy_engine)
// against their actual outcomes. Generates lessons when outcomes are measured.

const { getSupabaseClient } = require('../clients');
const logger = require('../logger');

const SOURCES = ['executive_council', 'digital_twin', 'strategy_engine', 'manual'];

function _sb() { return getSupabaseClient(); }

// Record a decision that should be tracked for outcome measurement.
// Returns the persisted decision_outcome row.
async function record({ decisionSource, decisionId = null, question, expectedOutcome }) {
  if (!SOURCES.includes(decisionSource)) {
    logger.warn('decision-outcome', 'unknown source', { decisionSource });
  }

  const { data, error } = await _sb()
    .from('decision_outcomes')
    .insert({
      decision_source:  String(decisionSource).slice(0, 50),
      decision_id:      decisionId,
      question:         String(question).slice(0, 500),
      expected_outcome: String(expectedOutcome).slice(0, 1000),
      status:           'pending',
    })
    .select()
    .single();

  if (error) {
    logger.warn('decision-outcome', 'record failed', { error: error.message });
    return null;
  }
  return data;
}

// Measure an actual outcome against a tracked decision.
// variance is the caller's assessment of how far actual diverged from expected.
// Generates a gateway lesson if variance is significant.
async function measure({ id, actualOutcome, variance = null, lessonsLearned = null }) {
  const { data, error } = await _sb()
    .from('decision_outcomes')
    .update({
      actual_outcome:  String(actualOutcome).slice(0, 1000),
      variance:        variance ? String(variance).slice(0, 500) : null,
      lessons_learned: lessonsLearned ? String(lessonsLearned).slice(0, 1000) : null,
      outcome_at:      new Date().toISOString(),
      status:          'measured',
    })
    .eq('id', id)
    .select()
    .single();

  if (error) throw new Error(`decision-outcome measure: ${error.message}`);

  // Persist significant lessons to gateway layer 10
  if (lessonsLearned) {
    try {
      const gateway = require('../memory/gateway');
      await gateway.storeMemory({
        layer:            10,
        content:          `Decision outcome: ${lessonsLearned}`,
        tags:             ['decision_outcome', data.decision_source || 'unknown'],
        source:           'decision_outcome_engine',
        taskId:           id,
        importance:       variance ? 8 : 5,
        requestingEntity: 'decision_outcome_engine',
      });
    } catch {}
  }

  return data;
}

// Get pending decisions (expected outcome set, actual not yet measured)
async function getPending(limit = 20) {
  const { data, error } = await _sb()
    .from('decision_outcomes')
    .select('*')
    .eq('status', 'pending')
    .order('decided_at', { ascending: true })
    .limit(limit);
  if (error) return [];
  return data || [];
}

// Get measured outcomes sorted by most recent
async function getMeasured(limit = 20) {
  const { data, error } = await _sb()
    .from('decision_outcomes')
    .select('*')
    .eq('status', 'measured')
    .order('outcome_at', { ascending: false })
    .limit(limit);
  if (error) return [];
  return data || [];
}

// Summary stats from actual measured data
async function getSummary() {
  const [all, measured] = await Promise.allSettled([
    _sb().from('decision_outcomes').select('id', { count: 'exact', head: true }),
    _sb().from('decision_outcomes').select('decision_source, variance').eq('status', 'measured'),
  ]);

  const total    = all.status    === 'fulfilled' ? (all.value.count    || 0) : 0;
  const measRows = measured.status === 'fulfilled' ? (measured.value.data || []) : [];

  const bySource = {};
  for (const row of measRows) {
    const src = row.decision_source || 'unknown';
    if (!bySource[src]) bySource[src] = { total: 0, withVariance: 0 };
    bySource[src].total++;
    if (row.variance) bySource[src].withVariance++;
  }

  return {
    totalTracked: total,
    totalMeasured: measRows.length,
    pendingMeasurement: total - measRows.length,
    bySource,
  };
}

// Auto-record executive council deliberations for outcome tracking
async function recordCouncilDecision(deliberationId, question, recommendation) {
  return record({
    decisionSource:  'executive_council',
    decisionId:      deliberationId,
    question,
    expectedOutcome: recommendation,
  });
}

module.exports = { record, measure, getPending, getMeasured, getSummary, recordCouncilDecision };
