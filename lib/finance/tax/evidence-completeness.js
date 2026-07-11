'use strict';

/**
 * Evidence Completeness
 * Detects gaps in supporting documentation for tax-relevant transactions.
 *
 * INFORMATIONAL ONLY — not legal or tax advice.
 * Missing evidence does not confirm a problem, but it must be flagged.
 * Coverage scoring degrades with gaps — cannot improve through missing data.
 */

/**
 * @typedef {Object} EvidenceRecord
 * @property {string} txnId
 * @property {string} [receiptUrl]
 * @property {string} [invoiceRef]
 * @property {string} [businessPurpose]
 * @property {string} [attendees]
 * @property {number} [businessUsePct]
 * @property {boolean} [mileageLogged]
 * @property {string[]} [additionalDocs]
 */

const REQUIRED_EVIDENCE = {
  business_expense: ['receipt_or_invoice', 'business_purpose'],
  home_office: ['proportion_calculation', 'floor_plan_or_measurement'],
  travel_business: ['receipt', 'business_purpose', 'destination'],
  vehicle_business: ['mileage_log_or_cost_records', 'business_use_pct'],
  professional_development: ['receipt', 'relevance_to_trade'],
  software_subscriptions: ['invoice_or_confirmation', 'business_use_statement'],
  equipment: ['receipt', 'business_use_pct'],
  marketing: ['invoice', 'campaign_purpose'],
  professional_services: ['invoice', 'scope_of_work'],
  meals_entertainment: ['receipt', 'attendees', 'business_purpose'],
  healthcare: ['receipt'],
  charitable: ['donation_receipt', 'charity_reference'],
  investment_related: ['brokerage_statement'],
  mixed_use: ['business_proportion', 'personal_portion_records'],
};

/**
 * Check an evidence record against requirements for its tax category.
 *
 * @param {Object} params
 * @param {string} params.txnId
 * @param {string} params.taxCategory
 * @param {EvidenceRecord} params.evidence
 * @returns {Object}
 */
function checkEvidenceCompleteness({ txnId, taxCategory, evidence = {} }) {
  const required = REQUIRED_EVIDENCE[taxCategory] ?? [];
  const gaps = [];
  const present = [];

  for (const req of required) {
    if (_evidenceCoversRequirement(req, evidence)) {
      present.push(req);
    } else {
      gaps.push(req);
    }
  }

  const coveragePct = required.length > 0
    ? Math.round((present.length / required.length) * 100)
    : 100;

  const completeness = coveragePct === 100 ? 'complete'
    : coveragePct >= 75 ? 'mostly_complete'
    : coveragePct >= 50 ? 'partial'
    : coveragePct > 0 ? 'mostly_incomplete'
    : 'missing';

  return {
    txnId,
    taxCategory,
    completeness,
    coveragePct,
    gapsFound: gaps,
    evidencePresent: present,
    requiresAction: gaps.length > 0,
    severity: gaps.length === 0 ? 'none'
      : gaps.length <= 1 ? 'low'
      : gaps.length <= 2 ? 'medium'
      : 'high',
  };
}

function _evidenceCoversRequirement(req, evidence) {
  switch (req) {
    case 'receipt_or_invoice':
    case 'receipt':
    case 'invoice':
    case 'invoice_or_confirmation':
    case 'donation_receipt':
    case 'brokerage_statement':
      return !!(evidence.receiptUrl || evidence.invoiceRef || evidence.additionalDocs?.length > 0);
    case 'business_purpose':
    case 'campaign_purpose':
    case 'scope_of_work':
    case 'relevance_to_trade':
    case 'business_use_statement':
      return !!evidence.businessPurpose;
    case 'business_use_pct':
      return typeof evidence.businessUsePct === 'number';
    case 'business_proportion':
      return typeof evidence.businessUsePct === 'number';
    case 'mileage_log_or_cost_records':
      return evidence.mileageLogged === true || !!(evidence.receiptUrl || evidence.additionalDocs?.length > 0);
    case 'attendees':
      return !!(evidence.attendees && evidence.attendees.length > 0);
    case 'destination':
      return !!evidence.businessPurpose; // purpose field covers destination
    case 'proportion_calculation':
    case 'floor_plan_or_measurement':
      return typeof evidence.businessUsePct === 'number';
    case 'personal_portion_records':
      return typeof evidence.businessUsePct === 'number';
    case 'charity_reference':
      return !!(evidence.invoiceRef || evidence.additionalDocs?.length > 0);
    default:
      return !!(evidence.additionalDocs?.some(d => d.toLowerCase().includes(req)));
  }
}

/**
 * Run completeness checks across all transactions.
 *
 * @param {Object[]} classifications - from expense-classifier
 * @param {Object} evidenceMap - {txnId: EvidenceRecord}
 * @returns {Object}
 */
function auditEvidenceCompleteness(classifications, evidenceMap = {}) {
  const results = [];

  for (const c of classifications) {
    if (!c.taxCategory || c.taxCategory === 'personal' || c.direction === 'in') continue;
    const result = checkEvidenceCompleteness({
      txnId: c.txnId,
      taxCategory: c.taxCategory,
      evidence: evidenceMap[c.txnId] ?? {},
    });
    results.push(result);
  }

  const missing = results.filter(r => r.completeness === 'missing').length;
  const partial = results.filter(r => r.completeness === 'partial' || r.completeness === 'mostly_incomplete').length;
  const complete = results.filter(r => r.completeness === 'complete').length;
  const total = results.length;

  const overallCoveragePct = total > 0
    ? Math.round(results.reduce((a, r) => a + r.coveragePct, 0) / total)
    : 100;

  return {
    results,
    summary: {
      total,
      complete,
      partial,
      missing,
      overallCoveragePct,
      readinessLevel: overallCoveragePct >= 90 ? 'ready'
        : overallCoveragePct >= 70 ? 'mostly_ready'
        : overallCoveragePct >= 40 ? 'needs_work'
        : 'not_ready',
    },
    highPriorityGaps: results
      .filter(r => r.severity === 'high')
      .map(r => ({ txnId: r.txnId, taxCategory: r.taxCategory, gaps: r.gapsFound })),
    disclaimer: 'Evidence completeness is assessed against common documentation requirements. Professional advice may identify additional requirements.',
  };
}

/**
 * Generate a missing documentation alert list sorted by severity.
 *
 * @param {Object} auditResult - output of auditEvidenceCompleteness()
 * @returns {Object[]}
 */
function missingDocumentationAlerts(auditResult) {
  return auditResult.results
    .filter(r => r.requiresAction)
    .sort((a, b) => {
      const order = { high: 0, medium: 1, low: 2, none: 3 };
      return (order[a.severity] ?? 4) - (order[b.severity] ?? 4);
    })
    .map(r => ({
      txnId: r.txnId,
      taxCategory: r.taxCategory,
      severity: r.severity,
      missingItems: r.gapsFound,
      action: `Locate or obtain: ${r.gapsFound.join(', ')}`,
    }));
}

module.exports = {
  checkEvidenceCompleteness,
  auditEvidenceCompleteness,
  missingDocumentationAlerts,
  REQUIRED_EVIDENCE,
};
