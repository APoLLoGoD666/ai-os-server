'use strict';

/**
 * Year-End Readiness
 * Generates preparation checklists and a readiness score for tax year close.
 *
 * INFORMATIONAL ONLY — not legal or tax advice.
 * Readiness score reflects observable preparation state, not compliance certainty.
 */

const DISCLAIMER = 'Readiness score is based on observable data only. Actual compliance requirements must be confirmed with a qualified tax professional.';

/**
 * Standard preparation checklist items grouped by area.
 * Each item has: id, label, area, required (always needed vs conditional), weight
 */
const CHECKLIST_TEMPLATE = [
  // Income documentation
  { id: 'income_reconciled', label: 'All income sources reconciled and categorised', area: 'income', required: true, weight: 15 },
  { id: 'invoices_issued', label: 'All issued invoices accounted for', area: 'income', required: true, weight: 10 },
  { id: 'foreign_income', label: 'Foreign income identified and reported (if applicable)', area: 'income', required: false, weight: 5 },

  // Expenses
  { id: 'expenses_classified', label: 'Business expenses classified by tax category', area: 'expenses', required: true, weight: 15 },
  { id: 'receipts_complete', label: 'Receipts or invoices present for all claimed deductions', area: 'expenses', required: true, weight: 15 },
  { id: 'mixed_use_apportioned', label: 'Mixed-use expenses apportioned with documented rationale', area: 'expenses', required: false, weight: 8 },
  { id: 'home_office_calculated', label: 'Home office claim calculated (if applicable)', area: 'expenses', required: false, weight: 5 },
  { id: 'vehicle_records', label: 'Vehicle mileage or cost records complete (if applicable)', area: 'expenses', required: false, weight: 5 },

  // Banking and reconciliation
  { id: 'bank_reconciled', label: 'Bank accounts reconciled against bookkeeping records', area: 'banking', required: true, weight: 10 },
  { id: 'unreconciled_items', label: 'Unreconciled items investigated and resolved', area: 'banking', required: true, weight: 5 },

  // Tax-specific
  { id: 'prior_year_adjustments', label: 'Prior year adjustments reviewed', area: 'tax', required: false, weight: 3 },
  { id: 'sa_register', label: 'Self Assessment registration confirmed (if applicable)', area: 'tax', required: false, weight: 5 },
  { id: 'payment_deadlines_known', label: 'Payment on account deadlines noted', area: 'tax', required: true, weight: 5 },
  { id: 'losses_carried', label: 'Any losses from prior years tracked', area: 'tax', required: false, weight: 3 },

  // Professional
  { id: 'accountant_briefed', label: 'Accountant or tax advisor briefed with current figures', area: 'professional', required: false, weight: 5 },
  { id: 'records_accessible', label: 'All records accessible and organised for handover', area: 'professional', required: true, weight: 6 },
];

/**
 * Score year-end readiness given the completed items and context.
 *
 * @param {Object} params
 * @param {string[]} params.completedItemIds - checklist item ids confirmed complete
 * @param {Object} params.evidenceSummary - from evidence-completeness auditEvidenceCompleteness()
 * @param {Object} params.classificationSummary - from expense-classifier classificationSummary()
 * @param {string} params.taxYearLabel - e.g. '2024/25'
 * @param {string} params.jurisdictionLabel - explicit
 * @param {Object[]} params.upcomingDeadlines - [{label, dueDateIso}]
 * @param {string[]} params.notApplicableItemIds - items to exclude from scoring
 * @returns {Object}
 */
function scoreYearEndReadiness({
  completedItemIds = [],
  evidenceSummary = {},
  classificationSummary = {},
  taxYearLabel,
  jurisdictionLabel,
  upcomingDeadlines = [],
  notApplicableItemIds = [],
}) {
  if (!jurisdictionLabel) throw new Error('jurisdictionLabel required');

  const completed = new Set(completedItemIds);
  const notApplicable = new Set(notApplicableItemIds);

  const activeItems = CHECKLIST_TEMPLATE.filter(item => !notApplicable.has(item.id));
  const requiredItems = activeItems.filter(item => item.required);
  const optionalItems = activeItems.filter(item => !item.required);

  const totalWeight = activeItems.reduce((a, i) => a + i.weight, 0);
  const completedWeight = activeItems
    .filter(i => completed.has(i.id))
    .reduce((a, i) => a + i.weight, 0);

  const baseScore = totalWeight > 0
    ? Math.round((completedWeight / totalWeight) * 100)
    : 0;

  // Incorporate evidence coverage
  const evidencePct = evidenceSummary?.summary?.overallCoveragePct ?? null;
  const evidenceAdjustment = evidencePct !== null
    ? Math.round((evidencePct - 75) / 10) // mild adjustment
    : -10; // penalise unknown evidence state

  // Incorporate classification completeness
  const reviewPenalty = classificationSummary?.transactionsRequiringReview > 5 ? -5 : 0;

  const adjustedScore = Math.max(0, Math.min(100, baseScore + evidenceAdjustment + reviewPenalty));

  const readinessLevel = adjustedScore >= 85 ? 'ready'
    : adjustedScore >= 65 ? 'mostly_ready'
    : adjustedScore >= 40 ? 'needs_work'
    : 'not_ready';

  const incompleteRequired = requiredItems.filter(i => !completed.has(i.id));
  const incompleteOptional = optionalItems.filter(i => !completed.has(i.id));

  // Deadline proximity
  const today = new Date();
  const urgentDeadlines = upcomingDeadlines.filter(d => {
    const daysUntil = Math.round((new Date(d.dueDateIso) - today) / 86400000);
    return daysUntil >= 0 && daysUntil <= 30;
  });

  return {
    taxYearLabel,
    jurisdictionLabel,
    readinessScore: adjustedScore,
    readinessLevel,
    baseScore,
    evidencePct: evidencePct ?? 'unknown',
    incompleteRequired: incompleteRequired.map(i => ({ id: i.id, label: i.label, area: i.area })),
    incompleteOptional: incompleteOptional.map(i => ({ id: i.id, label: i.label, area: i.area })),
    urgentDeadlines,
    actionItems: [
      ...incompleteRequired.map(i => ({ priority: 'high', action: i.label, area: i.area })),
      ...incompleteOptional.map(i => ({ priority: 'low', action: i.label, area: i.area })),
    ],
    confidence: completedItemIds.length > 0 ? 'medium' : 'low',
    disclaimer: DISCLAIMER,
  };
}

/**
 * Generate a plain-text preparation checklist for human use.
 *
 * @param {string[]} completedIds
 * @param {string[]} notApplicableIds
 * @returns {string}
 */
function renderChecklistText(completedIds = [], notApplicableIds = []) {
  const completed = new Set(completedIds);
  const na = new Set(notApplicableIds);
  const lines = ['Tax Year-End Preparation Checklist', ''];

  const areas = [...new Set(CHECKLIST_TEMPLATE.map(i => i.area))];
  for (const area of areas) {
    lines.push(`[${area.toUpperCase()}]`);
    for (const item of CHECKLIST_TEMPLATE.filter(i => i.area === area)) {
      if (na.has(item.id)) {
        lines.push(`  [N/A] ${item.label}`);
      } else if (completed.has(item.id)) {
        lines.push(`  [✓]   ${item.label}`);
      } else {
        lines.push(`  [ ]   ${item.label}${item.required ? ' *' : ''}`);
      }
    }
    lines.push('');
  }
  lines.push('* Required items');
  lines.push('');
  lines.push(DISCLAIMER);
  return lines.join('\n');
}

module.exports = {
  scoreYearEndReadiness,
  renderChecklistText,
  CHECKLIST_TEMPLATE,
  DISCLAIMER,
};
