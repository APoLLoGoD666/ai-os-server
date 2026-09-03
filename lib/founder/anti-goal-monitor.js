'use strict';
// lib/founder/anti-goal-monitor.js
// Scans any text (plan, decision, opportunity description) for anti-goal patterns.
// Blocks execution when 'critical' anti-goals are triggered.
// Persists alerts to founder_anti_goal_alerts.

const { getSupabaseClient } = require('../clients');
const profile = require('./profile');
const logger  = require('../logger');

function _sb() { return getSupabaseClient(); }

// check — scan text against all anti-goals.
// Returns AntiGoalCheckResult.
async function check(text, { triggerSource = 'unknown', triggerId = null } = {}) {
  const p      = await profile.load();
  const lower  = text.toLowerCase();
  const antiGoals = Array.isArray(p.anti_goals) ? p.anti_goals : [];

  const triggered = [];

  for (const ag of antiGoals) {
    const keywords = ag.keywords || [];
    const matched  = keywords.filter(kw => lower.includes(kw.toLowerCase()));
    if (matched.length > 0) {
      // Find excerpt around first match
      const firstKw = matched[0].toLowerCase();
      const idx      = lower.indexOf(firstKw);
      const excerpt  = text.slice(Math.max(0, idx - 50), Math.min(text.length, idx + 100));

      triggered.push({
        anti_goal:        ag.text || '',
        severity:         ag.severity || 'medium',
        matched_keywords: matched,
        excerpt:          excerpt.trim(),
      });
    }
  }

  const highestSeverity = triggered.length
    ? (triggered.some(t => t.severity === 'critical') ? 'critical'
     : triggered.some(t => t.severity === 'high')     ? 'high' : 'medium')
    : null;

  const blockExecution = highestSeverity === 'critical';
  const clean          = triggered.length === 0;

  if (!clean) {
    setImmediate(() => _persistAlerts(triggered, triggerSource, triggerId, text).catch(() => {}));
    logger.warn('anti-goal-monitor', 'triggered', { count: triggered.length, severity: highestSeverity, source: triggerSource });
  }

  return { clean, triggered, highest_severity: highestSeverity, block_execution: blockExecution };
}

async function _persistAlerts(triggered, triggerSource, triggerId, text) {
  const rows = triggered.map(t => ({
    anti_goal:      t.anti_goal,
    trigger_text:   text.slice(0, 500),
    trigger_source: triggerSource,
    trigger_id:     triggerId,
    severity:       t.severity,
    acknowledged:   false,
  }));
  const { error } = await _sb().from('founder_anti_goal_alerts').insert(rows);
  if (error) logger.warn('anti-goal-monitor', 'persist failed', { error: error.message });
}

// getActiveAlerts — unacknowledged alerts
async function getActiveAlerts(limit = 20) {
  const { data, error } = await _sb()
    .from('founder_anti_goal_alerts')
    .select('*')
    .eq('acknowledged', false)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) return [];
  return data || [];
}

// acknowledge — mark an alert as reviewed
async function acknowledge(id) {
  const { error } = await _sb()
    .from('founder_anti_goal_alerts')
    .update({ acknowledged: true })
    .eq('id', id);
  if (error) throw new Error(`acknowledge: ${error.message}`);
}

// acknowledgeAll — bulk acknowledge
async function acknowledgeAll() {
  const { error } = await _sb()
    .from('founder_anti_goal_alerts')
    .update({ acknowledged: true })
    .eq('acknowledged', false);
  if (error) throw new Error(`acknowledgeAll: ${error.message}`);
}

// checkFailurePattern — specific check for the uncertainty→inaction cascade
async function checkFailurePattern(text) {
  const p     = await profile.load();
  const lower = text.toLowerCase();
  const warnings = p.failure_pattern?.early_warning_keywords || [];

  const matched = warnings.filter(kw => lower.includes(kw.toLowerCase()));
  if (!matched.length) return { detected: false };

  return {
    detected:  true,
    matched,
    stage:     _identifyStage(lower),
    intervention: p.failure_pattern?.intervention || 'Force a decision immediately.',
  };
}

function _identifyStage(lower) {
  if (/anxiety|anxious|stressed/.test(lower)) return 'Anxiety';
  if (/delay|procrastinat|defer/.test(lower))  return 'Delay';
  if (/overthink|too many options|can.t decide/.test(lower)) return 'Overthinking';
  if (/not sure|uncertain|unclear/.test(lower)) return 'Uncertainty';
  return 'Unknown';
}

module.exports = { check, getActiveAlerts, acknowledge, acknowledgeAll, checkFailurePattern };
