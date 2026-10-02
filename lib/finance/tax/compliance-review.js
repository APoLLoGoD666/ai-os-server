'use strict';

/**
 * Compliance Review
 * Identifies items requiring professional review, escalation triggers, and contradictions.
 *
 * INFORMATIONAL ONLY — not legal or tax advice.
 * This module surfaces signals, not determinations.
 * Human review must remain available at all times.
 */

const DISCLAIMER = 'Review flags are signals for preparation, not compliance determinations. Engage a qualified tax professional for definitive advice.';

const SEVERITY = { critical: 0, high: 1, medium: 2, low: 3, info: 4 };

/**
 * Review triggers: conditions that warrant professional review.
 * Each trigger: {id, label, severity, check: (data) => true|false}
 */
const REVIEW_TRIGGERS = [
  {
    id: 'high_value_uncategorised',
    label: 'High-value transactions are uncategorised',
    severity: 'high',
    check: ({ classifications, thresholdCents = 50000 }) =>
      classifications?.some(c => c.taxCategory === 'uncategorised' && BigInt(c.amountCents ?? 0) >= BigInt(thresholdCents)),
  },
  {
    id: 'mixed_use_unresolved',
    label: 'Mixed-use expenses with no business proportion recorded',
    severity: 'medium',
    check: ({ classifications }) =>
      classifications?.some(c => c.taxCategory === 'mixed_use' && c.businessUsePct == null),
  },
  {
    id: 'meals_entertainment_claimed',
    label: 'Meals/entertainment deductions claimed — jurisdiction-specific rules apply',
    severity: 'medium',
    check: ({ deductionOpportunities }) =>
      deductionOpportunities?.confirmed?.some(d => d.taxCategory === 'meals_entertainment') ||
      deductionOpportunities?.uncertain?.some(d => d.taxCategory === 'meals_entertainment'),
  },
  {
    id: 'home_office_no_proportion',
    label: 'Home office expense present but no proportion documented',
    severity: 'medium',
    check: ({ classifications }) =>
      classifications?.some(c => c.taxCategory === 'home_office' && c.businessUsePct == null),
  },
  {
    id: 'evidence_coverage_low',
    label: 'Overall evidence coverage is below 70%',
    severity: 'high',
    check: ({ evidenceSummary }) =>
      (evidenceSummary?.summary?.overallCoveragePct ?? 100) < 70,
  },
  {
    id: 'contradictory_classifications',
    label: 'Transactions with contradictory tax category signals',
    severity: 'medium',
    check: ({ classifications }) =>
      classifications?.some(c => c.contradictions?.length > 0),
  },
  {
    id: 'income_not_reconciled',
    label: 'Total income in tax records does not match classified income',
    severity: 'critical',
    check: ({ incomeMismatch }) => incomeMismatch === true,
  },
  {
    id: 'vehicle_no_mileage_log',
    label: 'Vehicle expenses claimed with no mileage log',
    severity: 'high',
    check: ({ classifications, evidenceMap = {} }) =>
      classifications?.some(c =>
        c.taxCategory === 'vehicle_business' &&
        !evidenceMap[c.txnId]?.mileageLogged
      ),
  },
  {
    id: 'charitable_no_receipt',
    label: 'Charitable donations with no receipt or charity reference',
    severity: 'medium',
    check: ({ classifications, evidenceMap = {} }) =>
      classifications?.some(c =>
        c.taxCategory === 'charitable' &&
        !evidenceMap[c.txnId]?.receiptUrl &&
        !evidenceMap[c.txnId]?.invoiceRef
      ),
  },
  {
    id: 'exposure_estimate_low_confidence',
    label: 'Tax exposure estimate has low or no confidence due to missing data',
    severity: 'high',
    check: ({ exposureEstimate }) =>
      exposureEstimate?.confidence === 'low' || exposureEstimate?.confidence === 'none',
  },
  {
    id: 'high_value_transactions_unreviewed',
    label: 'High-value individual transactions have not been manually reviewed',
    severity: 'medium',
    check: ({ classifications, reviewThresholdCents = 100000 }) =>
      classifications?.some(c =>
        BigInt(c.amountCents ?? 0) >= BigInt(reviewThresholdCents) &&
        c.requiresReview
      ),
  },
  {
    id: 'professional_services_no_invoice',
    label: 'Professional services claimed with no invoice',
    severity: 'medium',
    check: ({ classifications, evidenceMap = {} }) =>
      classifications?.some(c =>
        c.taxCategory === 'professional_services' &&
        !evidenceMap[c.txnId]?.receiptUrl &&
        !evidenceMap[c.txnId]?.invoiceRef
      ),
  },
];

/**
 * Run compliance review across all available data.
 *
 * @param {Object} data
 * @param {Object[]} data.classifications - from expense-classifier
 * @param {Object} data.deductionOpportunities - from deduction-opportunity-engine
 * @param {Object} data.evidenceSummary - from evidence-completeness
 * @param {Object} data.evidenceMap - txnId → EvidenceRecord
 * @param {Object} data.exposureEstimate - from tax-exposure-engine
 * @param {boolean} data.incomeMismatch - flag from caller if income doesn't reconcile
 * @param {number} data.thresholdCents - high-value threshold (default 50000)
 * @param {string} data.jurisdictionLabel - required
 * @returns {Object}
 */
function runComplianceReview(data) {
  if (!data.jurisdictionLabel) throw new Error('jurisdictionLabel required');

  const triggered = [];
  const notTriggered = [];

  for (const trigger of REVIEW_TRIGGERS) {
    const fired = (() => {
      try { return trigger.check(data); }
      catch { return false; }
    })();

    if (fired) {
      triggered.push({ id: trigger.id, label: trigger.label, severity: trigger.severity });
    } else {
      notTriggered.push({ id: trigger.id, label: trigger.label });
    }
  }

  triggered.sort((a, b) => (SEVERITY[a.severity] ?? 99) - (SEVERITY[b.severity] ?? 99));

  const criticalCount = triggered.filter(t => t.severity === 'critical').length;
  const highCount = triggered.filter(t => t.severity === 'high').length;

  const overallStatus = criticalCount > 0 ? 'critical'
    : highCount > 0 ? 'needs_attention'
    : triggered.length > 0 ? 'review_recommended'
    : 'no_flags';

  return {
    jurisdictionLabel: data.jurisdictionLabel,
    overallStatus,
    triggeredFlags: triggered,
    flagCount: triggered.length,
    criticalCount,
    highCount,
    professionalReviewRequired: criticalCount > 0 || highCount > 0,
    contradictions: _collectContradictions(data.classifications ?? []),
    uncertainItems: _collectUncertainItems(data.classifications ?? []),
    disclaimer: DISCLAIMER,
  };
}

function _collectContradictions(classifications) {
  return classifications
    .filter(c => c.contradictions?.length > 0)
    .map(c => ({
      txnId: c.txnId,
      date: c.date,
      amountCents: c.amountCents,
      contradictions: c.contradictions,
    }));
}

function _collectUncertainItems(classifications) {
  return classifications
    .filter(c => c.confidence === 'low' || c.confidence === 'none')
    .map(c => ({
      txnId: c.txnId,
      date: c.date,
      amountCents: c.amountCents,
      taxCategory: c.taxCategory,
      confidence: c.confidence,
      notes: c.notes,
    }));
}

/**
 * Generate a human-readable review summary.
 *
 * @param {Object} reviewResult - output of runComplianceReview()
 * @returns {string}
 */
function renderReviewSummary(reviewResult) {
  const lines = [
    `Compliance Review — ${reviewResult.jurisdictionLabel}`,
    `Status: ${reviewResult.overallStatus.toUpperCase()}`,
    '',
  ];

  if (reviewResult.triggeredFlags.length === 0) {
    lines.push('No review flags triggered.');
  } else {
    lines.push(`Flags triggered: ${reviewResult.flagCount}`);
    for (const f of reviewResult.triggeredFlags) {
      lines.push(`  [${f.severity.toUpperCase()}] ${f.label}`);
    }
  }

  if (reviewResult.contradictions.length > 0) {
    lines.push('');
    lines.push(`Contradictory classifications: ${reviewResult.contradictions.length} transaction(s)`);
  }

  if (reviewResult.professionalReviewRequired) {
    lines.push('');
    lines.push('⚠ Professional review is recommended before filing.');
  }

  lines.push('');
  lines.push(DISCLAIMER);
  return lines.join('\n');
}

/**
 * Escalation decision: should this be escalated to a professional?
 *
 * @param {Object} reviewResult
 * @returns {Object}
 */
function escalationDecision(reviewResult) {
  const escalate = reviewResult.professionalReviewRequired ||
    reviewResult.overallStatus === 'critical';

  return {
    escalate,
    reason: escalate
      ? `${reviewResult.criticalCount} critical and ${reviewResult.highCount} high-severity flags detected`
      : 'No critical or high-severity flags — standard preparation may suffice',
    confidence: 'low',
    note: 'Escalation assessment is informational only. The decision to engage a professional rests with the user.',
    disclaimer: DISCLAIMER,
  };
}

module.exports = {
  runComplianceReview,
  renderReviewSummary,
  escalationDecision,
  REVIEW_TRIGGERS,
};
