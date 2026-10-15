'use strict';

/**
 * Financial Health Score
 * Holistic view across 8 dimensions.
 * Unknowns reduce confidence — health cannot improve through missing data.
 * Optimism requires evidence.
 */

const DIMENSIONS = [
  'liquidity',
  'consistency',
  'resilience',
  'obligation_coverage',
  'savings_discipline',
  'spending_stability',
  'goal_adherence',
];

/**
 * Compute the full financial health score.
 *
 * @param {Object} params
 * @param {string} params.liquidBalanceCents
 * @param {string} params.avgMonthlyOutflowCents
 * @param {Object[]} params.monthlySummaries        - from cashflow-engine
 * @param {Object[]} params.subscriptions           - from spending-intelligence
 * @param {Object} params.goalsSummary              - from goal-engine
 * @param {Object[]} params.upcomingObligations     - [{dueDateIso, amountCents, label}]
 * @param {Object[]} params.savingsTxns             - outflow transactions tagged as savings
 * @param {Object} params.trendResult               - from cashflow-engine trendDirection()
 * @param {Object[]} params.anomalies               - from cashflow-engine anomalyIdentification()
 * @param {string[]} params.unknownFields           - list of fields not supplied / not available
 * @returns {Object}
 */
function computeHealthScore({
  liquidBalanceCents = '0',
  avgMonthlyOutflowCents = '0',
  monthlySummaries = [],
  subscriptions = [],
  goalsSummary = {},
  upcomingObligations = [],
  savingsTxns = [],
  trendResult = {},
  anomalies = [],
  unknownFields = [],
} = {}) {
  const scores = {};
  const strengths = [];
  const concerns = [];
  const unknowns = [...unknownFields];

  // ── 1. Liquidity ─────────────────────────────────────────────────────────
  {
    const liquid = BigInt(liquidBalanceCents);
    const avgOut = BigInt(avgMonthlyOutflowCents);
    let score = 0;
    let note = '';

    if (avgOut === 0n) {
      unknowns.push('average_monthly_outflow');
      score = 50;
      note = 'cannot calculate months of runway without outflow data';
    } else {
      const runwayMonths = liquid / avgOut;
      if (runwayMonths >= 6n) { score = 100; strengths.push('Strong liquidity buffer (6+ months runway)'); }
      else if (runwayMonths >= 3n) { score = 75; }
      else if (runwayMonths >= 1n) { score = 40; concerns.push('Liquidity below 3-month threshold'); }
      else { score = 10; concerns.push('Critical: less than 1 month of runway'); }
      note = `~${runwayMonths.toString()} months estimated runway`;
    }

    scores.liquidity = { score, note, weight: 2 };
  }

  // ── 2. Consistency ───────────────────────────────────────────────────────
  {
    if (monthlySummaries.length < 3) {
      unknowns.push('insufficient_monthly_history_for_consistency');
      scores.consistency = { score: 50, note: 'need 3+ months of data', weight: 1 };
    } else {
      const positiveMonths = monthlySummaries.filter(s => BigInt(s.netCents) > 0n).length;
      const ratio = positiveMonths / monthlySummaries.length;
      const score = Math.round(ratio * 100);
      if (ratio >= 0.8) strengths.push('Consistently positive monthly cashflow');
      else if (ratio < 0.5) concerns.push('More months negative than positive');
      scores.consistency = { score, note: `${positiveMonths}/${monthlySummaries.length} positive months`, weight: 1 };
    }
  }

  // ── 3. Resilience ────────────────────────────────────────────────────────
  {
    const trend = trendResult.trend;
    let score = 50;
    let note = '';

    if (!trend || trend === 'insufficient_data') {
      unknowns.push('trend_data');
      note = 'trend data not available';
    } else if (trend === 'improving') {
      score = 90; strengths.push('Cashflow trend is improving');
      note = 'improving trend';
    } else if (trend === 'mostly_improving') {
      score = 70; note = 'mostly improving trend';
    } else if (trend === 'flat') {
      score = 55; note = 'flat trend';
    } else if (trend === 'mostly_deteriorating') {
      score = 35; concerns.push('Cashflow trend is mostly deteriorating');
      note = 'mostly deteriorating';
    } else if (trend === 'deteriorating') {
      score = 15; concerns.push('Cashflow trend is deteriorating');
      note = 'deteriorating trend';
    }

    if (anomalies.length > 2) {
      score = Math.max(10, score - 15);
      concerns.push(`${anomalies.length} cashflow anomalies detected`);
    }

    scores.resilience = { score, note, weight: 1 };
  }

  // ── 4. Obligation Coverage ───────────────────────────────────────────────
  {
    if (upcomingObligations.length === 0) {
      unknowns.push('upcoming_obligations');
      scores.obligation_coverage = { score: 50, note: 'no obligation data supplied', weight: 1.5 };
    } else {
      const liquid = BigInt(liquidBalanceCents);
      const totalDue = upcomingObligations.reduce((a, o) => a + BigInt(o.amountCents), 0n);
      const canCover = liquid >= totalDue;
      const score = canCover ? 90 : Math.max(0, Math.round(Number((liquid * 100n) / totalDue)));

      if (canCover) strengths.push('Liquid balance covers all upcoming obligations');
      else concerns.push('Liquid balance may not cover all upcoming obligations');

      scores.obligation_coverage = {
        score,
        note: `${upcomingObligations.length} obligations totalling ${totalDue.toString()} cents`,
        weight: 1.5,
      };
    }
  }

  // ── 5. Savings Discipline ────────────────────────────────────────────────
  {
    if (savingsTxns.length === 0 && monthlySummaries.length > 0) {
      unknowns.push('savings_activity');
      scores.savings_discipline = { score: 30, note: 'no savings transactions observed', weight: 1 };
      concerns.push('No savings activity observed');
    } else if (savingsTxns.length > 0 && monthlySummaries.length > 0) {
      const savingMonths = new Set(savingsTxns.map(t => {
        const d = new Date(t.date);
        return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
      }));
      const ratio = savingMonths.size / monthlySummaries.length;
      const score = Math.min(100, Math.round(ratio * 110));
      if (ratio >= 0.75) strengths.push('Regular savings activity observed');
      scores.savings_discipline = {
        score,
        note: `savings in ${savingMonths.size}/${monthlySummaries.length} months`,
        weight: 1,
      };
    } else {
      unknowns.push('savings_baseline');
      scores.savings_discipline = { score: 50, note: 'insufficient data', weight: 1 };
    }
  }

  // ── 6. Spending Stability ────────────────────────────────────────────────
  {
    if (monthlySummaries.length < 3) {
      unknowns.push('spending_history');
      scores.spending_stability = { score: 50, note: 'insufficient history', weight: 1 };
    } else {
      const outflows = monthlySummaries.map(s => BigInt(s.outflowCents));
      const mean = outflows.reduce((a, b) => a + b, 0n) / BigInt(outflows.length);
      if (mean === 0n) {
        scores.spending_stability = { score: 50, note: 'zero outflow average', weight: 1 };
      } else {
        const maxDeviation = outflows.reduce((max, v) => {
          const diff = v > mean ? v - mean : mean - v;
          return diff > max ? diff : max;
        }, 0n);
        const deviationBps = Number((maxDeviation * 10000n) / mean);
        const score = deviationBps < 1000 ? 90
          : deviationBps < 2500 ? 70
          : deviationBps < 5000 ? 50
          : 25;
        if (deviationBps >= 5000) concerns.push('High spending variability month-to-month');
        scores.spending_stability = {
          score,
          note: `max deviation ${Math.round(deviationBps / 100)}% from mean`,
          weight: 1,
        };
      }
    }
  }

  // ── 7. Goal Adherence ────────────────────────────────────────────────────
  {
    const total = goalsSummary.total ?? 0;
    if (total === 0) {
      unknowns.push('goal_data');
      scores.goal_adherence = { score: 50, note: 'no goals defined', weight: 1 };
    } else {
      const onTrack = (goalsSummary.onTrack ?? 0) + (goalsSummary.complete ?? 0);
      const ratio = onTrack / total;
      const score = Math.round(ratio * 100);
      if (ratio >= 0.75) strengths.push('Most financial goals on track');
      else if (ratio < 0.25) concerns.push('Most financial goals off track or stalled');
      scores.goal_adherence = {
        score,
        note: `${onTrack}/${total} goals on track or complete`,
        weight: 1,
      };
    }
  }

  // ── Aggregate ────────────────────────────────────────────────────────────
  let totalWeight = 0;
  let weightedSum = 0;
  for (const dim of DIMENSIONS) {
    const d = scores[dim];
    if (!d) continue;
    weightedSum += d.score * d.weight;
    totalWeight += d.weight;
  }

  const rawScore = totalWeight > 0 ? Math.round(weightedSum / totalWeight) : 50;

  // Unknowns reduce confidence
  const unknownPenalty = Math.min(40, unknowns.length * 8);
  const confidence =
    unknowns.length === 0 ? 'medium'
    : unknowns.length <= 2 ? 'low'
    : 'very_low';

  const healthScore = Math.max(0, Math.min(100, rawScore));

  return {
    healthScore,
    confidence,
    subscores: Object.fromEntries(
      DIMENSIONS.map(d => [d, scores[d] ? { score: scores[d].score, note: scores[d].note } : null])
    ),
    strengths,
    concerns,
    unknowns,
    unknownPenaltyApplied: unknownPenalty,
    note: unknowns.length > 0
      ? `Score confidence reduced due to ${unknowns.length} unknown(s)`
      : null,
  };
}

module.exports = { computeHealthScore, DIMENSIONS };
