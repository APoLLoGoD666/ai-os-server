'use strict';

/**
 * Dashboard Summary
 * Produces a single daily financial briefing from all intelligence modules.
 */

const { analyseCashflow } = require('./cashflow-engine');
const { categoryAnalysis, subscriptionIdentification, lifestyleCreepDetection, unusualSpendingAlerts } = require('./spending-intelligence');
const { evaluateAllGoals, goalsSummary } = require('./goal-engine');
const { allOpportunities } = require('./opportunity-engine');
const { computeHealthScore } = require('./financial-health-score');

/**
 * Generate the daily financial briefing.
 *
 * @param {Object} params
 * @param {Object[]} params.transactions
 * @param {string}  params.liquidBalanceCents
 * @param {Object[]} params.goals
 * @param {Object}  params.contributionsByGoalId
 * @param {Object[]} params.upcomingObligations
 * @param {Object[]} params.debts
 * @param {string[]} params.unknownFields
 * @param {string}  params.asOf - ISO date string
 * @returns {Object}
 */
function generateDailySummary({
  transactions = [],
  liquidBalanceCents = '0',
  goals = [],
  contributionsByGoalId = {},
  upcomingObligations = [],
  debts = [],
  unknownFields = [],
  asOf = new Date().toISOString().slice(0, 10),
} = {}) {

  // ── Cashflow ──────────────────────────────────────────────────────────────
  const cashflow = analyseCashflow(transactions, liquidBalanceCents, asOf);

  const avgMonthlyOutflowCents = cashflow.monthlySummaries.length > 0
    ? (
        cashflow.monthlySummaries.reduce((a, s) => a + BigInt(s.outflowCents), 0n) /
        BigInt(cashflow.monthlySummaries.length)
      ).toString()
    : '0';

  // ── Spending ──────────────────────────────────────────────────────────────
  const topCategories = categoryAnalysis(transactions).slice(0, 5);
  const subscriptions = subscriptionIdentification(transactions);
  const lifestyleCreep = lifestyleCreepDetection(transactions);
  const unusualSpend = unusualSpendingAlerts(transactions).slice(0, 5);

  // ── Goals ─────────────────────────────────────────────────────────────────
  const goalEvaluations = evaluateAllGoals(goals, contributionsByGoalId);
  const goalsSum = goalsSummary(goalEvaluations);

  // ── Opportunities ─────────────────────────────────────────────────────────
  const opportunities = allOpportunities({
    subscriptions,
    transactions,
    liquidBalanceCents,
    monthlySummaries: cashflow.monthlySummaries,
    debts,
  }).slice(0, 5);

  // ── Savings transactions (for health score) ───────────────────────────────
  const savingsKeywords = ['savings', 'isa', 'pension', 'invest'];
  const savingsTxns = transactions.filter(t =>
    t.direction === 'out' &&
    savingsKeywords.some(kw => (t.description || '').toLowerCase().includes(kw))
  );

  // ── Health Score ──────────────────────────────────────────────────────────
  const healthScore = computeHealthScore({
    liquidBalanceCents,
    avgMonthlyOutflowCents,
    monthlySummaries: cashflow.monthlySummaries,
    subscriptions,
    goalsSummary: goalsSum,
    upcomingObligations,
    savingsTxns,
    trendResult: cashflow.trend,
    anomalies: cashflow.anomalies,
    unknownFields,
  });

  // ── Emerging Risks ────────────────────────────────────────────────────────
  const emergingRisks = [];

  if (cashflow.trend.trend === 'deteriorating' || cashflow.trend.trend === 'mostly_deteriorating') {
    emergingRisks.push({
      type: 'deteriorating_cashflow',
      severity: cashflow.trend.trend === 'deteriorating' ? 'high' : 'medium',
      detail: `Cashflow has been ${cashflow.trend.trend} over the past ${cashflow.trend.windowMonths} months`,
    });
  }

  for (const anomaly of cashflow.anomalies) {
    emergingRisks.push({
      type: 'cashflow_anomaly',
      severity: 'medium',
      detail: `${anomaly.month}: ${anomaly.anomalyType}`,
    });
  }

  for (const creep of lifestyleCreep) {
    emergingRisks.push({
      type: 'lifestyle_creep',
      severity: 'low',
      detail: `${creep.category} spending up ~${Math.round(creep.changeBps / 100)}% over ${creep.windowMonths} months`,
    });
  }

  for (const alert of unusualSpend) {
    emergingRisks.push({
      type: 'unusual_spend',
      severity: 'low',
      detail: `${alert.vendor} on ${alert.date}: ${Math.round(alert.deviationBps / 100)}% above typical`,
    });
  }

  if (goalsSum.atRisk > 0) {
    emergingRisks.push({
      type: 'goals_at_risk',
      severity: 'medium',
      detail: `${goalsSum.atRisk} goal(s) at risk of missing target`,
    });
  }

  // ── Momentum (positive signals) ───────────────────────────────────────────
  const momentum = [];

  if (cashflow.trend.trend === 'improving' || cashflow.trend.trend === 'mostly_improving') {
    momentum.push(`Cashflow trend is ${cashflow.trend.trend}`);
  }
  if (goalsSum.complete > 0) {
    momentum.push(`${goalsSum.complete} goal(s) completed`);
  }
  if (goalsSum.onTrack > 0) {
    momentum.push(`${goalsSum.onTrack} goal(s) on track`);
  }
  if (cashflow.surplus.length > 0) {
    momentum.push(`Surplus capacity observed in ${cashflow.surplus.length} recent month(s)`);
  }

  // ── Unknowns ──────────────────────────────────────────────────────────────
  const allUnknowns = [
    ...unknownFields,
    ...healthScore.unknowns.filter(u => !unknownFields.includes(u)),
  ];

  // ── Snapshot ──────────────────────────────────────────────────────────────
  const upcomingTotal = upcomingObligations
    .reduce((a, o) => a + BigInt(o.amountCents), 0n)
    .toString();

  return {
    asOf,
    financialSnapshot: {
      liquidBalanceCents,
      rolling30NetCents: cashflow.rolling30.netCents,
      rolling90NetCents: cashflow.rolling90.netCents,
      upcomingObligationsTotal: upcomingTotal,
      obligationCount: upcomingObligations.length,
      topSpendingCategories: topCategories,
    },
    emergingRisks,
    opportunities,
    momentum,
    goals: {
      summary: goalsSum,
      atRiskGoals: goalEvaluations
        .filter(e => e.obstacles?.some(o => o.severity === 'high'))
        .map(e => ({ id: e.goalId, label: e.label, obstacles: e.obstacles })),
    },
    healthScore: {
      score: healthScore.healthScore,
      confidence: healthScore.confidence,
      strengths: healthScore.strengths,
      concerns: healthScore.concerns,
    },
    unknowns: allUnknowns,
    dataCompleteness: allUnknowns.length === 0 ? 'complete'
      : allUnknowns.length <= 3 ? 'partial'
      : 'limited',
  };
}

/**
 * Render the briefing as plain text for human reading.
 */
function renderTextBriefing(summary) {
  const lines = [];
  const fmt = (cents) => `£${(Number(BigInt(cents)) / 100).toFixed(2)}`;

  lines.push(`═══ APEX Financial Briefing — ${summary.asOf} ═══`);
  lines.push('');

  lines.push('── Financial Snapshot ──');
  lines.push(`Liquid balance: ${fmt(summary.financialSnapshot.liquidBalanceCents)}`);
  lines.push(`30-day net cashflow: ${fmt(summary.financialSnapshot.rolling30NetCents)}`);
  lines.push(`90-day net cashflow: ${fmt(summary.financialSnapshot.rolling90NetCents)}`);
  if (summary.financialSnapshot.obligationCount > 0) {
    lines.push(`Upcoming obligations: ${fmt(summary.financialSnapshot.upcomingObligationsTotal)} (${summary.financialSnapshot.obligationCount} items)`);
  }

  if (summary.financialSnapshot.topSpendingCategories.length > 0) {
    lines.push('');
    lines.push('Top spending categories:');
    for (const c of summary.financialSnapshot.topSpendingCategories) {
      lines.push(`  ${c.category}: ${fmt(c.totalCents)} (${(c.shareOfSpendBps / 100).toFixed(1)}%)`);
    }
  }

  if (summary.emergingRisks.length > 0) {
    lines.push('');
    lines.push('── Emerging Risks ──');
    for (const r of summary.emergingRisks) {
      const badge = r.severity === 'high' ? '[!]' : r.severity === 'medium' ? '[~]' : '[-]';
      lines.push(`${badge} ${r.detail}`);
    }
  }

  if (summary.opportunities.length > 0) {
    lines.push('');
    lines.push('── Opportunities ──');
    for (const o of summary.opportunities) {
      lines.push(`  • ${o.title} [${o.confidence} confidence]`);
    }
  }

  if (summary.momentum.length > 0) {
    lines.push('');
    lines.push('── Momentum ──');
    for (const m of summary.momentum) {
      lines.push(`  ✓ ${m}`);
    }
  }

  lines.push('');
  lines.push('── Health Score ──');
  lines.push(`Overall: ${summary.healthScore.score}/100 (confidence: ${summary.healthScore.confidence})`);
  for (const s of summary.healthScore.strengths) lines.push(`  + ${s}`);
  for (const c of summary.healthScore.concerns) lines.push(`  - ${c}`);

  if (summary.unknowns.length > 0) {
    lines.push('');
    lines.push('── Unknowns / Incomplete Data ──');
    for (const u of summary.unknowns) lines.push(`  ? ${u}`);
  }

  return lines.join('\n');
}

module.exports = { generateDailySummary, renderTextBriefing };
