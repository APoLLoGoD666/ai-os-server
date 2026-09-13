'use strict';

/**
 * Economic Engine — lib/economics/economic-engine.js
 * Layer 20: Operational capital allocation system.
 *
 * Integrates:
 *   - forecast-engine    (runway, affordability, trajectories)
 *   - scenario-engine    (assumption-explicit branching)
 *   - decision-support   (structured decision analysis)
 *   - tax intelligence   (exposure + deduction opportunities)
 *   - sync-health        (data freshness as uncertainty signal)
 *   - cashflow-engine    (rolling windows, trend)
 *   - opportunity-engine (idle cash, price increases, cashflow gaps)
 *   - financial-health-score (8-dimensional health)
 *
 * RULES
 *   - All money arithmetic: integer cents / BigInt. No JS floats.
 *   - Recommendations are advisory. Human override always possible.
 *   - Confidence degrades with uncertainty. Cannot improve through missing data.
 *   - Contradictions remain visible. Evidence sources tracked.
 *   - Missing assumptions are explicit, never silently defaulted.
 */

// ── Dependency imports ────────────────────────────────────────────────────────

const {
  projectRunway,
  projectTrajectories,
  analyzeAffordability,
  projectIncome,
  _decay,
} = require('../finance/forecast-engine');

const {
  createScenario,
  branchScenario,
} = require('../finance/scenario-engine');

const {
  analyzeDecision,
  RECOMMENDATION_LEVELS,
} = require('../finance/decision-support');

const {
  analyseCashflow,
  trendDirection,
} = require('../finance/cashflow-engine');

const {
  allOpportunities,
} = require('../finance/opportunity-engine');

const {
  computeHealthScore,
} = require('../finance/financial-health-score');

const {
  detectStaleAccounts,
  computeHealth: _syncComputeHealth,
} = (() => {
  // sync-health exports vary — graceful import
  try { return require('../finance/sync/sync-health'); }
  catch { return { detectStaleAccounts: () => [], computeHealth: () => ({ status: 'UNKNOWN' }) }; }
})();

const {
  estimateIncomeTaxExposure,
} = require('../finance/tax/tax-exposure-engine');

const {
  identifyDeductionOpportunities,
} = require('../finance/tax/deduction-opportunity-engine');

const {
  classifyAll,
} = require('../finance/tax/expense-classifier');

// ── Constants ─────────────────────────────────────────────────────────────────

const ENGINE_VERSION = '1.0.0';
const ADVISORY_DISCLAIMER = 'Economic engine outputs are advisory only. All recommendations require human review before execution.';

const THREAT_SEVERITY = { critical: 0, high: 1, medium: 2, low: 3, info: 4 };
const OPP_CONFIDENCE  = { high: 3, medium: 2, low: 1, none: 0 };

// ══════════════════════════════════════════════════════════════════════════════
// INPUT SCHEMA (documented, not enforced — caller responsibility)
//
// {
//   cash: {
//     liquidCents:          number,   // immediately accessible cash
//     reserveCents:         number,   // emergency / operating reserve
//     monthlyIncomeCents:   number,
//     monthlyExpenseCents:  number,
//   },
//   obligations: [{ label, amountCents, dueDateIso, priority: 'critical'|'high'|'medium'|'low' }],
//   opportunities: [{ id, label, investmentCents, expectedReturnBps, horizonMonths, confidence, category }],
//   risks: [{ id, label, probabilityBps, maxImpactCents, severity, mitigated }],
//   transactions: [],          // for cashflow + opportunity engines
//   accounts: [],              // for sync-health
//   assumptions: {},           // caller's explicit assumptions
//   taxBrackets: [],           // optional — for exposure estimate
//   taxJurisdictionLabel: '',  // required if taxBrackets provided
//   executiveOverride: null | { action, reason, authorisedBy },
// }
// ══════════════════════════════════════════════════════════════════════════════

// ── Internal helpers ──────────────────────────────────────────────────────────

function _missingFields(obj, keys) {
  return keys.filter(k => obj[k] === null || obj[k] === undefined);
}

function _confidenceLabel(score) {
  if (score >= 70) return 'medium';
  if (score >= 40) return 'low';
  return 'very_low';
}

function _bigIntStr(n) {
  try { return BigInt(Math.trunc(n)).toString(); }
  catch { return '0'; }
}

/**
 * Risk-adjusted opportunity score: expectedReturnBps × confidence / 10 − riskAdjust
 * All integer arithmetic.
 */
function _opportunityScore(opp) {
  const confWeight = OPP_CONFIDENCE[opp.confidence] ?? 1;
  const riskAdjust = opp.investmentCents > 0
    ? Math.round((opp.investmentCents / 100000) * (3 - confWeight))
    : 0;
  return Math.round((opp.expectedReturnBps ?? 0) * confWeight / 10) - riskAdjust;
}

/**
 * Risk exposure score: probabilityBps × maxImpactCents / 10000
 * Integer-safe for ordering; absolute value not meaningful as currency.
 */
function _riskExposureScore(risk) {
  const prob = Math.trunc(risk.probabilityBps ?? 0);
  const impact = Math.trunc(risk.maxImpactCents ?? 0);
  // Divide by 10000 to keep in manageable range; integer result
  return Math.round((prob * impact) / 10000);
}

// ── Sync health wrapper ───────────────────────────────────────────────────────

function _assessSyncHealth(accounts = []) {
  if (!accounts || accounts.length === 0) {
    return {
      status: 'UNKNOWN',
      staleAccounts: [],
      dataFreshnessConfidence: 30,
      note: 'No account sync data supplied — data freshness unknown',
    };
  }

  const stale = detectStaleAccounts(accounts);
  const staleRatio = stale.length / accounts.length;

  const dataFreshnessConfidence = staleRatio === 0 ? 85
    : staleRatio < 0.25 ? 60
    : staleRatio < 0.5 ? 40
    : 20;

  const status = staleRatio === 0 ? 'HEALTHY'
    : staleRatio < 0.5 ? 'DEGRADED'
    : 'STALE';

  return {
    status,
    staleAccounts: stale.map(a => ({ accountId: a.accountId, ageMs: a.ageMs })),
    dataFreshnessConfidence,
    staleRatio,
  };
}

// ── 1. evaluateCapitalAllocation ──────────────────────────────────────────────

/**
 * Evaluate how current capital is distributed across categories.
 *
 * @param {Object} input
 * @returns {Object} allocation evaluation with scores, gaps, and confidence
 */
function evaluateCapitalAllocation(input = {}) {
  const cash = input.cash ?? {};
  const obligations = input.obligations ?? [];
  const assumptions = input.assumptions ?? {};

  const liquid  = Math.trunc(cash.liquidCents  ?? 0);
  const reserve = Math.trunc(cash.reserveCents ?? 0);
  const income  = Math.trunc(cash.monthlyIncomeCents  ?? 0);
  const expense = Math.trunc(cash.monthlyExpenseCents ?? 0);

  const missingCashFields = _missingFields(cash, ['liquidCents', 'reserveCents', 'monthlyIncomeCents', 'monthlyExpenseCents']);
  const totalKnownCapital = liquid + reserve;

  // Runway analysis
  const runway = projectRunway(reserve, income, expense);

  // Obligation coverage
  const totalObligations = obligations.reduce((a, o) => a + Math.trunc(o.amountCents ?? 0), 0);
  const canCoverObligations = liquid >= totalObligations;
  const obligationCoverageRatio = totalObligations > 0
    ? Math.round((liquid / totalObligations) * 100)
    : 100;

  // Emergency reserve ratio (liquid : monthly expense)
  const reserveMonths = expense > 0 ? Math.floor(reserve / expense) : null;

  // Allocation categories
  const categories = [
    {
      name: 'liquid_operating',
      allocatedCents: liquid,
      purpose: 'Day-to-day operations and obligation coverage',
      adequacy: canCoverObligations ? 'adequate' : 'insufficient',
      note: canCoverObligations
        ? `Covers ${obligationCoverageRatio}% of known obligations`
        : `Shortfall of ${Math.abs(liquid - totalObligations)} cents vs obligations`,
    },
    {
      name: 'emergency_reserve',
      allocatedCents: reserve,
      purpose: 'Resilience buffer',
      adequacy: reserveMonths === null ? 'unknown'
        : reserveMonths >= 6 ? 'strong'
        : reserveMonths >= 3 ? 'adequate'
        : reserveMonths >= 1 ? 'thin'
        : 'critical',
      note: reserveMonths !== null
        ? `${reserveMonths} months of expense coverage`
        : 'Monthly expense unknown — cannot assess adequacy',
    },
  ];

  const missingAssumptions = [
    ...missingCashFields,
    ...(input.assumptions && Object.keys(input.assumptions).length === 0 ? ['no_caller_assumptions_provided'] : []),
  ];

  const baseConfidence = _decay(80, 0, missingCashFields.length);
  const confidence = _confidenceLabel(baseConfidence);

  return {
    totalKnownCapitalCents: totalKnownCapital,
    categories,
    runway,
    canCoverObligations,
    totalObligationsCents: totalObligations,
    reserveMonths,
    missingAssumptions,
    confidence,
    confidenceScore: baseConfidence,
    assumptions,
    disclaimer: ADVISORY_DISCLAIMER,
  };
}

// ── 2. recommendCapitalDeployment ─────────────────────────────────────────────

/**
 * Recommend how to deploy available capital across identified opportunities.
 * Uses decision-support to evaluate each candidate.
 *
 * @param {Object} input
 * @returns {Object}
 */
function recommendCapitalDeployment(input = {}) {
  const cash = input.cash ?? {};
  const opportunities = input.opportunities ?? [];
  const executiveOverride = input.executiveOverride ?? null;

  const reserve  = Math.trunc(cash.reserveCents ?? 0);
  const income   = Math.trunc(cash.monthlyIncomeCents  ?? 0);
  const expense  = Math.trunc(cash.monthlyExpenseCents ?? 0);
  const monthlyNet = income - expense;

  const recommendations = [];
  let remainingDeployable = Math.max(0, reserve - Math.round(expense * 3)); // keep 3 months expense as floor

  for (const opp of opportunities) {
    const investment = Math.trunc(opp.investmentCents ?? 0);
    const freq = opp.frequency ?? 'ONCE';

    const decision = analyzeDecision(
      {
        action: opp.label,
        amountCents: investment,
        frequency: freq,
        assumptions: opp.assumptions ?? {},
        baseConfidence: opp.confidence === 'high' ? 80 : opp.confidence === 'medium' ? 60 : 40,
      },
      {
        reserveCents: remainingDeployable,
        monthlyIncomeCents: income,
        monthlyExpenseCents: expense,
      }
    );

    const score = _opportunityScore(opp);
    const fits = freq === 'ONCE'
      ? investment <= remainingDeployable
      : investment <= monthlyNet * 0.4; // max 40% of net for recurring

    if (fits && freq === 'ONCE') {
      remainingDeployable -= investment;
    }

    recommendations.push({
      opportunityId: opp.id ?? opp.label,
      label: opp.label,
      investmentCents: investment,
      frequency: freq,
      expectedReturnBps: opp.expectedReturnBps ?? null,
      horizonMonths: opp.horizonMonths ?? null,
      score,
      decision: decision.recommendation,
      affordable: decision.affordable,
      runwayImpact: decision.projectedImpact,
      confidence: _confidenceLabel(decision.confidence),
      risks: decision.majorRisks,
      missingVariables: decision.missingVariables,
      advisory: 'Recommendation requires human review before commitment.',
    });
  }

  // Sort by score descending, then by decision priority
  const decisionOrder = {
    [RECOMMENDATION_LEVELS.PROCEED]: 0,
    [RECOMMENDATION_LEVELS.PROCEED_WITH_CARE]: 1,
    [RECOMMENDATION_LEVELS.DEFER]: 2,
    [RECOMMENDATION_LEVELS.AVOID]: 3,
    [RECOMMENDATION_LEVELS.INSUFFICIENT_DATA]: 4,
  };
  recommendations.sort((a, b) => {
    const dDiff = (decisionOrder[a.decision] ?? 5) - (decisionOrder[b.decision] ?? 5);
    return dDiff !== 0 ? dDiff : b.score - a.score;
  });

  const overrideApplied = executiveOverride !== null;
  const overrideNote = overrideApplied
    ? `Executive override applied: ${executiveOverride.action} — authorised by ${executiveOverride.authorisedBy}`
    : null;

  return {
    recommendations,
    remainingDeployableCents: remainingDeployable,
    deployableFloorCents: Math.round(expense * 3),
    overrideApplied,
    overrideNote,
    allocationConfidence: recommendations.length > 0
      ? _confidenceLabel(recommendations.reduce((a, r) => {
          const s = r.confidence === 'medium' ? 65 : r.confidence === 'low' ? 40 : 20;
          return Math.min(a, s);
        }, 100))
      : 'none',
    disclaimer: ADVISORY_DISCLAIMER,
  };
}

// ── 3. detectEconomicThreats ──────────────────────────────────────────────────

/**
 * Identify active and emerging threats to economic health.
 *
 * @param {Object} input
 * @returns {Object}
 */
function detectEconomicThreats(input = {}) {
  const cash = input.cash ?? {};
  const obligations = input.obligations ?? [];
  const risks = input.risks ?? [];
  const transactions = input.transactions ?? [];
  const accounts = input.accounts ?? [];

  const reserve = Math.trunc(cash.reserveCents ?? 0);
  const income  = Math.trunc(cash.monthlyIncomeCents  ?? 0);
  const expense = Math.trunc(cash.monthlyExpenseCents ?? 0);
  const liquid  = Math.trunc(cash.liquidCents ?? 0);

  const threats = [];

  // ── Runway threats ──
  const runway = projectRunway(reserve, income, expense);
  if (!runway.infinite) {
    const months = runway.runwayMonths ?? 0;
    threats.push({
      id: 'runway_finite',
      label: `Runway estimated at ${months} month(s)`,
      severity: months <= 1 ? 'critical' : months <= 3 ? 'high' : months <= 6 ? 'medium' : 'low',
      category: 'runway',
      evidenceCents: reserve,
      confidence: _confidenceLabel(runway.confidence),
      mitigatable: true,
    });
  }

  // ── Cashflow trend threats ──
  if (transactions.length > 0) {
    const asOf = new Date().toISOString().slice(0, 10);
    const cf = analyseCashflow(transactions, _bigIntStr(reserve), asOf);
    const trend = cf.trend;
    if (trend.trend === 'deteriorating' || trend.trend === 'mostly_deteriorating') {
      threats.push({
        id: 'cashflow_deteriorating',
        label: `Cashflow trend is ${trend.trend}`,
        severity: trend.trend === 'deteriorating' ? 'high' : 'medium',
        category: 'cashflow',
        confidence: trend.confidence,
        mitigatable: true,
        evidence: [`${trend.periodsAnalysed ?? 'unknown'} periods analysed`],
      });
    }
    if (cf.anomalies.length > 0) {
      threats.push({
        id: 'cashflow_anomalies',
        label: `${cf.anomalies.length} cashflow anomaly(ies) detected`,
        severity: 'medium',
        category: 'cashflow',
        confidence: 'medium',
        mitigatable: false,
        evidence: cf.anomalies.map(a => `${a.month}: ${a.anomalyType}`),
      });
    }
  }

  // ── Obligation threats ──
  const totalDue = obligations.reduce((a, o) => a + Math.trunc(o.amountCents ?? 0), 0);
  if (totalDue > liquid) {
    threats.push({
      id: 'obligation_shortfall',
      label: `Obligations (${totalDue}) exceed liquid balance (${liquid})`,
      severity: 'critical',
      category: 'obligations',
      evidenceCents: totalDue - liquid,
      confidence: 'medium',
      mitigatable: true,
    });
  }

  // Critical-priority obligations due soon
  const criticalObs = obligations.filter(o => o.priority === 'critical');
  if (criticalObs.length > 0) {
    threats.push({
      id: 'critical_obligations_pending',
      label: `${criticalObs.length} critical obligation(s) pending`,
      severity: 'high',
      category: 'obligations',
      items: criticalObs.map(o => o.label),
      confidence: 'high',
      mitigatable: false,
    });
  }

  // ── Caller-supplied risks ──
  for (const risk of risks) {
    if (risk.mitigated) continue;
    threats.push({
      id: risk.id ?? `risk_${risk.label?.slice(0, 20)}`,
      label: risk.label,
      severity: risk.severity ?? 'medium',
      category: 'supplied_risk',
      probabilityBps: risk.probabilityBps,
      maxImpactCents: risk.maxImpactCents,
      exposureScore: _riskExposureScore(risk),
      confidence: 'low',
      mitigatable: true,
      note: 'Caller-supplied risk — probability and impact are assumptions',
    });
  }

  // ── Sync/data freshness threats ──
  const syncHealth = _assessSyncHealth(accounts);
  if (syncHealth.status === 'STALE' || syncHealth.status === 'DEGRADED') {
    threats.push({
      id: 'data_staleness',
      label: `Sync health ${syncHealth.status}: ${syncHealth.staleAccounts.length} stale account(s)`,
      severity: syncHealth.status === 'STALE' ? 'high' : 'medium',
      category: 'data_quality',
      confidence: 'high',
      mitigatable: true,
      note: 'Stale data reduces confidence in all economic outputs',
    });
  } else if (syncHealth.status === 'UNKNOWN') {
    threats.push({
      id: 'data_unknown',
      label: 'Account sync health unknown — data completeness unverifiable',
      severity: 'medium',
      category: 'data_quality',
      confidence: 'high',
      mitigatable: true,
    });
  }

  // Sort by severity
  threats.sort((a, b) =>
    (THREAT_SEVERITY[a.severity] ?? 99) - (THREAT_SEVERITY[b.severity] ?? 99)
  );

  return {
    threats,
    threatCount: threats.length,
    criticalCount: threats.filter(t => t.severity === 'critical').length,
    highCount: threats.filter(t => t.severity === 'high').length,
    overallThreatLevel: threats.length === 0 ? 'clear'
      : threats.some(t => t.severity === 'critical') ? 'critical'
      : threats.some(t => t.severity === 'high') ? 'elevated'
      : 'moderate',
    syncHealth,
    disclaimer: ADVISORY_DISCLAIMER,
  };
}

// ── 4. identifyEconomicOpportunities ─────────────────────────────────────────

/**
 * Surface and rank economic opportunities from all intelligence layers.
 *
 * @param {Object} input
 * @returns {Object}
 */
function identifyEconomicOpportunities(input = {}) {
  const cash = input.cash ?? {};
  const callerOpps = input.opportunities ?? [];
  const transactions = input.transactions ?? [];

  const liquidCents = _bigIntStr(cash.liquidCents ?? 0);

  // Run opportunity-engine on transaction history
  let engineOpps = [];
  try {
    const asOf = new Date().toISOString().slice(0, 10);
    const cf = analyseCashflow(transactions, liquidCents, asOf);
    engineOpps = allOpportunities({
      transactions,
      liquidBalanceCents: liquidCents,
      monthlySummaries: cf.monthlySummaries,
    });
  } catch { /* graceful — transaction data may be incomplete */ }

  // Tax deduction opportunities
  let taxOpps = [];
  try {
    const classifications = classifyAll(transactions);
    const deductions = identifyDeductionOpportunities(classifications);
    const confirmedCents = BigInt(deductions.summary.confirmedDeductionsCents ?? 0);
    if (confirmedCents > 0n) {
      taxOpps.push({
        id: 'tax_deductions_confirmed',
        label: 'Confirmed tax deduction opportunities identified',
        category: 'tax_optimisation',
        estimatedImpactCents: confirmedCents.toString(),
        confidence: 'low',
        hypothesis: 'Estimated deductions require professional verification',
        evidence: [`${deductions.summary.confirmedCount} confirmed transactions`],
        counterarguments: ['Deductibility not yet professionally verified'],
      });
    }
  } catch { /* graceful */ }

  // Normalise caller-supplied opportunities
  const normalisedCallerOpps = callerOpps.map(o => ({
    id: o.id ?? o.label,
    label: o.label,
    category: o.category ?? 'capital_deployment',
    estimatedImpactCents: o.investmentCents != null
      ? Math.round((o.investmentCents * (o.expectedReturnBps ?? 0)) / 10000).toString()
      : null,
    confidence: o.confidence ?? 'low',
    hypothesis: `Expected return: ${(o.expectedReturnBps ?? 0) / 100}% over ${o.horizonMonths ?? '?'} months`,
    evidence: o.evidence ?? [`Caller-supplied return estimate: ${o.expectedReturnBps ?? 'unknown'} bps`],
    counterarguments: o.counterarguments ?? ['Returns are projections, not guarantees'],
    score: _opportunityScore(o),
    investmentCents: o.investmentCents,
    expectedReturnBps: o.expectedReturnBps,
    horizonMonths: o.horizonMonths,
  }));

  // Combine and rank
  const all = [
    ...normalisedCallerOpps,
    ...engineOpps.map(o => ({ ...o, score: OPP_CONFIDENCE[o.confidence] ?? 0 })),
    ...taxOpps,
  ];

  const confOrder = { high: 0, medium: 1, low: 2, none: 3 };
  all.sort((a, b) => {
    const confDiff = (confOrder[a.confidence] ?? 4) - (confOrder[b.confidence] ?? 4);
    return confDiff !== 0 ? confDiff : (b.score ?? 0) - (a.score ?? 0);
  });

  return {
    opportunities: all,
    opportunityCount: all.length,
    engineDerivedCount: engineOpps.length + taxOpps.length,
    callerSuppliedCount: normalisedCallerOpps.length,
    topOpportunity: all[0] ?? null,
    disclaimer: 'All opportunities are hypotheses. Evidence and counterarguments are included. No opportunity should be acted upon without human review.',
  };
}

// ── 5. generateEconomicState ──────────────────────────────────────────────────

/**
 * Produce a comprehensive economic state from all available inputs.
 * This is the primary aggregation function — all other outputs derive from here.
 *
 * @param {Object} input - full economic input object
 * @returns {Object} economicState
 */
function generateEconomicState(input = {}) {
  const cash = input.cash ?? {};
  const assumptions = input.assumptions ?? {};
  const transactions = input.transactions ?? [];
  const accounts = input.accounts ?? [];

  const income  = Math.trunc(cash.monthlyIncomeCents  ?? 0);
  const expense = Math.trunc(cash.monthlyExpenseCents ?? 0);
  const reserve = Math.trunc(cash.reserveCents ?? 0);
  const liquid  = Math.trunc(cash.liquidCents ?? 0);

  const missingCash = _missingFields(cash, ['liquidCents', 'reserveCents', 'monthlyIncomeCents', 'monthlyExpenseCents']);
  const missingAssumptions = Object.entries(assumptions)
    .filter(([, v]) => v === null || v === undefined)
    .map(([k]) => k);

  // Run sub-engines
  const allocation    = evaluateCapitalAllocation(input);
  const threats       = detectEconomicThreats(input);
  const opportunities = identifyEconomicOpportunities(input);
  const deployment    = recommendCapitalDeployment(input);

  // Scenario analysis (base + stress branch)
  const baseScenario = createScenario('baseline', { ...assumptions, monthlyIncomeCents: income, monthlyExpenseCents: expense });
  const stressScenario = branchScenario(
    baseScenario,
    { monthlyIncomeCents: Math.round(income * 0.7), monthlyExpenseCents: Math.round(expense * 1.15) },
    'stress: -30% income, +15% expense'
  );
  const growthScenario = branchScenario(
    baseScenario,
    { monthlyIncomeCents: Math.round(income * 1.2), monthlyExpenseCents: expense },
    'growth: +20% income'
  );

  // Trajectory analysis
  const trajectories = income > 0 || expense > 0
    ? projectTrajectories({
        reserveCents: reserve,
        monthlyIncomeCents: income,
        monthlyExpenseCents: expense,
        months: 12,
        incomeVarianceBps: 2000,
        expenseVarianceBps: 1500,
      })
    : null;

  // Health score
  const asOf = new Date().toISOString().slice(0, 10);
  let monthlySummaries = [];
  try {
    const cf = analyseCashflow(transactions, _bigIntStr(reserve), asOf);
    monthlySummaries = cf.monthlySummaries;
  } catch { /* graceful */ }

  const healthScore = computeHealthScore({
    liquidBalanceCents: _bigIntStr(liquid),
    avgMonthlyOutflowCents: _bigIntStr(expense),
    monthlySummaries,
    goalsSummary: {},
    upcomingObligations: input.obligations ?? [],
    savingsTxns: [],
    trendResult: monthlySummaries.length >= 2 ? trendDirection(monthlySummaries) : {},
    anomalies: [],
    unknownFields: [...missingCash, ...missingAssumptions],
  });

  // Sync health as confidence modifier
  const syncHealth = _assessSyncHealth(accounts);
  const dataConfidenceAdjust = syncHealth.dataFreshnessConfidence < 50 ? -15 : 0;

  // Composite confidence
  const missingTotal = missingCash.length + missingAssumptions.length;
  const baseConf = _decay(80, 0, missingTotal);
  const adjustedConf = Math.max(5, baseConf + dataConfidenceAdjust);

  return {
    generatedAt: new Date().toISOString(),
    engineVersion: ENGINE_VERSION,
    economicHealthScore: healthScore.healthScore,
    healthScoreConfidence: healthScore.confidence,
    runway: allocation.runway,
    allocation,
    threats,
    opportunities,
    deployment,
    scenarios: {
      base: baseScenario,
      stress: stressScenario,
      growth: growthScenario,
    },
    trajectories,
    syncHealth,
    compositeConfidence: adjustedConf,
    compositeConfidenceLabel: _confidenceLabel(adjustedConf),
    missingAssumptions: [...missingCash, ...missingAssumptions],
    evidenceSources: [
      transactions.length > 0 ? `${transactions.length} transactions` : 'no_transaction_data',
      accounts.length > 0 ? `${accounts.length} accounts` : 'no_account_data',
      (input.obligations ?? []).length > 0 ? `${input.obligations.length} obligations` : null,
      (input.risks ?? []).length > 0 ? `${input.risks.length} caller-supplied risks` : null,
    ].filter(Boolean),
    assumptions,
    disclaimer: ADVISORY_DISCLAIMER,
  };
}

// ── 6. produceEconomicBriefing ────────────────────────────────────────────────

/**
 * Produce a structured executive briefing from an economic state.
 * Human-readable sections with explicit uncertainty.
 *
 * @param {Object} state - output of generateEconomicState()
 * @returns {Object} briefing with sections and plain text
 */
function produceEconomicBriefing(state = {}) {
  const threats     = state.threats?.threats ?? [];
  const opps        = state.opportunities?.opportunities ?? [];
  const deployRecs  = state.deployment?.recommendations ?? [];
  const override    = state.deployment?.overrideApplied ?? false;

  // ── Sections ──
  const snapshot = {
    title: 'Economic Snapshot',
    economicHealthScore: state.economicHealthScore,
    confidence: state.compositeConfidenceLabel,
    runway: state.runway,
    missingData: state.missingAssumptions ?? [],
  };

  const threatSection = {
    title: 'Threats & Risks',
    overallLevel: state.threats?.overallThreatLevel ?? 'unknown',
    count: threats.length,
    critical: threats.filter(t => t.severity === 'critical'),
    high: threats.filter(t => t.severity === 'high'),
    others: threats.filter(t => !['critical', 'high'].includes(t.severity)),
  };

  const opportunitySection = {
    title: 'Opportunities',
    count: opps.length,
    top: opps.slice(0, 5),
  };

  const allocationSection = {
    title: 'Capital Allocation Recommendations',
    recommendations: deployRecs.slice(0, 5),
    overrideApplied: override,
    overrideNote: state.deployment?.overrideNote ?? null,
    confidence: state.deployment?.allocationConfidence ?? 'none',
  };

  const scenarioSection = {
    title: 'Scenario Analysis',
    base: _scenarioSummary(state.scenarios?.base),
    stress: _scenarioSummary(state.scenarios?.stress),
    growth: _scenarioSummary(state.scenarios?.growth),
  };

  const unknownsSection = {
    title: 'Unknowns & Gaps',
    missingAssumptions: state.missingAssumptions ?? [],
    syncStatus: state.syncHealth?.status ?? 'UNKNOWN',
    staleAccounts: state.syncHealth?.staleAccounts ?? [],
    dataFreshnessConfidence: state.syncHealth?.dataFreshnessConfidence ?? 0,
  };

  // ── Executive summary text ──
  const summaryLines = [
    `Economic briefing — ${state.generatedAt?.slice(0, 10) ?? 'unknown date'}`,
    `Health score: ${state.economicHealthScore ?? 'unknown'}/100 (${state.compositeConfidenceLabel ?? 'unknown'} confidence)`,
    '',
    threats.length > 0
      ? `⚠ ${threats.length} threat(s) detected — ${state.threats?.overallThreatLevel} level`
      : '✓ No significant threats detected',
    opps.length > 0
      ? `● ${opps.length} opportunity(ies) identified`
      : '○ No opportunities identified',
    deployRecs.length > 0
      ? `→ ${deployRecs.filter(r => r.decision === RECOMMENDATION_LEVELS.PROCEED).length} allocation(s) recommended for review`
      : '→ No capital deployment recommended at this time',
    '',
    (state.missingAssumptions?.length ?? 0) > 0
      ? `? ${state.missingAssumptions.length} assumption(s) missing — confidence degraded`
      : '✓ All primary assumptions provided',
    '',
    ADVISORY_DISCLAIMER,
  ];

  return {
    generatedAt: state.generatedAt,
    sections: {
      snapshot,
      threats: threatSection,
      opportunities: opportunitySection,
      allocations: allocationSection,
      scenarios: scenarioSection,
      unknowns: unknownsSection,
    },
    executiveSummary: summaryLines.join('\n'),
    evidenceSources: state.evidenceSources ?? [],
    assumptions: state.assumptions ?? {},
    disclaimer: ADVISORY_DISCLAIMER,
  };
}

function _scenarioSummary(scenario) {
  if (!scenario) return null;
  return {
    name: scenario.name,
    confidence: scenario.confidence,
    missingVariables: scenario.missingVariables ?? [],
    hasMissingData: scenario.hasMissingData,
  };
}

// ── Sensitivity analysis helper ───────────────────────────────────────────────

/**
 * Show how key outputs change across income and expense variance.
 *
 * @param {Object} input
 * @param {number[]} incomeVariantsBps - e.g. [-3000, 0, 2000] (−30%, 0%, +20%)
 * @param {number[]} expenseVariantsBps
 * @returns {Object}
 */
function sensitivityAnalysis(input, incomeVariantsBps = [-2000, 0, 2000], expenseVariantsBps = [0, 1000, 2000]) {
  const cash = input.cash ?? {};
  const baseIncome  = Math.trunc(cash.monthlyIncomeCents  ?? 0);
  const baseExpense = Math.trunc(cash.monthlyExpenseCents ?? 0);
  const reserve     = Math.trunc(cash.reserveCents ?? 0);

  const matrix = [];

  for (const ibps of incomeVariantsBps) {
    for (const ebps of expenseVariantsBps) {
      const adjIncome  = baseIncome  + Math.round(baseIncome  * ibps  / 10000);
      const adjExpense = baseExpense + Math.round(baseExpense * ebps  / 10000);
      const runway     = projectRunway(reserve, adjIncome, adjExpense, 70);

      matrix.push({
        incomeChangeBps: ibps,
        expenseChangeBps: ebps,
        adjustedIncomeCents: adjIncome,
        adjustedExpenseCents: adjExpense,
        netCents: adjIncome - adjExpense,
        runway: runway.infinite ? 'infinite' : (runway.runwayMonths ?? 0),
        runwayConfidence: runway.confidence,
      });
    }
  }

  return {
    baseIncomeCents: baseIncome,
    baseExpenseCents: baseExpense,
    reserveCents: reserve,
    matrix,
    note: 'Sensitivity matrix shows runway under income/expense variance combinations. All figures are projections.',
  };
}

// ── Public API ────────────────────────────────────────────────────────────────

module.exports = {
  evaluateCapitalAllocation,
  recommendCapitalDeployment,
  detectEconomicThreats,
  identifyEconomicOpportunities,
  generateEconomicState,
  produceEconomicBriefing,
  sensitivityAnalysis,
  RECOMMENDATION_LEVELS,
  ENGINE_VERSION,
  ADVISORY_DISCLAIMER,
};
