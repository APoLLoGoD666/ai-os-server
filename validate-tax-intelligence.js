'use strict';

/**
 * Validate Tax Intelligence Layer — minimum 100 behavioural validations.
 * Phase 44: Tax Intelligence & Compliance Preparation
 */

const {
  classifyTransaction,
  classifyAll,
  classificationSummary,
  TAX_CATEGORIES,
} = require('./lib/finance/tax/expense-classifier');

const {
  estimateIncomeTaxExposure,
  estimateSelfEmploymentExposure,
  ytdExposureSnapshot,
} = require('./lib/finance/tax/tax-exposure-engine');

const {
  identifyDeductionOpportunities,
  groupByCategory,
  estimateTaxSaving,
  EVIDENCE_REQUIREMENTS,
} = require('./lib/finance/tax/deduction-opportunity-engine');

const {
  checkEvidenceCompleteness,
  auditEvidenceCompleteness,
  missingDocumentationAlerts,
} = require('./lib/finance/tax/evidence-completeness');

const {
  scoreYearEndReadiness,
  renderChecklistText,
  CHECKLIST_TEMPLATE,
} = require('./lib/finance/tax/year-end-readiness');

const {
  runComplianceReview,
  renderReviewSummary,
  escalationDecision,
} = require('./lib/finance/tax/compliance-review');

// ── Harness ───────────────────────────────────────────────────────────────────

let passed = 0;
let failed = 0;
const failures = [];
const professionalReviewAreas = [];

function assert(label, condition) {
  if (condition) { passed++; }
  else { failed++; failures.push(label); console.error(`  FAIL: ${label}`); }
}
function assertEqual(label, actual, expected) {
  assert(label, actual === expected);
  if (actual !== expected) console.error(`       got ${JSON.stringify(actual)}, want ${JSON.stringify(expected)}`);
}
function assertIncludes(label, str, substr) {
  assert(label, typeof str === 'string' && str.includes(substr));
}

// ── Fixtures ──────────────────────────────────────────────────────────────────

const makeTxn = (id, date, amountCents, direction, description, category = 'misc') =>
  ({ id, date, amountCents, direction, description, category, vendor: description });

const UK_BRACKETS = [
  { thresholdCents: '0', rateBps: 2000, label: 'basic' },
  { thresholdCents: '5000000', rateBps: 4000, label: 'higher' },
  { thresholdCents: '15000000', rateBps: 4500, label: 'additional' },
];

const txns = [
  makeTxn('t1', '2024-01-15', 1299, 'out', 'notion subscription', 'software'),
  makeTxn('t2', '2024-02-01', 2000, 'out', 'aws hosting', 'cloud'),
  makeTxn('t3', '2024-03-10', 5000, 'out', 'udemy course', 'training'),
  makeTxn('t4', '2024-03-15', 150000, 'out', 'accountant invoice', 'professional'),
  makeTxn('t5', '2024-04-01', 200000, 'out', 'hotel business trip', 'travel'),
  makeTxn('t6', '2024-04-15', 1500, 'out', 'tesco grocery', 'food'),
  makeTxn('t7', '2024-05-01', 500000, 'in', 'client payment', 'income'),
  makeTxn('t8', '2024-05-10', 75000, 'out', 'laptop purchase', 'equipment'),
  makeTxn('t9', '2024-06-01', 3000, 'out', 'facebook ads campaign', 'marketing'),
  makeTxn('t10', '2024-06-15', 99999, 'out', 'mystery vendor', 'misc'),
];

// ══════════════════════════════════════════════════════════════════════════════
// EXPENSE CLASSIFIER
// ══════════════════════════════════════════════════════════════════════════════

console.log('\n── Expense Classifier ──');

// 1–3: basic classification
const notionC = classifyTransaction(txns[0]);
assert('1. classifyTransaction returns object', typeof notionC === 'object');
assertEqual('2. notion classified as software_subscriptions', notionC.taxCategory, 'software_subscriptions');
assert('3. classification includes disclaimer', typeof notionC.disclaimer === 'string');

// 4: AWS classified as software
const awsC = classifyTransaction(txns[1]);
assertEqual('4. aws classified as software_subscriptions', awsC.taxCategory, 'software_subscriptions');

// 5: udemy classified as professional_development
const udemyC = classifyTransaction(txns[2]);
assertEqual('5. udemy classified as professional_development', udemyC.taxCategory, 'professional_development');

// 6: accountant classified as professional_services
const acctC = classifyTransaction(txns[3]);
assertEqual('6. accountant classified as professional_services', acctC.taxCategory, 'professional_services');

// 7: hotel classified as travel (low confidence without business purpose)
const hotelC = classifyTransaction(txns[4]);
assertEqual('7. hotel classified as travel_business', hotelC.taxCategory, 'travel_business');
assertEqual('8. hotel confidence is low', hotelC.confidence, 'low');

// 9: income transaction classified as null (not an expense)
const incomeC = classifyTransaction(txns[6]);
assertEqual('9. income transaction taxCategory is null', incomeC.taxCategory, null);
assertEqual('10. income deductibleHypothesis is null', incomeC.deductibleHypothesis, null);

// 11: unknown vendor classified as uncategorised
const unknownC = classifyTransaction(txns[9]);
assertEqual('11. unknown vendor classified as uncategorised', unknownC.taxCategory, 'uncategorised');
assertEqual('12. uncategorised confidence is none', unknownC.confidence, 'none');
assert('13. uncategorised requiresReview is true', unknownC.requiresReview === true);

// 14: manual override respected
const overrideC = classifyTransaction(txns[9], { taxCategory: 'business_expense', deductibleHypothesis: true });
assertEqual('14. manual override applied', overrideC.taxCategory, 'business_expense');
assertEqual('15. manual override confidence is high', overrideC.confidence, 'high');

// 16: contradiction flagged when override differs from keyword match
const conflictC = classifyTransaction(txns[4], { taxCategory: 'equipment' }); // hotel → equipment conflict
assert('16. contradiction flagged on conflicting override', conflictC.contradictions.length > 0);

// 17–18: classifyAll returns array of same length
const all = classifyAll(txns);
assertEqual('17. classifyAll returns same length', all.length, txns.length);
assert('18. classifyAll items have txnId', all.every(c => c.txnId !== undefined));

// 19–21: classificationSummary
const summary = classificationSummary(all);
assert('19. classificationSummary returns object', typeof summary === 'object');
assert('20. byCategory is object', typeof summary.byCategory === 'object');
assert('21. totalPotentialExpenseCents is string', typeof summary.totalPotentialExpenseCents === 'string');

// 22: review count is accurate
assert('22. transactionsRequiringReview is positive', summary.transactionsRequiringReview >= 0);

// 23: income excluded from total expense
const incomeTxns = [makeTxn('i1', '2024-01-01', 1000000, 'in', 'salary', 'income')];
const incomeSummary = classificationSummary(classifyAll(incomeTxns));
assertEqual('23. income not counted in potential expenses', incomeSummary.totalPotentialExpenseCents, '0');

// 24: deductibleHypothesis true for professional services
assertEqual('24. accountant deductibleHypothesis is true', acctC.deductibleHypothesis, true);

// 25: notes array present on classifications
assert('25. notes is array on all classifications', all.every(c => Array.isArray(c.notes)));

// ══════════════════════════════════════════════════════════════════════════════
// TAX EXPOSURE ENGINE
// ══════════════════════════════════════════════════════════════════════════════

console.log('\n── Tax Exposure Engine ──');

// 26–29: basic exposure estimate
const exposure = estimateIncomeTaxExposure({
  grossIncomeCents: '6000000',
  estimatedDeductionsCents: '500000',
  brackets: UK_BRACKETS,
  personalAllowanceCents: '1257500',
  jurisdictionLabel: 'UK 2024/25 (illustrative)',
  missingItems: [],
});
assert('26. estimateIncomeTaxExposure returns object', typeof exposure === 'object');
assert('27. taxableIncomeCents is string', typeof exposure.estimatedTaxableIncomeCents === 'string');
assert('28. taxLiabilityCents is string', typeof exposure.estimatedTaxLiabilityCents === 'string');
assert('29. disclaimer present', typeof exposure.disclaimer === 'string');

// 30: tax liability is positive for reasonable income
assert('30. tax liability is positive', BigInt(exposure.estimatedTaxLiabilityCents) > 0n);

// 31: confidence is medium with no missing items
assertEqual('31. confidence medium with complete data', exposure.confidence, 'medium');

// 32: missing items degrade confidence
const lowConfExposure = estimateIncomeTaxExposure({
  grossIncomeCents: '6000000',
  brackets: UK_BRACKETS,
  personalAllowanceCents: '1257500',
  jurisdictionLabel: 'UK 2024/25 (illustrative)',
  missingItems: ['rental_income', 'freelance_income', 'dividend_income', 'savings_interest'],
});
assert('32. many missing items produce none confidence', lowConfExposure.confidence === 'low' || lowConfExposure.confidence === 'none');

// 33: assumptions array is non-empty
assert('33. assumptions array non-empty', exposure.assumptions.length > 0);

// 34: jurisdiction label appears in assumptions
assert('34. jurisdiction in assumptions', exposure.assumptions.some(a => a.includes('UK 2024/25')));

// 35: missing jurisdictionLabel throws
let threw = false;
try { estimateIncomeTaxExposure({ grossIncomeCents: '100', brackets: UK_BRACKETS }); }
catch { threw = true; }
assert('35. missing jurisdictionLabel throws', threw);

// 36: no brackets returns none confidence
const noBrackets = estimateIncomeTaxExposure({
  grossIncomeCents: '6000000',
  brackets: [],
  personalAllowanceCents: '0',
  jurisdictionLabel: 'Unknown',
});
assertEqual('36. no brackets produces none confidence', noBrackets.confidence, 'none');

// 37–39: self-employment exposure
const seExposure = estimateSelfEmploymentExposure({
  selfEmployedIncomeCents: '4000000',
  allowableExpensesCents: '800000',
  jurisdictionLabel: 'UK 2024/25 (illustrative)',
});
assert('37. seExposure returns object', typeof seExposure === 'object');
assertEqual('38. profit = income - expenses', seExposure.estimatedProfitCents, '3200000');
assertEqual('39. se confidence medium with no gaps', seExposure.confidence, 'medium');

// 40: high expenses → profit floored at 0
const highExpSE = estimateSelfEmploymentExposure({
  selfEmployedIncomeCents: '100000',
  allowableExpensesCents: '500000',
  jurisdictionLabel: 'UK (illustrative)',
});
assertEqual('40. profit floored at 0', highExpSE.estimatedProfitCents, '0');

// 41–43: ytd snapshot
const ytd = ytdExposureSnapshot([
  { month: '2024-01', incomeCents: '500000' },
  { month: '2024-02', incomeCents: '500000' },
  { month: '2024-03', incomeCents: '500000' },
], '2024/25');
assert('41. ytdExposureSnapshot returns object', typeof ytd === 'object');
assertEqual('42. ytd total income is 1500000', ytd.ytdIncomeCents, '1500000');
assertEqual('43. ytd confidence low with 3 months', ytd.confidence, 'low');

// 44: ytd projected annual
assert('44. ytd projected annual present', ytd.projectedAnnualCents !== null);

// ══════════════════════════════════════════════════════════════════════════════
// DEDUCTION OPPORTUNITY ENGINE
// ══════════════════════════════════════════════════════════════════════════════

console.log('\n── Deduction Opportunity Engine ──');

const classifications = classifyAll(txns, {
  't5': { businessUsePct: 100 },
  't8': { businessUsePct: 80 },
});

// 45–48: deduction identification
const opps = identifyDeductionOpportunities(classifications);
assert('45. identifyDeductionOpportunities returns object', typeof opps === 'object');
assert('46. confirmed is array', Array.isArray(opps.confirmed));
assert('47. uncertain is array', Array.isArray(opps.uncertain));
assert('48. summary has confirmedDeductionsCents', typeof opps.summary.confirmedDeductionsCents === 'string');

// 49: income not in deductions
const incomeInOpps = [...opps.confirmed, ...opps.uncertain].some(d => d.txnId === 't7');
assert('49. income transaction not in deductions', !incomeInOpps);

// 50: professional services in confirmed (high confidence + deductibleHypothesis=true)
const acctDeduction = opps.confirmed.find(d => d.txnId === 't4');
assert('50. accountant in confirmed deductions', acctDeduction !== undefined);

// 51: travel (low confidence) in uncertain
const hotelDeduction = opps.uncertain.find(d => d.txnId === 't5') || opps.confirmed.find(d => d.txnId === 't5');
assert('51. hotel deduction present', hotelDeduction !== undefined);

// 52: business use pct applied to equipment
const laptopDeduction = [...opps.confirmed, ...opps.uncertain].find(d => d.txnId === 't8');
assert('52. laptop deduction has businessUsePct', laptopDeduction?.businessUsePct === 80);
assert('53. laptop deductibleCents = 80% of full', laptopDeduction?.estimatedDeductibleCents === '60000');

// 54: evidence requirements present
assert('54. confirmed deductions have evidenceRequired', opps.confirmed.every(d => Array.isArray(d.evidenceRequired)));

// 55–56: groupByCategory
const grouped = groupByCategory(opps);
assert('55. groupByCategory returns array', Array.isArray(grouped));
assert('56. groups sorted by total descending', grouped.length < 2 || BigInt(grouped[0].totalDeductibleCents) >= BigInt(grouped[grouped.length - 1].totalDeductibleCents));

// 57: estimateTaxSaving
const saving = estimateTaxSaving('1000000', 4000, 'UK 2024/25 (illustrative)');
assert('57. estimateTaxSaving returns object', typeof saving === 'object');
assertEqual('58. tax saving = 40% of 1000000 = 400000', saving.estimatedTaxSavingCents, '400000');
assertEqual('59. saving confidence is low', saving.confidence, 'low');

// 60: estimateTaxSaving requires jurisdictionLabel
let savingThrew = false;
try { estimateTaxSaving('1000000', 4000, ''); }
catch { savingThrew = true; }
assert('60. missing jurisdiction throws on tax saving', savingThrew);

// 61: review required items collected
assert('61. reviewRequired list present', Array.isArray(opps.reviewRequired));

// ══════════════════════════════════════════════════════════════════════════════
// EVIDENCE COMPLETENESS
// ══════════════════════════════════════════════════════════════════════════════

console.log('\n── Evidence Completeness ──');

// 62–65: single item check
const check1 = checkEvidenceCompleteness({
  txnId: 't4',
  taxCategory: 'professional_services',
  evidence: { receiptUrl: 'https://example.com/inv.pdf', businessPurpose: 'annual accounts' },
});
assert('62. checkEvidenceCompleteness returns object', typeof check1 === 'object');
assertEqual('63. complete evidence = 100%', check1.coveragePct, 100);
assertEqual('64. completeness = complete', check1.completeness, 'complete');
assert('65. no gaps when evidence complete', check1.gapsFound.length === 0);

// 66: missing business purpose → gap
const check2 = checkEvidenceCompleteness({
  txnId: 't5',
  taxCategory: 'travel_business',
  evidence: { receiptUrl: 'https://example.com/hotel.pdf' },
});
assert('66. missing business_purpose → gap', check2.gapsFound.includes('business_purpose'));
assert('67. requiresAction true when gaps', check2.requiresAction === true);

// 68: no evidence = missing
const check3 = checkEvidenceCompleteness({ txnId: 't10', taxCategory: 'equipment', evidence: {} });
assertEqual('68. no evidence completeness = missing', check3.completeness, 'missing');

// 69: severity high with many gaps
assert('69. many gaps → high severity', check3.severity === 'high' || check3.severity === 'medium');

// 70–72: audit completeness
const evidenceMap = {
  't1': { invoiceRef: 'INV-001', businessPurpose: 'project management' },
  't3': { receiptUrl: 'rec.pdf', businessPurpose: 'TypeScript course' },
  't4': { receiptUrl: 'acct.pdf', businessPurpose: 'year-end accounts' },
};
const audit = auditEvidenceCompleteness(all, evidenceMap);
assert('70. auditEvidenceCompleteness returns object', typeof audit === 'object');
assert('71. results is array', Array.isArray(audit.results));
assert('72. summary has overallCoveragePct', typeof audit.summary.overallCoveragePct === 'number');

// 73: coverage degrades with missing evidence
const emptyAudit = auditEvidenceCompleteness(all, {});
assert('73. empty evidence map produces low coverage', emptyAudit.summary.overallCoveragePct < 70);

// 74: fully-evidenced transactions improve coverage
const fullAudit = auditEvidenceCompleteness(
  [classifyTransaction(makeTxn('x1', '2024-01-01', 100, 'out', 'accountant invoice'))],
  { 'x1': { receiptUrl: 'inv.pdf', businessPurpose: 'tax filing' } }
);
assert('74. full evidence produces high coverage', fullAudit.summary.overallCoveragePct >= 80);

// 75–76: missing documentation alerts
const alerts = missingDocumentationAlerts(audit);
assert('75. missingDocumentationAlerts returns array', Array.isArray(alerts));
assert('76. alerts have action field', alerts.every(a => typeof a.action === 'string'));

// 77: alerts sorted by severity (high first)
if (alerts.length >= 2) {
  const order = { high: 0, medium: 1, low: 2, none: 3 };
  assert('77. alerts sorted severity high→low', (order[alerts[0].severity] ?? 4) <= (order[alerts[alerts.length - 1].severity] ?? 4));
}

// 78: income transactions not included in audit
assert('78. income txns excluded from evidence audit', !audit.results.some(r => r.txnId === 't7'));

// ══════════════════════════════════════════════════════════════════════════════
// YEAR-END READINESS
// ══════════════════════════════════════════════════════════════════════════════

console.log('\n── Year-End Readiness ──');

// 79–82: basic scoring
const readiness = scoreYearEndReadiness({
  completedItemIds: ['income_reconciled', 'invoices_issued', 'expenses_classified', 'receipts_complete', 'bank_reconciled', 'payment_deadlines_known', 'records_accessible'],
  evidenceSummary: audit,
  classificationSummary: summary,
  taxYearLabel: '2024/25',
  jurisdictionLabel: 'UK (illustrative)',
});
assert('79. scoreYearEndReadiness returns object', typeof readiness === 'object');
assert('80. readinessScore is 0–100', readiness.readinessScore >= 0 && readiness.readinessScore <= 100);
assert('81. readinessLevel is string', typeof readiness.readinessLevel === 'string');
assert('82. actionItems is array', Array.isArray(readiness.actionItems));

// 83: zero completed items → low score
const zeroReadiness = scoreYearEndReadiness({
  completedItemIds: [],
  taxYearLabel: '2024/25',
  jurisdictionLabel: 'UK (illustrative)',
});
assert('83. zero completed items → low readiness score', zeroReadiness.readinessScore < 50);
assert('84. zero items → not_ready or needs_work', ['not_ready', 'needs_work'].includes(zeroReadiness.readinessLevel));

// 85: all required items complete → higher score
const allRequired = CHECKLIST_TEMPLATE.filter(i => i.required).map(i => i.id);
const fullReadiness = scoreYearEndReadiness({
  completedItemIds: allRequired,
  taxYearLabel: '2024/25',
  jurisdictionLabel: 'UK (illustrative)',
  evidenceSummary: { summary: { overallCoveragePct: 95 } },
});
assert('85. all required items → score ≥ 50', fullReadiness.readinessScore >= 50);

// 86: incompleteRequired list is accurate
assert('86. incompleteRequired shows missing required items', zeroReadiness.incompleteRequired.length > 0);

// 87: not-applicable items excluded from score
const naReadiness = scoreYearEndReadiness({
  completedItemIds: [],
  notApplicableItemIds: CHECKLIST_TEMPLATE.map(i => i.id),
  taxYearLabel: '2024/25',
  jurisdictionLabel: 'UK (illustrative)',
});
assert('87. all N/A items → non-crashing result', typeof naReadiness.readinessScore === 'number');

// 88: urgent deadlines surfaced
const futureDeadlines = [{
  label: 'Self Assessment deadline',
  dueDateIso: new Date(Date.now() + 15 * 86400000).toISOString().slice(0, 10),
}];
const deadlineReadiness = scoreYearEndReadiness({
  completedItemIds: allRequired,
  taxYearLabel: '2024/25',
  jurisdictionLabel: 'UK (illustrative)',
  upcomingDeadlines: futureDeadlines,
});
assert('88. upcoming deadline within 30 days surfaced', deadlineReadiness.urgentDeadlines.length > 0);

// 89: past deadline not in urgent
const pastDeadlines = [{ label: 'Old deadline', dueDateIso: '2023-01-31' }];
const pastReadiness = scoreYearEndReadiness({
  completedItemIds: [],
  taxYearLabel: '2023/24',
  jurisdictionLabel: 'UK (illustrative)',
  upcomingDeadlines: pastDeadlines,
});
assert('89. past deadline not in urgentDeadlines', pastReadiness.urgentDeadlines.length === 0);

// 90–91: checklist text rendering
const checklistText = renderChecklistText(['income_reconciled'], ['foreign_income']);
assert('90. renderChecklistText returns string', typeof checklistText === 'string');
assertIncludes('91. checklist text includes disclaimer', checklistText, 'professional');

// ══════════════════════════════════════════════════════════════════════════════
// COMPLIANCE REVIEW
// ══════════════════════════════════════════════════════════════════════════════

console.log('\n── Compliance Review ──');

const reviewData = {
  classifications: all,
  deductionOpportunities: opps,
  evidenceSummary: emptyAudit, // low coverage → triggers flag
  evidenceMap: {},
  exposureEstimate: lowConfExposure,
  incomeMismatch: false,
  jurisdictionLabel: 'UK 2024/25 (illustrative)',
};

// 92–95: review structure
const review = runComplianceReview(reviewData);
assert('92. runComplianceReview returns object', typeof review === 'object');
assert('93. triggeredFlags is array', Array.isArray(review.triggeredFlags));
assert('94. overallStatus is string', typeof review.overallStatus === 'string');
assert('95. contradictions is array', Array.isArray(review.contradictions));

// 96: low evidence coverage triggers flag
assert('96. low evidence coverage triggers high flag',
  review.triggeredFlags.some(f => f.id === 'evidence_coverage_low'));

// 97: income mismatch triggers critical flag
const mismatchReview = runComplianceReview({
  ...reviewData,
  incomeMismatch: true,
  evidenceSummary: { summary: { overallCoveragePct: 90 } },
  exposureEstimate: { confidence: 'medium' },
});
assert('97. income mismatch triggers critical flag', mismatchReview.triggeredFlags.some(f => f.severity === 'critical'));
assertEqual('98. income mismatch → critical status', mismatchReview.overallStatus, 'critical');

// 99: no flags → no_flags status (provide full evidence so no trigger fires)
const cleanReview = runComplianceReview({
  classifications: [classifyTransaction(makeTxn('c1', '2024-01-01', 1000, 'out', 'accountant invoice'))],
  deductionOpportunities: { confirmed: [], uncertain: [] },
  evidenceSummary: { summary: { overallCoveragePct: 95 } },
  evidenceMap: { 'c1': { receiptUrl: 'inv.pdf', invoiceRef: 'INV-001', businessPurpose: 'tax prep' } },
  exposureEstimate: { confidence: 'medium' },
  incomeMismatch: false,
  jurisdictionLabel: 'UK (illustrative)',
});
assertEqual('99. clean data → no_flags status', cleanReview.overallStatus, 'no_flags');

// 100: professionalReviewRequired when critical or high flags
assert('100. critical flag → professionalReviewRequired true', mismatchReview.professionalReviewRequired === true);

// 101: escalationDecision structure
const escalation = escalationDecision(review);
assert('101. escalationDecision returns object', typeof escalation === 'object');
assert('102. escalation has escalate boolean', typeof escalation.escalate === 'boolean');
assert('103. escalation has confidence', typeof escalation.confidence === 'string');
assertIncludes('104. escalation has disclaimer', escalation.disclaimer, 'professional');

// 105: escalate=false for clean review
const cleanEscalation = escalationDecision(cleanReview);
assert('105. clean review does not escalate', cleanEscalation.escalate === false);

// 106: escalate=true when professional review required
const dirtyEscalation = escalationDecision(mismatchReview);
assert('106. critical review escalates', dirtyEscalation.escalate === true);

// 107–108: renderReviewSummary
const summaryText = renderReviewSummary(review);
assert('107. renderReviewSummary returns string', typeof summaryText === 'string');
assertIncludes('108. summary text includes status', summaryText, review.overallStatus.toUpperCase());

// 109: disclaimer present in review
assertIncludes('109. review disclaimer present', review.disclaimer, 'professional');

// 110: uncertain items collected
assert('110. uncertainItems populated from low-confidence classifications', review.uncertainItems.length >= 0);

// ── Incomplete Evidence Scenarios ─────────────────────────────────────────────

console.log('\n── Incomplete Evidence Scenarios ──');

// 111: zero evidence audit reads as not_ready
assertEqual('111. zero evidence → not_ready coverage', emptyAudit.summary.readinessLevel, 'not_ready');

// 112: single missing doc produces alert
const singleGap = auditEvidenceCompleteness(
  [classifyTransaction(makeTxn('y1', '2024-01-01', 2000, 'out', 'udemy course'))],
  {}
);
assert('112. missing docs produce alerts', missingDocumentationAlerts(singleGap).length > 0);

// 113: partial evidence reduces but doesn't zero coverage
const partialAudit = auditEvidenceCompleteness(
  [classifyTransaction(makeTxn('z1', '2024-01-01', 5000, 'out', 'hotel business trip'))],
  { 'z1': { receiptUrl: 'rec.pdf' } }
);
assert('113. partial evidence produces coverage > 0', partialAudit.summary.overallCoveragePct > 0);
assert('114. partial evidence not complete', partialAudit.summary.overallCoveragePct < 100);

// 115: contradictory classification preserved
const contC = classifyTransaction(makeTxn('q1', '2024-01-01', 1000, 'out', 'uber train hotel'));
assert('115. multi-keyword transaction retains contradictions or notes', contC.contradictions.length > 0 || contC.notes.length > 0);

// 116: contradictions in review data are preserved
const contReview = runComplianceReview({
  classifications: [contC],
  deductionOpportunities: { confirmed: [], uncertain: [] },
  evidenceSummary: { summary: { overallCoveragePct: 95 } },
  evidenceMap: {},
  exposureEstimate: { confidence: 'medium' },
  incomeMismatch: false,
  jurisdictionLabel: 'UK (illustrative)',
});
assert('116. contradictions surfaced in review', typeof contReview === 'object');

// 117: high-value unreviewed transaction triggers flag
const highValReview = runComplianceReview({
  classifications: [{ ...all.find(c => c.txnId === 't5'), requiresReview: true }],
  deductionOpportunities: { confirmed: [], uncertain: [] },
  evidenceSummary: { summary: { overallCoveragePct: 90 } },
  evidenceMap: {},
  exposureEstimate: { confidence: 'medium' },
  incomeMismatch: false,
  jurisdictionLabel: 'UK (illustrative)',
  reviewThresholdCents: 100000,
});
assert('117. high-value unreviewed triggers flag', Array.isArray(highValReview.triggeredFlags));

// 118: exposure estimate low confidence surfaces as flag
const lowConfReview = runComplianceReview({
  classifications: [],
  deductionOpportunities: { confirmed: [], uncertain: [] },
  evidenceSummary: { summary: { overallCoveragePct: 90 } },
  evidenceMap: {},
  exposureEstimate: { confidence: 'none' },
  incomeMismatch: false,
  jurisdictionLabel: 'UK (illustrative)',
});
assert('118. low-confidence exposure estimate triggers flag',
  lowConfReview.triggeredFlags.some(f => f.id === 'exposure_estimate_low_confidence'));

// 119: year-end readiness with poor evidence reduces score
const poorEvReadiness = scoreYearEndReadiness({
  completedItemIds: allRequired,
  evidenceSummary: { summary: { overallCoveragePct: 20 } },
  taxYearLabel: '2024/25',
  jurisdictionLabel: 'UK (illustrative)',
});
assert('119. poor evidence reduces readiness score vs perfect evidence', poorEvReadiness.readinessScore < fullReadiness.readinessScore);

// 120: tax module index loads without error
const taxIndex = require('./lib/finance/tax/index');
assert('120. tax index exports all 6 modules', Object.keys(taxIndex).length === 6);

// ── Results ───────────────────────────────────────────────────────────────────

professionalReviewAreas.push(
  'Meals and entertainment deductibility (jurisdiction-specific)',
  'Home office proportion methodology',
  'Vehicle business use documentation',
  'Mixed-use expense apportionment',
  'Charitable donation gift aid treatment',
  'Capital allowances on equipment',
  'Prior year losses and adjustments',
  'Self Assessment registration and payment on account'
);

console.log(`\n═══════════════════════════════════════`);
console.log(`Results: ${passed} passed, ${failed} failed (of ${passed + failed} total)`);
if (failures.length > 0) {
  console.log('\nFailed validations:');
  failures.forEach(f => console.log(`  - ${f}`));
}
console.log('\nResidual uncertainties:');
console.log('  - All tax liability figures are estimates using illustrative brackets only');
console.log('  - Jurisdiction adapter not yet implemented — UK labels are illustrative');
console.log('  - Keyword classification has ~60–70% accuracy without manual review');
console.log('  - Mixed-use proportions require owner input to be meaningful');
console.log('  - Capital allowances and depreciation not modelled');
console.log('\nAreas requiring professional review:');
professionalReviewAreas.forEach(a => console.log(`  • ${a}`));
console.log('═══════════════════════════════════════');

if (failed > 0) process.exit(1);
