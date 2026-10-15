'use strict';
// lib/founder/alignment-engine.js
// Deterministic, rule-based alignment scoring. No model calls. No synthetic numbers.
// Score = 0-100 computed from weighted keyword matching against founder profile.
//
// Weight allocation (total 100):
//   Core value match:       40 pts  (5 values × 8pts each)
//   Strategic value match:  20 pts  (5 values × 4pts each)
//   Principle compliance:   20 pts  (4 principles × 5pts each)
//   Anti-goal penalty:     -40 pts  (5 anti-goals × 8pts each, deducted if triggered)
//   Risk profile fit:       10 pts
//   Peak state alignment:   10 pts

const { getSupabaseClient } = require('../clients');
const profile = require('./profile');
const logger  = require('../logger');

function _sb() { return getSupabaseClient(); }

// score — main entry point. Returns AlignmentResult.
async function score(text, { subjectType = 'generic', subjectId = null } = {}) {
  const p      = await profile.load();
  const lower  = text.toLowerCase();

  // ── Core values (40 pts) ──────────────────────────────────────────────────
  const coreValues = Object.entries(p.core_values);
  let coreScore = 0;
  const triggeredValues = [];
  for (const [key, val] of coreValues) {
    const keywords = val.keywords || [];
    if (keywords.some(kw => lower.includes(kw.toLowerCase()))) {
      coreScore += 8;
      triggeredValues.push(val.text || key);
    }
  }
  coreScore = Math.min(40, coreScore);

  // ── Strategic values (20 pts) ─────────────────────────────────────────────
  const strategicValues = Object.entries(p.strategic_values);
  let strategicScore = 0;
  for (const [, val] of strategicValues) {
    const keywords = val.keywords || [];
    if (keywords.some(kw => lower.includes(kw.toLowerCase()))) {
      strategicScore += 4;
    }
  }
  strategicScore = Math.min(20, strategicScore);

  // ── Principle compliance (20 pts) ────────────────────────────────────────
  const principles = Array.isArray(p.principles) ? p.principles : [];
  let principleScore = 20; // start full, deduct for violations
  for (const principle of principles) {
    const violationKeywords = principle.violation_keywords || [];
    if (violationKeywords.some(kw => lower.includes(kw.toLowerCase()))) {
      principleScore -= 5;
    }
  }
  principleScore = Math.max(0, principleScore);

  // ── Anti-goal penalty (up to -40) ─────────────────────────────────────────
  const antiGoals = Array.isArray(p.anti_goals) ? p.anti_goals : [];
  let antiGoalPenalty = 0;
  const triggeredAntiGoals = [];
  for (const ag of antiGoals) {
    const keywords = ag.keywords || [];
    if (keywords.some(kw => lower.includes(kw.toLowerCase()))) {
      const penalty = ag.severity === 'critical' ? 12 : 8;
      antiGoalPenalty += penalty;
      triggeredAntiGoals.push(ag.text || '');
    }
  }
  antiGoalPenalty = Math.min(40, antiGoalPenalty);

  // ── Risk profile fit (10 pts) ─────────────────────────────────────────────
  // Full points if no extreme risk language; partial if moderate risk; zero for reckless language
  let riskScore = 10;
  if (/bet everything|all.in without|100% of.*capital|no contingency/i.test(text)) riskScore = 0;
  else if (/risky|uncertain outcome|speculative|unproven/i.test(text)) riskScore = 5;

  // ── Peak state alignment (10 pts) ─────────────────────────────────────────
  const peakKeywords = p.peak_state?.keywords || ['focus', 'build', 'execute', 'momentum', 'output'];
  let peakScore = 0;
  if (peakKeywords.some(kw => lower.includes(kw.toLowerCase()))) peakScore = 10;

  // ── Failure pattern detection ─────────────────────────────────────────────
  const failureWarnings = p.failure_pattern?.early_warning_keywords || [];
  const failureRisk = failureWarnings.some(kw => lower.includes(kw.toLowerCase()));

  // ── Compute final score ───────────────────────────────────────────────────
  const raw = coreScore + strategicScore + principleScore - antiGoalPenalty + riskScore + peakScore;
  const finalScore = Math.max(0, Math.min(100, raw));

  const breakdown = { core_value_score: coreScore, strategic_value_score: strategicScore, principle_score: principleScore, anti_goal_penalty: antiGoalPenalty, risk_score: riskScore, peak_state_score: peakScore };

  const recommendation = _recommend(finalScore, triggeredAntiGoals, failureRisk);
  const rationale      = _rationale(finalScore, triggeredValues, triggeredAntiGoals, failureRisk);

  const result = { score: finalScore, breakdown, triggered_values: triggeredValues, triggered_anti_goals: triggeredAntiGoals, recommendation, rationale, failure_pattern_risk: failureRisk };

  // Persist to alignment log (fire-and-forget)
  setImmediate(() => _persist(subjectType, subjectId, text, result).catch(() => {}));

  return result;
}

function _recommend(score, antiGoals, failureRisk) {
  if (antiGoals.some(ag => /privacy|potential/i.test(ag))) return 'reject';
  if (score >= 70) return 'proceed';
  if (score >= 50) return 'proceed_with_caution';
  if (score >= 30 || failureRisk) return 'defer';
  return 'reject';
}

function _rationale(score, values, antiGoals, failureRisk) {
  const parts = [];
  if (values.length) parts.push(`Aligns with: ${values.join(', ')}.`);
  if (antiGoals.length) parts.push(`WARNING — touches anti-goals: ${antiGoals.join(', ')}.`);
  if (failureRisk) parts.push(`Failure pattern risk: early warning keywords detected.`);
  if (score >= 70) parts.push('Strong founder alignment.');
  else if (score < 40) parts.push('Weak alignment — reconsider framing or scope.');
  return parts.join(' ') || 'Neutral alignment.';
}

async function _persist(subjectType, subjectId, text, result) {
  await _sb().from('founder_alignment_log').insert({
    subject_type:         subjectType,
    subject_id:           subjectId,
    subject_text:         text.slice(0, 500),
    score:                result.score,
    breakdown:            result.breakdown,
    triggered_values:     result.triggered_values,
    triggered_anti_goals: result.triggered_anti_goals,
    recommendation:       result.recommendation,
  });
}

// batchScore — score multiple items; returns sorted by score desc
async function batchScore(items, { subjectType = 'batch' } = {}) {
  const results = await Promise.all(
    items.map(item => score(item.text || item, { subjectType, subjectId: item.id }))
  );
  return items.map((item, i) => ({ item, alignment: results[i] }))
    .sort((a, b) => b.alignment.score - a.alignment.score);
}

// getHistory — recent alignment log entries
async function getHistory({ subjectType = null, limit = 20, minScore = null } = {}) {
  let q = _sb().from('founder_alignment_log')
    .select('*')
    .order('computed_at', { ascending: false })
    .limit(limit);
  if (subjectType) q = q.eq('subject_type', subjectType);
  if (minScore !== null) q = q.gte('score', minScore);
  const { data } = await q;
  return data || [];
}

module.exports = { score, batchScore, getHistory };
