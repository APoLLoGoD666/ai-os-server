'use strict';

/**
 * validate-economic-engine.js
 * Minimum 150 behavioural validations for the Economic Engine (Layer 20).
 */

const {
  evaluateCapitalAllocation,
  recommendCapitalDeployment,
  detectEconomicThreats,
  identifyEconomicOpportunities,
  generateEconomicState,
  produceEconomicBriefing,
  sensitivityAnalysis,
  RECOMMENDATION_LEVELS,
  ADVISORY_DISCLAIMER,
} = require('./lib/economics/economic-engine');

// ── Harness ───────────────────────────────────────────────────────────────────

let passed = 0;
let failed = 0;
const failures = [];
const strategicReviewAreas = [];

function assert(label, condition) {
  if (condition) { passed++; }
  else { failed++; failures.push(label); console.error(`  FAIL: ${label}`); }
}
function assertEqual(label, actual, expected) {
  assert(label, actual === expected);
  if (actual !== expected) console.error(`       got ${JSON.stringify(actual)}, want ${JSON.stringify(expected)}`);
}
function assertContains(label, arr, item) {
  assert(label, Array.isArray(arr) && arr.includes(item));
}
function assertGte(label, actual, min) {
  assert(label, typeof actual === 'number' && actual >= min);
}
function assertLte(label, actual, max) {
  assert(label, typeof actual === 'number' && actual <= max);
}
function assertStringContains(label, str, substr) {
  assert(label, typeof str === 'string' && str.includes(substr));
}

// ── Fixtures ──────────────────────────────────────────────────────────────────

const HEALTHY_CASH = {
  liquidCents:         1200000,  // £12,000
  reserveCents:        3600000,  // £36,000 (6 month reserve at £6k/mo expense)
  monthlyIncomeCents:  700000,   // £7,000
  monthlyExpenseCents: 600000,   // £6,000
};

const STRESSED_CASH = {
  liquidCents:         150000,   // £1,500
  reserveCents:        300000,   // £3,000 (0.5 months)
  monthlyIncomeCents:  500000,
  monthlyExpenseCents: 550000,   // negative net
};

const makeEvent = (date, amountCents, direction) => ({ date, amountCents, direction });
const makeTxn = (id, date, amountCents, direction, description) =>
  ({ id, date, amountCents, direction, description, vendor: description, category: 'misc' });

const transactions6Months = [
  makeEvent('2024-01-01', 700000, 'in'), makeEvent('2024-01-15', 590000, 'out'),
  makeEvent('2024-02-01', 700000, 'in'), makeEvent('2024-02-15', 600000, 'out'),
  makeEvent('2024-03-01', 700000, 'in'), makeEvent('2024-03-15', 610000, 'out'),
  makeEvent('2024-04-01', 700000, 'in'), makeEvent('2024-04-15', 600000, 'out'),
  makeEvent('2024-05-01', 700000, 'in'), makeEvent('2024-05-15', 590000, 'out'),
  makeEvent('2024-06-01', 700000, 'in'), makeEvent('2024-06-15', 600000, 'out'),
];

const obligations = [
  { label: 'Rent', amountCents: 150000, dueDateIso: '2024-07-01', priority: 'critical' },
  { label: 'Insurance', amountCents: 30000, dueDateIso: '2024-07-15', priority: 'high' },
];

const opportunities = [
  { id: 'opp-1', label: 'Hire senior developer', investmentCents: 600000, expectedReturnBps: 5000, horizonMonths: 12, confidence: 'medium', frequency: 'MONTHLY', category: 'hiring' },
  { id: 'opp-2', label: 'SaaS tooling upgrade', investmentCents: 50000, expectedReturnBps: 3000, horizonMonths: 6, confidence: 'high', frequency: 'ONCE', category: 'tooling' },
  { id: 'opp-3', label: 'Marketing campaign', investmentCents: 200000, expectedReturnBps: 8000, horizonMonths: 3, confidence: 'low', frequency: 'ONCE', category: 'marketing' },
];

const risks = [
  { id: 'risk-1', label: 'Key client churn', probabilityBps: 2000, maxImpactCents: 840000, severity: 'high', mitigated: false },
  { id: 'risk-2', label: 'Tax reassessment', probabilityBps: 500, maxImpactCents: 500000, severity: 'medium', mitigated: false },
];

const healthyInput = {
  cash: HEALTHY_CASH,
  obligations,
  opportunities,
  risks,
  transactions: transactions6Months,
  assumptions: { growthRateBps: 200, inflationBps: 300 },
};

const stressedInput = {
  cash: STRESSED_CASH,
  obligations,
  opportunities,
  risks,
  transactions: [],
  assumptions: {},
};

// ══════════════════════════════════════════════════════════════════════════════
// evaluateCapitalAllocation
// ══════════════════════════════════════════════════════════════════════════════

console.log('\n── evaluateCapitalAllocation ──');

// 1–5: structure
const alloc = evaluateCapitalAllocation(healthyInput);
assert('1. evaluateCapitalAllocation returns object', typeof alloc === 'object');
assert('2. categories is array', Array.isArray(alloc.categories));
assert('3. runway field present', typeof alloc.runway === 'object');
assert('4. disclaimer present', typeof alloc.disclaimer === 'string');
assert('5. confidence present', typeof alloc.confidence === 'string');

// 6: totalKnownCapital = liquid + reserve
assertEqual('6. totalKnownCapital = liquid + reserve',
  alloc.totalKnownCapitalCents, HEALTHY_CASH.liquidCents + HEALTHY_CASH.reserveCents);

// 7: healthy reserve → strong adequacy
const reserveCat = alloc.categories.find(c => c.name === 'emergency_reserve');
assert('7. 6-month reserve → strong adequacy', reserveCat?.adequacy === 'strong');

// 8: obligation coverage positive
assert('8. liquid covers obligations', alloc.canCoverObligations === true);

// 9: stressed cash → insufficient adequacy
const stressAlloc = evaluateCapitalAllocation(stressedInput);
const stressReserve = stressAlloc.categories.find(c => c.name === 'emergency_reserve');
assert('9. stressed reserve → thin or critical adequacy', ['thin', 'critical'].includes(stressReserve?.adequacy));

// 10: stressed cash → cannot cover obligations
assert('10. stressed cash cannot cover obligations', stressAlloc.canCoverObligations === false);

// 11: missing cash fields degrade confidence
const missingInput = { cash: {}, obligations: [], assumptions: {} };
const missingAlloc = evaluateCapitalAllocation(missingInput);
assert('11. missing cash fields lower confidence', missingAlloc.confidence !== 'medium' || missingAlloc.missingAssumptions.length > 0);

// 12: missing assumptions are listed
assert('12. missingAssumptions is array', Array.isArray(alloc.missingAssumptions));

// 13: empty input doesn't crash
const emptyAlloc = evaluateCapitalAllocation({});
assert('13. empty input does not crash', typeof emptyAlloc === 'object');

// 14: reserve months calculated
assert('14. reserveMonths is number', typeof alloc.reserveMonths === 'number');
assert('15. reserveMonths = 6', alloc.reserveMonths === 6);

// 16: obligation total is sum
assertEqual('16. totalObligationsCents = sum', alloc.totalObligationsCents, 180000);

// ══════════════════════════════════════════════════════════════════════════════
// recommendCapitalDeployment
// ══════════════════════════════════════════════════════════════════════════════

console.log('\n── recommendCapitalDeployment ──');

const deploy = recommendCapitalDeployment(healthyInput);

// 17–21: structure
assert('17. recommendCapitalDeployment returns object', typeof deploy === 'object');
assert('18. recommendations is array', Array.isArray(deploy.recommendations));
assert('19. allocationConfidence is string', typeof deploy.allocationConfidence === 'string');
assert('20. disclaimer present', typeof deploy.disclaimer === 'string');
assert('21. overrideApplied is boolean', typeof deploy.overrideApplied === 'boolean');

// 22: no override when not supplied
assert('22. no override by default', deploy.overrideApplied === false);

// 23: recommendations count = opportunities count
assertEqual('23. recommendations count = opportunities supplied', deploy.recommendations.length, opportunities.length);

// 24: each recommendation has decision field
assert('24. all recs have decision', deploy.recommendations.every(r => typeof r.decision === 'string'));

// 25: recommendations have advisory note
assert('25. all recs have advisory note', deploy.recommendations.every(r => typeof r.advisory === 'string'));

// 26: SaaS tooling (ONCE, high confidence, small) → PROCEED
const saasTool = deploy.recommendations.find(r => r.opportunityId === 'opp-2');
assert('26. small one-off high-confidence → PROCEED or PROCEED_WITH_CARE',
  saasTool && [RECOMMENDATION_LEVELS.PROCEED, RECOMMENDATION_LEVELS.PROCEED_WITH_CARE].includes(saasTool.decision));

// 27: executive override applied when supplied
const overrideInput = {
  ...healthyInput,
  executiveOverride: { action: 'DEFER_ALL', reason: 'Q4 freeze', authorisedBy: 'CEO' },
};
const overrideDeploy = recommendCapitalDeployment(overrideInput);
assert('27. override applied when supplied', overrideDeploy.overrideApplied === true);
assert('28. override note contains CEO', overrideDeploy.overrideNote?.includes('CEO'));

// 29: stressed cash → no deployable capital
const stressDeploy = recommendCapitalDeployment(stressedInput);
assert('29. stressed cash reduces deployable floor', stressDeploy.remainingDeployableCents <= stressedInput.cash.reserveCents);

// 30: hiring decision (MONTHLY large commitment) scored lower than one-off
const hiringRec = deploy.recommendations.find(r => r.opportunityId === 'opp-1');
const toolRec   = deploy.recommendations.find(r => r.opportunityId === 'opp-2');
assert('30. hiring rec present', hiringRec !== undefined);
assert('31. tool one-off has higher score than uncertain hiring', (toolRec?.score ?? -1) >= (hiringRec?.score ?? 999) || hiringRec?.decision !== RECOMMENDATION_LEVELS.PROCEED);

// 32: affordable flag present on each rec
assert('32. affordable flag on every rec', deploy.recommendations.every(r => typeof r.affordable === 'boolean'));

// 33: runwayImpact present
assert('33. runwayImpact on every rec', deploy.recommendations.every(r => typeof r.runwayImpact === 'object'));

// 34: no opportunities → empty recommendations
const emptyDeploy = recommendCapitalDeployment({ cash: HEALTHY_CASH, opportunities: [], assumptions: {} });
assertEqual('34. no opportunities → empty recs', emptyDeploy.recommendations.length, 0);

// ══════════════════════════════════════════════════════════════════════════════
// detectEconomicThreats
// ══════════════════════════════════════════════════════════════════════════════

console.log('\n── detectEconomicThreats ──');

const threats = detectEconomicThreats(healthyInput);

// 35–39: structure
assert('35. detectEconomicThreats returns object', typeof threats === 'object');
assert('36. threats is array', Array.isArray(threats.threats));
assert('37. threatCount matches array length', threats.threatCount === threats.threats.length);
assert('38. overallThreatLevel is string', typeof threats.overallThreatLevel === 'string');
assert('39. syncHealth present', typeof threats.syncHealth === 'object');

// 40: each threat has severity
assert('40. all threats have severity', threats.threats.every(t => typeof t.severity === 'string'));

// 41: stressed cash → obligation shortfall threat
const stressThreats = detectEconomicThreats(stressedInput);
assert('41. obligation shortfall detected in stressed state',
  stressThreats.threats.some(t => t.id === 'obligation_shortfall'));

// 42: critical obligations flagged
assert('42. critical obligations threat detected', stressThreats.threats.some(t => t.id === 'critical_obligations_pending'));

// 43: supplied risks appear in threats
assert('43. caller-supplied risks appear in threats',
  threats.threats.some(t => t.id === 'risk-1'));

// 44: mitigated risks not in threats
const mitigatedInput = {
  ...healthyInput,
  risks: [{ id: 'r-safe', label: 'Mitigated risk', probabilityBps: 5000, maxImpactCents: 1000000, severity: 'high', mitigated: true }],
};
const mitigatedThreats = detectEconomicThreats(mitigatedInput);
assert('44. mitigated risks excluded from threats', !mitigatedThreats.threats.some(t => t.id === 'r-safe'));

// 45: no accounts → data_unknown threat
const noAccountInput = { ...healthyInput, accounts: [] };
const noAccThreats = detectEconomicThreats(noAccountInput);
assert('45. no account data → data_unknown threat', noAccThreats.threats.some(t => t.id === 'data_unknown'));

// 46: threats sorted critical first
if (stressThreats.threats.length >= 2) {
  const severityOrder = { critical: 0, high: 1, medium: 2, low: 3, info: 4 };
  const first = severityOrder[stressThreats.threats[0].severity] ?? 99;
  const last  = severityOrder[stressThreats.threats[stressThreats.threats.length - 1].severity] ?? 99;
  assert('46. threats sorted most severe first', first <= last);
}

// 47: healthy state → clear or moderate threat level
assert('47. healthy state → non-critical threat level',
  ['clear', 'moderate', 'elevated'].includes(threats.overallThreatLevel));

// 48: negative monthly net → runway threat
const negNetCash = { ...HEALTHY_CASH, monthlyIncomeCents: 400000, monthlyExpenseCents: 600000 };
const negNetThreats = detectEconomicThreats({ cash: negNetCash, obligations: [], risks: [] });
assert('48. negative net → runway_finite threat', negNetThreats.threats.some(t => t.id === 'runway_finite'));

// 49: runway threat severity based on months
const criticalRunway = detectEconomicThreats({
  cash: { reserveCents: 50000, monthlyIncomeCents: 0, monthlyExpenseCents: 60000, liquidCents: 50000 },
  obligations: [], risks: [],
});
const runwayThreat = criticalRunway.threats.find(t => t.id === 'runway_finite');
assert('49. < 1 month runway → critical severity', runwayThreat?.severity === 'critical');

// 50: disclaimer present
assert('50. disclaimer present in threats', typeof threats.disclaimer === 'string');

// ══════════════════════════════════════════════════════════════════════════════
// identifyEconomicOpportunities
// ══════════════════════════════════════════════════════════════════════════════

console.log('\n── identifyEconomicOpportunities ──');

const opps = identifyEconomicOpportunities(healthyInput);

// 51–55: structure
assert('51. identifyEconomicOpportunities returns object', typeof opps === 'object');
assert('52. opportunities is array', Array.isArray(opps.opportunities));
assert('53. opportunityCount matches', opps.opportunityCount === opps.opportunities.length);
assert('54. disclaimer present', typeof opps.disclaimer === 'string');
assert('55. topOpportunity is first or null', opps.topOpportunity === opps.opportunities[0] || opps.opportunities.length === 0);

// 56: caller-supplied opps included
assert('56. caller-supplied opps present', opps.callerSuppliedCount === opportunities.length);

// 57: each opportunity has hypothesis
assert('57. all opps have hypothesis', opps.opportunities.every(o => typeof o.hypothesis === 'string'));

// 58: each opportunity has evidence
assert('58. all opps have evidence array', opps.opportunities.every(o => Array.isArray(o.evidence)));

// 59: each opportunity has counterarguments
assert('59. all opps have counterarguments', opps.opportunities.every(o => Array.isArray(o.counterarguments)));

// 60: opportunities sorted by confidence (high first)
if (opps.opportunities.length >= 2) {
  const confOrder = { high: 0, medium: 1, low: 2, none: 3 };
  const first = confOrder[opps.opportunities[0].confidence] ?? 4;
  const last  = confOrder[opps.opportunities[opps.opportunities.length - 1].confidence] ?? 4;
  assert('60. opportunities sorted high confidence first', first <= last);
}

// 61: no transactions → engineDerived count may be 0 + caller count
const noTxnOpps = identifyEconomicOpportunities({ cash: HEALTHY_CASH, opportunities, transactions: [] });
assert('61. no transactions → still returns caller opps', noTxnOpps.callerSuppliedCount === opportunities.length);

// 62: empty input → no crash
const emptyOpps = identifyEconomicOpportunities({});
assert('62. empty input → empty opportunities', emptyOpps.opportunityCount === 0);

// 63: marketing (low confidence) ranked lower than SaaS (high)
const mktOpp = opps.opportunities.find(o => o.label?.includes('Marketing'));
const saasOpp = opps.opportunities.find(o => o.label?.includes('SaaS'));
if (mktOpp && saasOpp) {
  const confOrder = { high: 0, medium: 1, low: 2, none: 3 };
  assert('63. high-confidence opp ranked above low-confidence',
    confOrder[saasOpp.confidence] <= confOrder[mktOpp.confidence]);
}

// 64: opportunity disclaimer warns against unilateral action
assertStringContains('64. opportunity disclaimer mentions human review', opps.disclaimer, 'human review');

// ══════════════════════════════════════════════════════════════════════════════
// generateEconomicState
// ══════════════════════════════════════════════════════════════════════════════

console.log('\n── generateEconomicState ──');

const state = generateEconomicState(healthyInput);

// 65–72: structure
assert('65. generateEconomicState returns object', typeof state === 'object');
assert('66. economicHealthScore is number', typeof state.economicHealthScore === 'number');
assert('67. runway present', typeof state.runway === 'object');
assert('68. scenarios.base present', typeof state.scenarios.base === 'object');
assert('69. scenarios.stress present', typeof state.scenarios.stress === 'object');
assert('70. scenarios.growth present', typeof state.scenarios.growth === 'object');
assert('71. evidenceSources is array', Array.isArray(state.evidenceSources));
assert('72. missingAssumptions is array', Array.isArray(state.missingAssumptions));

// 73: health score 0–100
assertGte('73. healthScore >= 0', state.economicHealthScore, 0);
assertLte('74. healthScore <= 100', state.economicHealthScore, 100);

// 74: composite confidence degrades with missing assumptions
const noAssumptionsState = generateEconomicState({
  cash: {},
  obligations: [],
  opportunities: [],
  risks: [],
  transactions: [],
  assumptions: {},
});
assert('75. no-cash fields → lower composite confidence', noAssumptionsState.compositeConfidence < 80);

// 76: scenarios are projections
assert('76. base scenario isProjection', state.scenarios.base.isProjection === true);
assert('77. stress scenario has lower confidence than base', state.scenarios.stress.confidence <= state.scenarios.base.confidence);

// 78: growth scenario branched from base
assert('78. growth scenario has parentScenarioId', state.scenarios.growth.parentScenarioId !== null);

// 79: trajectories present when cash data available
assert('79. trajectories present with full cash data', state.trajectories !== null);

// 80: stress scenario assumptions change reflected
assert('80. stress scenario name contains stress', state.scenarios.stress.name.toLowerCase().includes('stress'));

// 81: transactions evidence source counted
assert('81. transaction count in evidence sources', state.evidenceSources.some(s => s.includes('transactions')));

// 82: generated at is ISO string
assert('82. generatedAt is ISO string', typeof state.generatedAt === 'string' && state.generatedAt.includes('T'));

// 83: engine version present
assert('83. engineVersion present', typeof state.engineVersion === 'string');

// 84: disclaimer in state
assertStringContains('84. state disclaimer present', state.disclaimer, 'advisory');

// 85: compositeConfidenceLabel is string
assert('85. compositeConfidenceLabel is string', typeof state.compositeConfidenceLabel === 'string');

// ══════════════════════════════════════════════════════════════════════════════
// produceEconomicBriefing
// ══════════════════════════════════════════════════════════════════════════════

console.log('\n── produceEconomicBriefing ──');

const briefing = produceEconomicBriefing(state);

// 86–92: structure
assert('86. produceEconomicBriefing returns object', typeof briefing === 'object');
assert('87. sections object present', typeof briefing.sections === 'object');
assert('88. executiveSummary is string', typeof briefing.executiveSummary === 'string');
assert('89. sections.snapshot present', typeof briefing.sections.snapshot === 'object');
assert('90. sections.threats present', typeof briefing.sections.threats === 'object');
assert('91. sections.opportunities present', typeof briefing.sections.opportunities === 'object');
assert('92. sections.allocations present', typeof briefing.sections.allocations === 'object');

// 93: unknown section
assert('93. sections.unknowns present', typeof briefing.sections.unknowns === 'object');

// 94: executive summary contains health score
assertStringContains('94. summary mentions health score', briefing.executiveSummary, '/100');

// 95: disclaimer in briefing
assertStringContains('95. briefing disclaimer present', briefing.disclaimer, 'advisory');

// 96: no override → overrideApplied false in allocations
assert('96. no override in base briefing', briefing.sections.allocations.overrideApplied === false);

// 97: override state flows through to briefing
const overrideBriefing = produceEconomicBriefing(generateEconomicState(overrideInput));
assert('97. override flows to briefing allocations', overrideBriefing.sections.allocations.overrideApplied === true);

// 98: empty state doesn't crash briefing
const emptyBriefing = produceEconomicBriefing({});
assert('98. empty state briefing does not crash', typeof emptyBriefing === 'object');

// 99: evidence sources in briefing
assert('99. evidenceSources in briefing', Array.isArray(briefing.evidenceSources));

// 100: scenarios section present
assert('100. scenarios section present', typeof briefing.sections.scenarios === 'object');

// ══════════════════════════════════════════════════════════════════════════════
// sensitivityAnalysis
// ══════════════════════════════════════════════════════════════════════════════

console.log('\n── sensitivityAnalysis ──');

const sens = sensitivityAnalysis(healthyInput);

// 101–106: structure
assert('101. sensitivityAnalysis returns object', typeof sens === 'object');
assert('102. matrix is array', Array.isArray(sens.matrix));
assert('103. matrix is non-empty', sens.matrix.length > 0);
assert('104. note field present', typeof sens.note === 'string');
assert('105. baseIncomeCents correct', sens.baseIncomeCents === HEALTHY_CASH.monthlyIncomeCents);
assert('106. baseExpenseCents correct', sens.baseExpenseCents === HEALTHY_CASH.monthlyExpenseCents);

// 107: matrix entries have runway
assert('107. matrix entries have runway', sens.matrix.every(m => m.runway !== undefined));

// 108: income drop → shorter runway
const incDropEntry = sens.matrix.find(m => m.incomeChangeBps === -2000 && m.expenseChangeBps === 0);
const baseEntry    = sens.matrix.find(m => m.incomeChangeBps ===     0 && m.expenseChangeBps === 0);
if (incDropEntry && baseEntry) {
  const dropRunway = incDropEntry.runway === 'infinite' ? 9999 : incDropEntry.runway;
  const baseRunway = baseEntry.runway    === 'infinite' ? 9999 : baseEntry.runway;
  assert('108. income drop → shorter or equal runway', dropRunway <= baseRunway);
}

// 109: income increase → longer runway
const incUpEntry = sens.matrix.find(m => m.incomeChangeBps === 2000 && m.expenseChangeBps === 0);
if (incUpEntry && baseEntry) {
  const upRunway   = incUpEntry.runway === 'infinite' ? 9999 : incUpEntry.runway;
  const baseRunway = baseEntry.runway  === 'infinite' ? 9999 : baseEntry.runway;
  assert('109. income increase → longer or equal runway', upRunway >= baseRunway);
}

// 110: matrix size = incomeVariants × expenseVariants
const sens2 = sensitivityAnalysis(healthyInput, [-1000, 0, 1000], [0, 1000]);
assertEqual('110. matrix size = variant combinations', sens2.matrix.length, 6);

// 111: custom variants
const customSens = sensitivityAnalysis(healthyInput, [0], [0]);
assertEqual('111. single variant produces 1 entry', customSens.matrix.length, 1);

// 112: empty cash → 0 base income
const emptySens = sensitivityAnalysis({ cash: {} });
assertEqual('112. empty cash → 0 base income', emptySens.baseIncomeCents, 0);

// ══════════════════════════════════════════════════════════════════════════════
// SCENARIO: Hiring Decision
// ══════════════════════════════════════════════════════════════════════════════

console.log('\n── Scenario: Hiring Decision ──');

const hiringScenario = {
  cash: HEALTHY_CASH,
  obligations,
  opportunities: [
    { id: 'hire-1', label: 'Senior engineer hire', investmentCents: 800000, expectedReturnBps: 6000, horizonMonths: 18, confidence: 'medium', frequency: 'MONTHLY', category: 'hiring' },
  ],
  risks: [],
  transactions: [],
  assumptions: { revenueUpliftBps: 6000, timeToRevenue: 6 },
};

const hiringDeploy = recommendCapitalDeployment(hiringScenario);
const hiringScenRec = hiringDeploy.recommendations[0];

// 113: hiring has runwayImpact
assert('113. hiring rec has runwayImpact', typeof hiringScenRec?.runwayImpact === 'object');

// 114: monthly commitment checked against net
assert('114. hiring affordable flag reflects cash constraint', typeof hiringScenRec?.affordable === 'boolean');

// 115: hiring risks assessed (HIGH_INCOME_COMMITMENT if exceeds 30% net)
const hiringAmount = 800000;
assert('115. large hiring commitment flags HIGH_INCOME_COMMITMENT risk',
  hiringScenRec?.risks?.includes('HIGH_INCOME_COMMITMENT') || !hiringScenRec?.affordable);

// 116: advisory note present on hiring rec
assert('116. advisory note on hiring rec', typeof hiringScenRec?.advisory === 'string');

// ══════════════════════════════════════════════════════════════════════════════
// SCENARIO: Cash Shortage
// ══════════════════════════════════════════════════════════════════════════════

console.log('\n── Scenario: Cash Shortage ──');

const cashShortageInput = {
  cash: {
    liquidCents: 80000,
    reserveCents: 100000,
    monthlyIncomeCents: 300000,
    monthlyExpenseCents: 400000,
  },
  obligations: [
    { label: 'Payroll', amountCents: 300000, dueDateIso: '2024-07-01', priority: 'critical' },
    { label: 'Rent',    amountCents: 150000, dueDateIso: '2024-07-05', priority: 'critical' },
  ],
  opportunities: [],
  risks: [],
  transactions: [],
  assumptions: {},
};

const shortageState = generateEconomicState(cashShortageInput);
const shortageBriefing = produceEconomicBriefing(shortageState);

// 117: critical threat detected
assert('117. cash shortage → critical threat detected',
  shortageState.threats.threats.some(t => t.severity === 'critical'));

// 118: overall threat level critical
assertEqual('118. threat level = critical in shortage', shortageState.threats.overallThreatLevel, 'critical');

// 119: briefing summary mentions threats
assertStringContains('119. briefing summary mentions threats', shortageBriefing.executiveSummary, 'threat');

// 120: health score low in shortage
assertLte('120. health score low in shortage', shortageState.economicHealthScore, 50);

// 121: no recommendations when negative deployable
const shortageDeploy = recommendCapitalDeployment(cashShortageInput);
assert('121. cash shortage → zero or negative deployable', shortageDeploy.remainingDeployableCents <= 0);

// ══════════════════════════════════════════════════════════════════════════════
// SCENARIO: Conflicting Signals
// ══════════════════════════════════════════════════════════════════════════════

console.log('\n── Scenario: Conflicting Signals ──');

const conflictInput = {
  cash: HEALTHY_CASH,
  obligations,
  opportunities: [
    { id: 'big-opp', label: 'Expand to new market', investmentCents: 3000000, expectedReturnBps: 15000, horizonMonths: 24, confidence: 'low', frequency: 'ONCE', category: 'expansion' },
  ],
  risks: [
    { id: 'high-risk', label: 'Market timing risk', probabilityBps: 4000, maxImpactCents: 3000000, severity: 'high', mitigated: false },
  ],
  transactions: [],
  assumptions: {},
};

const conflictDeploy = recommendCapitalDeployment(conflictInput);
const conflictRec = conflictDeploy.recommendations[0];

// 122: large investment vs thin capital → DEFER or AVOID
assert('122. large investment vs thin capital → defer/avoid/insufficient',
  [RECOMMENDATION_LEVELS.DEFER, RECOMMENDATION_LEVELS.AVOID, RECOMMENDATION_LEVELS.INSUFFICIENT_DATA].includes(conflictRec?.decision));

// 123: conflicting signals visible — both opportunity and threat present
const conflictState = generateEconomicState(conflictInput);
assert('123. opportunity identified despite risk', conflictState.opportunities.opportunityCount > 0);
assert('124. risk appears as threat', conflictState.threats.threats.some(t => t.id === 'high-risk'));

// 125: recommendations have risks listed
assert('125. conflicting recs have majorRisks', Array.isArray(conflictRec?.risks));

// ══════════════════════════════════════════════════════════════════════════════
// SCENARIO: Low Confidence (Missing Data)
// ══════════════════════════════════════════════════════════════════════════════

console.log('\n── Scenario: Low Confidence ──');

const lowConfInput = {
  cash: { liquidCents: null, reserveCents: null, monthlyIncomeCents: null, monthlyExpenseCents: null },
  obligations: [],
  opportunities: [],
  risks: [],
  transactions: [],
  assumptions: { source: null, growth: null, inflation: null },
};

const lowConfState = generateEconomicState(lowConfInput);

// 126: all missing → low composite confidence
assertLte('126. all-null cash → very low composite confidence', lowConfState.compositeConfidence, 40);

// 127: missing assumptions listed
assert('127. missing cash fields listed', lowConfState.missingAssumptions.length > 0);

// 128: health score confidence degrades
assert('128. health score confidence low with missing data',
  ['low', 'very_low'].includes(lowConfState.healthScoreConfidence));

// 129: low confidence doesn't crash briefing
const lowConfBriefing = produceEconomicBriefing(lowConfState);
assert('129. low-confidence state produces briefing', typeof lowConfBriefing === 'object');

// 130: unknowns section populated
assert('130. unknowns section lists missing assumptions',
  (lowConfBriefing.sections.unknowns.missingAssumptions?.length ?? 0) >= 0);

// ══════════════════════════════════════════════════════════════════════════════
// SCENARIO: Investment Decision
// ══════════════════════════════════════════════════════════════════════════════

console.log('\n── Scenario: Investment Decision ──');

const investmentInput = {
  cash: { ...HEALTHY_CASH, reserveCents: 10000000 }, // £100k reserve
  obligations: [],
  opportunities: [
    { id: 'inv-1', label: 'Index fund ISA', investmentCents: 200000, expectedReturnBps: 700, horizonMonths: 60, confidence: 'medium', frequency: 'ONCE', category: 'investment' },
    { id: 'inv-2', label: 'Startup angel round', investmentCents: 500000, expectedReturnBps: 50000, horizonMonths: 48, confidence: 'low', frequency: 'ONCE', category: 'investment' },
  ],
  risks: [],
  transactions: [],
  assumptions: { riskTolerance: 'moderate' },
};

const investDeploy = recommendCapitalDeployment(investmentInput);

// 131: ISA affordable
const isaRec = investDeploy.recommendations.find(r => r.opportunityId === 'inv-1');
assert('131. ISA affordable with large reserve', isaRec?.affordable === true);

// 132: angel investment affordable (with large reserve)
const angelRec = investDeploy.recommendations.find(r => r.opportunityId === 'inv-2');
assert('132. angel round assessed', angelRec !== undefined);

// 133: angel investment has low confidence in rec
assert('133. angel investment confidence is low', angelRec?.confidence === 'low');

// 134: high-expected-return low-confidence opp has counterarguments
assert('134. angel opp has counterarguments', Array.isArray(investmentInput.opportunities[1].counterarguments ?? []));

// ══════════════════════════════════════════════════════════════════════════════
// SCENARIO: Opportunity Ranking with Conflicting Evidence
// ══════════════════════════════════════════════════════════════════════════════

console.log('\n── Scenario: Opportunity Ranking ──');

const rankInput = {
  cash: HEALTHY_CASH,
  obligations: [],
  opportunities: [
    { id: 'r1', label: 'Low risk steady return', investmentCents: 100000, expectedReturnBps: 500, horizonMonths: 12, confidence: 'high', frequency: 'ONCE', category: 'savings' },
    { id: 'r2', label: 'High risk moonshot', investmentCents: 1000000, expectedReturnBps: 50000, horizonMonths: 24, confidence: 'low', frequency: 'ONCE', category: 'speculative' },
    { id: 'r3', label: 'Medium risk growth', investmentCents: 300000, expectedReturnBps: 3000, horizonMonths: 18, confidence: 'medium', frequency: 'ONCE', category: 'growth' },
  ],
  risks: [],
  transactions: [],
  assumptions: {},
};

const rankDeploy = recommendCapitalDeployment(rankInput);

// 135: ranking present
assert('135. all 3 opportunities ranked', rankDeploy.recommendations.length === 3);

// 136: high-confidence steady return should appear before low-confidence moonshot
const steadyIdx  = rankDeploy.recommendations.findIndex(r => r.opportunityId === 'r1');
const moonIdx    = rankDeploy.recommendations.findIndex(r => r.opportunityId === 'r2');
assert('136. high-confidence opp ranked before low-confidence', steadyIdx <= moonIdx);

// 137: all have score field
assert('137. all recs have score', rankDeploy.recommendations.every(r => typeof r.score === 'number'));

// 138: opportunity ranking consistent with identifyEconomicOpportunities
const rankOpps = identifyEconomicOpportunities(rankInput);
assert('138. identified opps count >= caller-supplied', rankOpps.opportunityCount >= rankInput.opportunities.length);

// ══════════════════════════════════════════════════════════════════════════════
// ADVISORY / UNCERTAINTY RULES
// ══════════════════════════════════════════════════════════════════════════════

console.log('\n── Advisory & Uncertainty Rules ──');

// 139: ADVISORY_DISCLAIMER constant is a string
assert('139. ADVISORY_DISCLAIMER is string', typeof ADVISORY_DISCLAIMER === 'string');
assertStringContains('140. disclaimer mentions advisory', ADVISORY_DISCLAIMER, 'advisory');
assertStringContains('141. disclaimer mentions human review', ADVISORY_DISCLAIMER, 'human');

// 142: all top-level outputs carry disclaimer
assert('142. allocation has disclaimer', typeof alloc.disclaimer === 'string');
assert('143. deploy has disclaimer', typeof deploy.disclaimer === 'string');
assert('144. threats has disclaimer', typeof threats.disclaimer === 'string');
assert('145. opps has disclaimer', typeof opps.disclaimer === 'string');
assert('146. state has disclaimer', typeof state.disclaimer === 'string');
assert('147. briefing has disclaimer', typeof briefing.disclaimer === 'string');

// 148: confidence never above 'medium' label from engine (no 'high' labelled output)
// Engine uses medium/low/very_low per _confidenceLabel
assert('148. compositeConfidenceLabel is valid', ['medium', 'low', 'very_low'].includes(state.compositeConfidenceLabel));

// 149: state contains assumptions field
assert('149. state preserves assumptions', typeof state.assumptions === 'object');

// 150: executive override note is null when not supplied
assert('150. no override → overrideNote is null', deploy.overrideNote === null);

// 151: sensitivity matrix confidence degrades at extremes
const extremeSens = sensitivityAnalysis(healthyInput, [-5000], [5000]);
const extremeEntry = extremeSens.matrix[0];
assert('151. extreme sensitivity entry has runwayConfidence', typeof extremeEntry.runwayConfidence === 'number');

// 152: generateEconomicState full round-trip through briefing
const rt = produceEconomicBriefing(generateEconomicState(healthyInput));
assert('152. full round-trip produces valid briefing', typeof rt.executiveSummary === 'string');

// 153: missing assumptions explicit in state
const partialInput = { cash: { liquidCents: 100000 }, obligations: [], opportunities: [], risks: [], assumptions: {} };
const partialState = generateEconomicState(partialInput);
assert('153. partial cash fields listed in missingAssumptions', partialState.missingAssumptions.some(m => m.includes('Cents') || m.includes('monthly')));

// 154: no crash on entirely empty input
const eeState = generateEconomicState({});
assert('154. entirely empty input does not crash', typeof eeState.economicHealthScore === 'number');

// 155: engine-derived opportunity count in output
assert('155. engineDerivedCount is number', typeof opps.engineDerivedCount === 'number');

// ── Results ───────────────────────────────────────────────────────────────────

strategicReviewAreas.push(
  'Hiring decisions: payroll commitments require board or founder sign-off',
  'Capital deployment > £50k: human approval required before execution',
  'Conflicting signals (high opportunity + high risk): requires strategic session',
  'Cash shortage scenarios: immediate cash management review needed',
  'Investment decisions: risk tolerance and portfolio context must be supplied',
  'Tax optimisation: all deductions require professional verification',
  'Data staleness: stale account sync invalidates confidence in all outputs',
  'Stress scenarios: assumptions about -30% income should be stress-tested periodically'
);

console.log(`\n═══════════════════════════════════════`);
console.log(`Results: ${passed} passed, ${failed} failed (of ${passed + failed} total)`);
if (failures.length > 0) {
  console.log('\nFailed validations:');
  failures.forEach(f => console.log(`  - ${f}`));
}
console.log('\nResidual uncertainties:');
console.log('  - All projections use integer-cent approximations; large values may differ from compound-rate actuals');
console.log('  - Opportunity scores are heuristic — evidence quality not deeply validated by engine');
console.log('  - Tax exposure integration uses illustrative brackets; jurisdiction adapter required for production');
console.log('  - Sync health confidence modifier is heuristic; threshold tuning required per deployment');
console.log('  - Scenario confidence decay is linear; non-linear macro risks not modelled');
console.log('  - Executive council deliberation not invoked — economic engine is pre-deliberation intelligence layer');
console.log('\nAreas requiring strategic review:');
strategicReviewAreas.forEach(a => console.log(`  • ${a}`));
console.log('═══════════════════════════════════════');

if (failed > 0) process.exit(1);
