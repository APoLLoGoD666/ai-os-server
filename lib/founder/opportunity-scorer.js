'use strict';
// lib/founder/opportunity-scorer.js
// Scores any opportunity against the founder profile.
// Returns a composite score plus recommended executive owner derived from value match.

const alignment = require('./alignment-engine');
const antiGoal  = require('./anti-goal-monitor');
const profile   = require('./profile');

// EXECUTIVE_DOMAIN_MAP — maps strategic value match to best executive owner
const EXECUTIVE_DOMAIN_MAP = {
  wealth:     'cfo',
  financial:  'cfo',
  capability: 'cto',
  technology: 'cto',
  health:     'coo',   // operations/personal performance
  security:   'cto',
  knowledge:  'cio',
  growth:     'cgo',
  strategy:   'cso',
  legacy:     'cso',
};

// score — compute full founder alignment score for an opportunity
// opportunity: { title, description, category, urgency, expected_value }
async function score(opportunity) {
  const text = [
    opportunity.title         || '',
    opportunity.description   || '',
    opportunity.category      || '',
    opportunity.expected_value || '',
  ].join(' ').toLowerCase();

  // Alignment score (deterministic rule-based)
  const alignmentResult = await alignment.score(text, { subjectType: 'opportunity', subjectId: opportunity.id });

  // Anti-goal check
  const agCheck = await antiGoal.check(text, { triggerSource: 'opportunity', triggerId: opportunity.id });

  // Risk fit check
  const p = await profile.load();
  const riskTolerance = p.identity?.risk_profile?.financial_tolerance || 0.40;
  const riskFit = !(/guaranteed loss|no upside|certain failure/i.test(text));

  // Value multiplier: how many core values does this touch?
  const touchedCoreValues = alignmentResult.triggered_values.length;
  const valueMultiplier   = Math.min(2.0, 1.0 + (touchedCoreValues * 0.2));

  // Urgency factor
  const urgencyFactors = { immediate: 1.0, this_week: 0.9, this_month: 0.7, this_quarter: 0.5 };
  const urgencyFactor  = urgencyFactors[opportunity.urgency] || 0.6;

  // Composite: alignment × value multiplier × urgency factor, clamped 0-100
  const composite = Math.round(
    Math.min(100, alignmentResult.score * valueMultiplier * urgencyFactor)
  );

  // Derive executive owner from category + triggered strategic values
  const execOwner = _deriveExecOwner(opportunity.category, alignmentResult.triggered_values);

  const recommended = composite >= 50 && agCheck.clean && riskFit;

  return {
    composite,
    founder_alignment: alignmentResult.score,
    value_multiplier:  valueMultiplier,
    urgency_factor:    urgencyFactor,
    risk_fit:          riskFit,
    anti_goal_clean:   agCheck.clean,
    anti_goal_result:  agCheck,
    recommended,
    executive_owner:   execOwner,
    rationale:         alignmentResult.rationale,
    triggered_values:  alignmentResult.triggered_values,
  };
}

// scoreAll — score a list of opportunities and sort by composite desc
async function scoreAll(opportunities) {
  const scored = await Promise.all(
    opportunities.map(async opp => ({ ...opp, founder_score: await score(opp) }))
  );
  return scored.sort((a, b) => b.founder_score.composite - a.founder_score.composite);
}

function _deriveExecOwner(category, triggeredValues) {
  // Direct category match
  const cat = (category || '').toLowerCase();
  for (const [domain, exec] of Object.entries(EXECUTIVE_DOMAIN_MAP)) {
    if (cat.includes(domain)) return exec;
  }
  // Fall back to first triggered value
  for (const val of triggeredValues) {
    const lower = val.toLowerCase();
    for (const [domain, exec] of Object.entries(EXECUTIVE_DOMAIN_MAP)) {
      if (lower.includes(domain)) return exec;
    }
  }
  return 'cgo'; // Chief Growth Officer is default for unmatched opportunities
}

module.exports = { score, scoreAll };
