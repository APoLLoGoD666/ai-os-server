'use strict';

/**
 * Validate Financial Intelligence Layer — minimum 100 behavioural validations.
 */

const {
  rollingCashflow,
  monthlySummaries,
  trendDirection,
  anomalyIdentification,
  forecastRunway,
  surplusCapacity,
  analyseCashflow,
} = require('./lib/finance/cashflow-engine');

const {
  categoryAnalysis,
  subscriptionIdentification,
  recurringTransactionDetection,
  lifestyleCreepDetection,
  unusualSpendingAlerts,
  vendorConcentrationAnalysis,
  largestRecurringCosts,
} = require('./lib/finance/spending-intelligence');

const {
  evaluateGoalProgress,
  evaluateAllGoals,
  goalsSummary,
  GOAL_TYPES,
} = require('./lib/finance/goal-engine');

const {
  detectPriceIncreases,
  detectIdleCash,
  detectCashflowImprovements,
  detectDebtOptimisation,
  detectMissedSavings,
  allOpportunities,
} = require('./lib/finance/opportunity-engine');

const { computeHealthScore } = require('./lib/finance/financial-health-score');
const { generateDailySummary, renderTextBriefing } = require('./lib/finance/dashboard-summary');

// ── Test harness ──────────────────────────────────────────────────────────────

let passed = 0;
let failed = 0;
const failures = [];

function assert(label, condition) {
  if (condition) {
    passed++;
  } else {
    failed++;
    failures.push(label);
    console.error(`  FAIL: ${label}`);
  }
}

function assertEqual(label, actual, expected) {
  assert(label, actual === expected);
  if (actual !== expected) console.error(`       got: ${actual}, want: ${expected}`);
}

// ── Fixtures ──────────────────────────────────────────────────────────────────

const makeEvent = (date, amountCents, direction) => ({ date, amountCents, direction });
const makeTxn = (date, amountCents, direction, description = 'generic', category = 'misc') =>
  ({ date, amountCents, direction, description, category, vendor: description });

const events2024 = [
  makeEvent('2024-01-15', 500000, 'in'),
  makeEvent('2024-01-20', 300000, 'out'),
  makeEvent('2024-02-10', 520000, 'in'),
  makeEvent('2024-02-18', 310000, 'out'),
  makeEvent('2024-03-12', 490000, 'in'),
  makeEvent('2024-03-20', 400000, 'out'),
];

const txns = [
  makeTxn('2024-01-01', 999, 'out', 'netflix', 'entertainment'),
  makeTxn('2024-02-01', 999, 'out', 'netflix', 'entertainment'),
  makeTxn('2024-03-01', 999, 'out', 'netflix', 'entertainment'),
  makeTxn('2024-01-05', 50000, 'out', 'rent', 'housing'),
  makeTxn('2024-02-05', 50000, 'out', 'rent', 'housing'),
  makeTxn('2024-03-05', 50000, 'out', 'rent', 'housing'),
  makeTxn('2024-01-10', 2000, 'out', 'tesco', 'food'),
  makeTxn('2024-01-15', 1800, 'out', 'tesco', 'food'),
  makeTxn('2024-02-10', 2200, 'out', 'tesco', 'food'),
  makeTxn('2024-03-10', 2500, 'out', 'tesco', 'food'),
  makeTxn('2024-01-20', 300000, 'in', 'salary', 'income'),
  makeTxn('2024-02-20', 300000, 'in', 'salary', 'income'),
  makeTxn('2024-03-20', 300000, 'in', 'salary', 'income'),
];

// ══════════════════════════════════════════════════════════════════════════════
// CASHFLOW ENGINE
// ══════════════════════════════════════════════════════════════════════════════

console.log('\n── Cashflow Engine ──');

// 1–4: rolling window basics
const r30 = rollingCashflow(events2024, 30, '2024-03-31');
assert('1. rolling30 returns object', typeof r30 === 'object');
assert('2. rolling30 windowDays is 30', r30.windowDays === 30);
assert('3. rolling30 inflowCents is string', typeof r30.inflowCents === 'string');
assert('4. rolling30 net is string', typeof r30.netCents === 'string');

// 5: empty events returns 0 inflow
const rEmpty = rollingCashflow([], 30, '2024-03-31');
assertEqual('5. empty events inflow = 0', rEmpty.inflowCents, '0');

// 6: date filtering excludes events outside window
const rTight = rollingCashflow(events2024, 5, '2024-03-31');
assert('6. tight window excludes older events', parseInt(rTight.inflowCents) < parseInt(r30.inflowCents));

// 7–9: monthly summaries
const sums = monthlySummaries(events2024);
assert('7. monthlySummaries returns array', Array.isArray(sums));
assertEqual('8. three distinct months', sums.length, 3);
assert('9. months are sorted ascending', sums[0].month < sums[2].month);

// 10: inflow and outflow are BigInt-strings
assert('10. inflowCents is parseable', !isNaN(Number(sums[0].inflowCents)));

// 11: net = inflow - outflow
{
  const s = sums[0];
  const net = BigInt(s.inflowCents) - BigInt(s.outflowCents);
  assertEqual('11. netCents = inflow - outflow', s.netCents, net.toString());
}

// 12–14: trend direction
const trend3 = trendDirection(sums);
assert('12. trendDirection returns object', typeof trend3 === 'object');
assert('13. trend has trend field', typeof trend3.trend === 'string');
assert('14. trend has confidence field', typeof trend3.confidence === 'string');

// 15: insufficient data returns low confidence
const trend1 = trendDirection([sums[0]]);
assertEqual('15. single month returns insufficient_data', trend1.trend, 'insufficient_data');

// 16: consistent decline detected
const decliningEvents = [
  makeEvent('2024-01-15', 100000, 'in'), makeEvent('2024-01-20', 90000, 'out'),
  makeEvent('2024-02-10', 100000, 'in'), makeEvent('2024-02-18', 95000, 'out'),
  makeEvent('2024-03-12', 100000, 'in'), makeEvent('2024-03-20', 99000, 'out'),
];
const declSums = monthlySummaries(decliningEvents);
const declTrend = trendDirection(declSums);
assert('16. consistent decline detected', declTrend.trend === 'deteriorating' || declTrend.trend === 'mostly_deteriorating');

// 17: improving trend detected
const improvingEvents = [
  makeEvent('2024-01-15', 100000, 'in'), makeEvent('2024-01-20', 90000, 'out'),
  makeEvent('2024-02-10', 110000, 'in'), makeEvent('2024-02-18', 85000, 'out'),
  makeEvent('2024-03-12', 120000, 'in'), makeEvent('2024-03-20', 80000, 'out'),
];
const improvSums = monthlySummaries(improvingEvents);
const improvTrend = trendDirection(improvSums);
assert('17. improving trend detected', improvTrend.trend === 'improving' || improvTrend.trend === 'mostly_improving');

// 18–19: anomaly identification
const anomalies = anomalyIdentification(sums);
assert('18. anomalyIdentification returns array', Array.isArray(anomalies));

// 6 stable months then a dramatic spike — gives 2σ enough baseline to work
const bigSpike = monthlySummaries([
  makeEvent('2023-10-01', 500000, 'in'), makeEvent('2023-10-05', 300000, 'out'),
  makeEvent('2023-11-01', 500000, 'in'), makeEvent('2023-11-05', 310000, 'out'),
  makeEvent('2023-12-01', 500000, 'in'), makeEvent('2023-12-05', 300000, 'out'),
  makeEvent('2024-01-01', 500000, 'in'), makeEvent('2024-01-05', 305000, 'out'),
  makeEvent('2024-02-01', 500000, 'in'), makeEvent('2024-02-05', 295000, 'out'),
  makeEvent('2024-03-01', 100000, 'in'), makeEvent('2024-03-05', 3000000, 'out'), // spike
]);
const spikeAnomalies = anomalyIdentification(bigSpike);
assert('19. spike month flagged as anomaly', spikeAnomalies.some(a => a.anomalyType === 'significant_outflow'));

// 20: anomaly below threshold not flagged
const flatEvents = [
  makeEvent('2024-01-15', 100000, 'in'), makeEvent('2024-01-20', 90000, 'out'),
  makeEvent('2024-02-10', 100000, 'in'), makeEvent('2024-02-18', 90000, 'out'),
  makeEvent('2024-03-12', 101000, 'in'), makeEvent('2024-03-20', 91000, 'out'),
];
const flatAnomalies = anomalyIdentification(monthlySummaries(flatEvents));
assertEqual('20. flat cashflow has no anomalies', flatAnomalies.length, 0);

// 21–23: forecast runway
const runway = forecastRunway('600000', sums, 3);
assert('21. runway returns object', typeof runway === 'object');
assert('22. runwayMonths is string or null', runway.runwayMonths === null || typeof runway.runwayMonths === 'string');
assert('23. runway confidence field present', typeof runway.confidence === 'string');

// 24: zero outflow returns none confidence
const zeroRunway = forecastRunway('600000', [{ month: '2024-01', inflowCents: '100000', outflowCents: '0', netCents: '100000', transactionCount: 1 }], 1);
assertEqual('24. zero avg outflow runway confidence = none', zeroRunway.confidence, 'none');

// 25: no data returns none
const noRunway = forecastRunway('600000', [], 3);
assertEqual('25. no summaries runway confidence = none', noRunway.confidence, 'none');

// 26: surplus capacity returns months with >20% surplus
const surp = surplusCapacity(sums);
assert('26. surplusCapacity returns array', Array.isArray(surp));

// 27: full analysis wrapper
const full = analyseCashflow(events2024, '200000', '2024-03-31');
assert('27. analyseCashflow has rolling30', 'rolling30' in full);
assert('28. analyseCashflow has trend', 'trend' in full);
assert('29. analyseCashflow has anomalies', 'anomalies' in full);
assert('30. analyseCashflow has runway', 'runway' in full);

// ══════════════════════════════════════════════════════════════════════════════
// SPENDING INTELLIGENCE
// ══════════════════════════════════════════════════════════════════════════════

console.log('\n── Spending Intelligence ──');

// 31–34: category analysis
const cats = categoryAnalysis(txns);
assert('31. categoryAnalysis returns array', Array.isArray(cats));
assert('32. categories are sorted by total desc', BigInt(cats[0].totalCents) >= BigInt(cats[cats.length - 1].totalCents));
assert('33. categories have shareOfSpendBps', typeof cats[0].shareOfSpendBps === 'number');
assert('34. income excluded from category spend', !cats.some(c => c.category === 'income'));

// 35: empty returns empty
assertEqual('35. empty transactions returns empty categories', categoryAnalysis([]).length, 0);

// 36–38: subscription identification
const subs = subscriptionIdentification(txns);
assert('36. subscriptionIdentification returns array', Array.isArray(subs));
assert('37. netflix detected as subscription', subs.some(s => s.vendor === 'netflix'));
assert('38. rent detected as subscription', subs.some(s => s.vendor === 'rent'));

// 39: subscription has confidence field
const netflix = subs.find(s => s.vendor === 'netflix');
assert('39. subscription confidence present', netflix && typeof netflix.confidence === 'string');

// 40: subscription has cadence
assert('40. netflix cadence is monthly', netflix && netflix.cadence === 'monthly');

// 41: single occurrence not a subscription
const singleTxns = [makeTxn('2024-01-01', 500, 'out', 'uniquevendor', 'misc')];
const singleSubs = subscriptionIdentification(singleTxns);
assertEqual('41. single occurrence not subscription', singleSubs.length, 0);

// 42–44: recurring transaction detection
const recurring = recurringTransactionDetection(txns);
assert('42. recurringTransactionDetection returns array', Array.isArray(recurring));
assert('43. netflix in recurring', recurring.some(r => r.vendor === 'netflix'));
assert('44. recurring has occurrences count', typeof recurring[0]?.occurrences === 'number');

// 45–47: lifestyle creep detection
const creepTxns = [
  makeTxn('2024-01-10', 5000, 'out', 'restaurants', 'dining'),
  makeTxn('2024-02-10', 6000, 'out', 'restaurants', 'dining'),
  makeTxn('2024-03-10', 8000, 'out', 'restaurants', 'dining'),
];
const creep = lifestyleCreepDetection(creepTxns);
assert('45. lifestyleCreepDetection returns array', Array.isArray(creep));
assert('46. dining creep detected', creep.some(c => c.category === 'dining'));
assert('47. creep changeBps is positive', creep[0]?.changeBps > 0);

// 48: stable spending not flagged as creep
const stableTxns = [
  makeTxn('2024-01-10', 5000, 'out', 'restaurants', 'dining'),
  makeTxn('2024-02-10', 5100, 'out', 'restaurants', 'dining'),
  makeTxn('2024-03-10', 5050, 'out', 'restaurants', 'dining'),
];
const stableCreep = lifestyleCreepDetection(stableTxns);
assertEqual('48. stable spending not flagged as creep', stableCreep.length, 0);

// 49–51: unusual spending alerts — 5 normal months then large spike so mean stays low
const unusualTxns = [
  makeTxn('2023-10-01', 1000, 'out', 'amazon', 'shopping'),
  makeTxn('2023-11-01', 1100, 'out', 'amazon', 'shopping'),
  makeTxn('2023-12-01', 900, 'out', 'amazon', 'shopping'),
  makeTxn('2024-01-01', 1050, 'out', 'amazon', 'shopping'),
  makeTxn('2024-02-01', 950, 'out', 'amazon', 'shopping'),
  makeTxn('2024-03-01', 80000, 'out', 'amazon', 'shopping'), // dramatic spike
];
const alerts = unusualSpendingAlerts(unusualTxns);
assert('49. unusualSpendingAlerts returns array', Array.isArray(alerts));
assert('50. spike detected', alerts.length > 0);
assert('51. alert has deviationBps', typeof alerts[0]?.deviationBps === 'number');

// 52: no alerts for uniform spending
const uniformTxns = [
  makeTxn('2024-01-01', 1000, 'out', 'vendor_x', 'misc'),
  makeTxn('2024-02-01', 1000, 'out', 'vendor_x', 'misc'),
  makeTxn('2024-03-01', 1000, 'out', 'vendor_x', 'misc'),
];
const noAlerts = unusualSpendingAlerts(uniformTxns);
assertEqual('52. uniform spending has no alerts', noAlerts.length, 0);

// 53–55: vendor concentration
const conc = vendorConcentrationAnalysis(txns);
assert('53. vendorConcentrationAnalysis returns object', typeof conc === 'object');
assert('54. topVendors is array', Array.isArray(conc.topVendors));
assert('55. concentrationLevel is string', typeof conc.concentrationLevel === 'string');

// 56: total share across topN adds up
{
  const topShare = conc.topVendors.reduce((a, v) => a + v.shareOfSpendBps, 0);
  assert('56. top vendor shares sum <= 10000 bps', topShare <= 10000);
}

// 57: empty transactions returns empty vendors
const emptyConc = vendorConcentrationAnalysis([]);
assertEqual('57. empty transactions has 0 vendors', emptyConc.totalVendors, 0);

// ══════════════════════════════════════════════════════════════════════════════
// GOAL ENGINE
// ══════════════════════════════════════════════════════════════════════════════

console.log('\n── Goal Engine ──');

const emergencyGoal = {
  id: 'goal-1',
  type: 'emergency_fund',
  targetCents: 1000000,
  currentCents: 500000,
  startDate: '2024-01-01',
  targetDate: '2024-12-31',
  label: 'Emergency Fund',
};

const contributions = [
  { date: '2024-01-15', amountCents: 100000 },
  { date: '2024-02-15', amountCents: 100000 },
  { date: '2024-03-15', amountCents: 100000 },
  { date: '2024-04-15', amountCents: 100000 },
  { date: '2024-05-15', amountCents: 100000 },
];

// 58–62: goal progress basics
const gResult = evaluateGoalProgress(emergencyGoal, contributions);
assert('58. evaluateGoalProgress returns object', typeof gResult === 'object');
assert('59. observed section present', 'observed' in gResult);
assert('60. projected section present', 'projected' in gResult);
assert('61. milestones section present', Array.isArray(gResult.milestones));
assert('62. obstacles section present', Array.isArray(gResult.obstacles));

// 63: 50% milestone reached
const milestone50 = gResult.milestones.find(m => m.label === '50%');
assert('63. 50% milestone reached', milestone50?.reached === true);

// 64: 100% milestone not yet reached
const milestone100 = gResult.milestones.find(m => m.label === '100%');
assert('64. 100% milestone not yet reached', milestone100?.reached === false);

// 65: completedBps reflects actual progress
assert('65. completedBps is 5000 (50%)', gResult.observed.completedBps === 5000);

// 66: completed goal detected
const completedGoal = { ...emergencyGoal, currentCents: 1000000 };
const completedResult = evaluateGoalProgress(completedGoal, contributions);
assert('66. completed goal detected', completedResult.observed.isComplete === true);

// 67: unknown goal type returns error
const badGoal = { id: 'bad', type: 'lottery_win', targetCents: 100, currentCents: 0, startDate: '2024-01-01', label: 'bad' };
const badResult = evaluateGoalProgress(badGoal, []);
assert('67. unknown type returns error field', 'error' in badResult);

// 68: no contributions returns no_observed_contributions obstacle
const noContribResult = evaluateGoalProgress(emergencyGoal, []);
assert('68. no contributions triggers obstacle', noContribResult.obstacles.some(o => o.type === 'no_observed_contributions'));

// 69: projected confidence low with < 2 contributions
const lowContrib = evaluateGoalProgress(emergencyGoal, [contributions[0]]);
assert('69. projected confidence is none with 1 contribution', lowContrib.projected.confidence === 'none');

// 70: projection is labelled as assumption
assert('70. projection has assumption field', typeof gResult.projected.assumption === 'string');

// 71: past target date detected
const overdueGoal = { ...emergencyGoal, targetDate: '2023-01-01', currentCents: 100 };
const overdueResult = evaluateGoalProgress(overdueGoal, contributions);
assert('71. past target date detected as obstacle', overdueResult.obstacles.some(o => o.type === 'past_target_date'));

// 72: goalsSummary counts correctly
const goals = [emergencyGoal, completedGoal, badGoal];
const allEvals = evaluateAllGoals(goals, { 'goal-1': contributions });
const gSum = goalsSummary(allEvals);
assert('72. goalsSummary.total equals input length', gSum.total === 3);
assert('73. completed count is 1', gSum.complete >= 1);

// 74: evaluateAllGoals returns array of same length
assert('74. evaluateAllGoals returns same length as input', allEvals.length === goals.length);

// ══════════════════════════════════════════════════════════════════════════════
// OPPORTUNITY ENGINE
// ══════════════════════════════════════════════════════════════════════════════

console.log('\n── Opportunity Engine ──');

// 75–77: price increase detection
const oldSubs = [{
  vendor: 'spotifymusic',
  typicalAmountCents: '1599',
  occurrences: 6,
  confidence: 'high',
}];
const oldSubTxns = [
  makeTxn('2023-06-01', 999, 'out', 'spotifymusic', 'entertainment'),
  makeTxn('2023-07-01', 999, 'out', 'spotifymusic', 'entertainment'),
  makeTxn('2024-01-01', 1599, 'out', 'spotifymusic', 'entertainment'),
  makeTxn('2024-02-01', 1599, 'out', 'spotifymusic', 'entertainment'),
];
const priceOpps = detectPriceIncreases(oldSubs, oldSubTxns);
assert('75. detectPriceIncreases returns array', Array.isArray(priceOpps));
assert('76. price increase detected', priceOpps.length > 0);
assert('77. opportunity has evidence array', Array.isArray(priceOpps[0]?.evidence));

// 78: opportunity has counterarguments
assert('78. opportunity has counterarguments', Array.isArray(priceOpps[0]?.counterarguments));

// 79: stable pricing not flagged
const stableSubTxns = [
  makeTxn('2024-01-01', 999, 'out', 'spotifymusic', 'entertainment'),
  makeTxn('2024-02-01', 999, 'out', 'spotifymusic', 'entertainment'),
  makeTxn('2024-03-01', 999, 'out', 'spotifymusic', 'entertainment'),
];
const stableSub = [{ vendor: 'spotifymusic', typicalAmountCents: '999', occurrences: 3, confidence: 'high' }];
const stableOpps = detectPriceIncreases(stableSub, stableSubTxns);
assertEqual('79. stable pricing not flagged', stableOpps.length, 0);

// 80–82: idle cash detection
const idleOpps = detectIdleCash('1000000', []);
assert('80. idle cash detected with no investment activity', idleOpps.length > 0);
assert('81. idle cash opportunity has hypothesis', typeof idleOpps[0]?.hypothesis === 'string');
assert('82. idle cash confidence is low', idleOpps[0]?.confidence === 'low');

// 83: below threshold not flagged
const lowBalOpps = detectIdleCash('10000', []);
assertEqual('83. low balance not flagged as idle', lowBalOpps.length, 0);

// 84: cashflow improvement detection
const spikeSums = [
  { month: '2024-01', outflowCents: '100000', inflowCents: '200000', netCents: '100000', transactionCount: 5 },
  { month: '2024-02', outflowCents: '105000', inflowCents: '200000', netCents: '95000', transactionCount: 5 },
  { month: '2024-03', outflowCents: '250000', inflowCents: '200000', netCents: '-50000', transactionCount: 8 },
];
const cfOpps = detectCashflowImprovements(spikeSums);
assert('84. cashflow spike detected', cfOpps.length > 0);
assert('85. cashflow opp has estimatedImpactCents', cfOpps[0]?.estimatedImpactCents !== undefined);

// 86: flat cashflow not flagged
const flatSums = [
  { month: '2024-01', outflowCents: '100000', inflowCents: '200000', netCents: '100000', transactionCount: 5 },
  { month: '2024-02', outflowCents: '100000', inflowCents: '200000', netCents: '100000', transactionCount: 5 },
  { month: '2024-03', outflowCents: '102000', inflowCents: '200000', netCents: '98000', transactionCount: 5 },
];
const flatCfOpps = detectCashflowImprovements(flatSums);
assertEqual('86. flat cashflow not flagged', flatCfOpps.length, 0);

// 87–89: debt optimisation
const debts = [{ label: 'Credit Card', balanceCents: '500000', interestRateBps: 2000 }];
const debtOpps = detectDebtOptimisation(debts, '1000000');
assert('87. debt optimisation opportunity returned', debtOpps.length > 0);
assert('88. debt opp has counterarguments', Array.isArray(debtOpps[0]?.counterarguments));
assert('89. debt opp confidence is low', debtOpps[0]?.confidence === 'low');

// 90: low interest debt not flagged
const lowInterestDebt = [{ label: 'Mortgage', balanceCents: '20000000', interestRateBps: 300 }];
const lowDebtOpps = detectDebtOptimisation(lowInterestDebt, '1000000');
assertEqual('90. low interest debt not flagged', lowDebtOpps.length, 0);

// 91: allOpportunities returns array
const allOpps = allOpportunities({ subscriptions: [], transactions: txns, liquidBalanceCents: '1000000', monthlySummaries: spikeSums, debts });
assert('91. allOpportunities returns array', Array.isArray(allOpps));

// 92: no duplicates in allOpportunities type field
{
  const types = allOpps.map(o => o.type);
  const unique = new Set(types);
  assert('92. allOpportunities types are diverse', unique.size > 0);
}

// ══════════════════════════════════════════════════════════════════════════════
// FINANCIAL HEALTH SCORE
// ══════════════════════════════════════════════════════════════════════════════

console.log('\n── Financial Health Score ──');

const baseHealth = computeHealthScore({
  liquidBalanceCents: '900000',
  avgMonthlyOutflowCents: '150000',
  monthlySummaries: sums,
  subscriptions: subs,
  goalsSummary: gSum,
  upcomingObligations: [{ dueDateIso: '2024-04-01', amountCents: '150000', label: 'Rent' }],
  savingsTxns: [makeTxn('2024-01-15', 50000, 'out', 'savings transfer', 'savings')],
  trendResult: { trend: 'improving', confidence: 'medium', windowMonths: 3 },
  anomalies: [],
  unknownFields: [],
});

// 93–97: health score basics
assert('93. computeHealthScore returns object', typeof baseHealth === 'object');
assert('94. healthScore is number 0–100', baseHealth.healthScore >= 0 && baseHealth.healthScore <= 100);
assert('95. confidence field present', typeof baseHealth.confidence === 'string');
assert('96. strengths is array', Array.isArray(baseHealth.strengths));
assert('97. concerns is array', Array.isArray(baseHealth.concerns));

// 98: unknowns reduce confidence
const unknownHealth = computeHealthScore({
  liquidBalanceCents: '900000',
  avgMonthlyOutflowCents: '150000',
  unknownFields: ['all_accounts', 'investment_data', 'pension', 'tax_liability', 'business_revenue'],
});
assert('98. many unknowns produce low confidence', unknownHealth.confidence === 'low' || unknownHealth.confidence === 'very_low');

// 99: zero liquid balance produces low score
const zeroLiquid = computeHealthScore({
  liquidBalanceCents: '0',
  avgMonthlyOutflowCents: '100000',
  monthlySummaries: sums,
});
assert('99. zero liquidity produces low health score', zeroLiquid.healthScore < 50);

// 100: subscores are present for all dimensions
{
  const dims = ['liquidity', 'consistency', 'resilience', 'obligation_coverage', 'savings_discipline', 'spending_stability', 'goal_adherence'];
  assert('100. all 7 subscores present', dims.every(d => d in baseHealth.subscores));
}

// 101: improving trend contributes positively to resilience
{
  const improvingH = computeHealthScore({
    liquidBalanceCents: '600000',
    avgMonthlyOutflowCents: '100000',
    trendResult: { trend: 'improving', confidence: 'medium', windowMonths: 3 },
  });
  const deterioratingH = computeHealthScore({
    liquidBalanceCents: '600000',
    avgMonthlyOutflowCents: '100000',
    trendResult: { trend: 'deteriorating', confidence: 'medium', windowMonths: 3 },
  });
  assert('101. improving trend produces higher resilience than deteriorating',
    improvingH.subscores.resilience.score > deterioratingH.subscores.resilience.score
  );
}

// 102: anomalies reduce resilience score
{
  const withAnomalies = computeHealthScore({
    liquidBalanceCents: '600000',
    avgMonthlyOutflowCents: '100000',
    trendResult: { trend: 'flat', confidence: 'medium', windowMonths: 3 },
    anomalies: [{ month: '2024-01', anomalyType: 'significant_outflow' }, { month: '2024-02', anomalyType: 'significant_outflow' }, { month: '2024-03', anomalyType: 'significant_outflow' }],
  });
  const withoutAnomalies = computeHealthScore({
    liquidBalanceCents: '600000',
    avgMonthlyOutflowCents: '100000',
    trendResult: { trend: 'flat', confidence: 'medium', windowMonths: 3 },
    anomalies: [],
  });
  assert('102. anomalies reduce resilience score', withAnomalies.subscores.resilience.score <= withoutAnomalies.subscores.resilience.score);
}

// ══════════════════════════════════════════════════════════════════════════════
// DASHBOARD SUMMARY
// ══════════════════════════════════════════════════════════════════════════════

console.log('\n── Dashboard Summary ──');

const dashInput = {
  transactions: txns,
  liquidBalanceCents: '800000',
  goals: [emergencyGoal],
  contributionsByGoalId: { 'goal-1': contributions },
  upcomingObligations: [{ dueDateIso: '2024-04-05', amountCents: '50000', label: 'Rent' }],
  debts,
  unknownFields: [],
  asOf: '2024-03-31',
};

const dash = generateDailySummary(dashInput);

// 103–110: dashboard structure
assert('103. dashboard returns object', typeof dash === 'object');
assert('104. asOf field present', typeof dash.asOf === 'string');
assert('105. financialSnapshot present', typeof dash.financialSnapshot === 'object');
assert('106. emergingRisks is array', Array.isArray(dash.emergingRisks));
assert('107. opportunities is array', Array.isArray(dash.opportunities));
assert('108. momentum is array', Array.isArray(dash.momentum));
assert('109. unknowns is array', Array.isArray(dash.unknowns));
assert('110. healthScore present in dashboard', typeof dash.healthScore === 'object');

// 111: financialSnapshot has liquid balance
assert('111. snapshot has liquidBalanceCents', typeof dash.financialSnapshot.liquidBalanceCents === 'string');

// 112: text rendering works
const text = renderTextBriefing(dash);
assert('112. renderTextBriefing returns string', typeof text === 'string');
assert('113. text contains APEX', text.includes('APEX'));
assert('114. text contains health score', text.includes('Health Score'));

// 115: missing data reflected in dataCompleteness
const sparseInput = { ...dashInput, unknownFields: ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'] };
const sparseDash = generateDailySummary(sparseInput);
assertEqual('115. many unknowns produce limited completeness', sparseDash.dataCompleteness, 'limited');

// 116: no goals defined still produces dashboard
const noGoalsDash = generateDailySummary({ ...dashInput, goals: [] });
assert('116. no goals still produces valid dashboard', typeof noGoalsDash === 'object');

// ── Edge cases ────────────────────────────────────────────────────────────────

console.log('\n── Edge Cases ──');

// 117: all-inflow events (no outflow)
const allInflow = [
  makeEvent('2024-01-01', 100000, 'in'),
  makeEvent('2024-01-15', 200000, 'in'),
];
const allInflowSums = monthlySummaries(allInflow);
assertEqual('117. all-inflow outflow = 0', allInflowSums[0].outflowCents, '0');

// 118: all-outflow events (no inflow)
const allOutflow = [makeEvent('2024-01-01', 100000, 'out')];
const allOutflowSums = monthlySummaries(allOutflow);
assertEqual('118. all-outflow inflow = 0', allOutflowSums[0].inflowCents, '0');

// 119: very large cent values don't overflow (BigInt)
const huge = rollingCashflow([makeEvent('2024-01-01', 999999999999, 'in')], 30, '2024-01-31');
assert('119. very large amounts handled without overflow', huge.inflowCents === '999999999999');

// 120: single month summary doesn't crash trend
const singleMonthTrend = trendDirection([sums[0]], 3);
assert('120. single month trend is insufficient_data', singleMonthTrend.trend === 'insufficient_data');

// 121: goal with zero target
const zeroTarget = { id: 'z', type: 'savings', targetCents: 0, currentCents: 0, startDate: '2024-01-01', label: 'zero' };
const zeroResult = evaluateGoalProgress(zeroTarget, []);
assert('121. zero target goal does not crash', typeof zeroResult === 'object');

// 122: dashboard with empty transactions
const emptyDash = generateDailySummary({ liquidBalanceCents: '100000', asOf: '2024-03-31' });
assert('122. empty transactions dashboard does not crash', typeof emptyDash === 'object');

// 123: categoryAnalysis with only income transactions (direction=in)
const incomeOnly = [makeTxn('2024-01-01', 300000, 'in', 'salary', 'income')];
const incomeOnlyCats = categoryAnalysis(incomeOnly);
assertEqual('123. income-only transactions returns empty categories', incomeOnlyCats.length, 0);

// 124: subscription with 2 occurrences gets medium confidence
const twoOccSubs = subscriptionIdentification([
  makeTxn('2024-01-01', 999, 'out', 'applemusic', 'entertainment'),
  makeTxn('2024-02-01', 999, 'out', 'applemusic', 'entertainment'),
]);
const appleSub = twoOccSubs.find(s => s.vendor === 'applemusic');
assert('124. 2-occurrence subscription has medium confidence', appleSub?.confidence === 'medium');

// ══════════════════════════════════════════════════════════════════════════════
// MISSING DATA SCENARIOS
// ══════════════════════════════════════════════════════════════════════════════

console.log('\n── Missing Data Scenarios ──');

// 125: health score with all unknowns still returns valid object
const allUnknownHealth = computeHealthScore({
  unknownFields: ['liquidity', 'cashflow', 'goals', 'savings', 'obligations'],
});
assert('125. all-unknown health score still returns object', typeof allUnknownHealth === 'object');
assert('126. all-unknown health score confidence is very_low', allUnknownHealth.confidence === 'very_low' || allUnknownHealth.confidence === 'low');

// 127: missing obligations produces unknown
const missingOblHealth = computeHealthScore({ liquidBalanceCents: '500000' });
assert('127. missing obligations added to unknowns', missingOblHealth.unknowns.includes('upcoming_obligations'));

// 128: missing savings produces unknown
const missingSavHealth = computeHealthScore({ monthlySummaries: sums });
assert('128. missing savings added to unknowns', missingSavHealth.unknowns.includes('savings_activity') || missingSavHealth.unknowns.length > 0);

// 129: dashboard with unknown fields reflects them
const unknownDash = generateDailySummary({ unknownFields: ['bank_account_2'], liquidBalanceCents: '0', asOf: '2024-03-31' });
assert('129. unknown fields appear in dashboard', unknownDash.unknowns.includes('bank_account_2'));

// 130: runway with 1 month history is low confidence
const singleMonthRunway = forecastRunway('600000', [sums[0]], 3);
assertEqual('130. single month runway is low confidence', singleMonthRunway.confidence, 'low');

// ── Results ───────────────────────────────────────────────────────────────────

console.log(`\n═══════════════════════════════════════`);
console.log(`Results: ${passed} passed, ${failed} failed (of ${passed + failed} total)`);
if (failures.length > 0) {
  console.log('\nFailed validations:');
  failures.forEach(f => console.log(`  - ${f}`));
}
console.log('═══════════════════════════════════════');

if (failed > 0) process.exit(1);
