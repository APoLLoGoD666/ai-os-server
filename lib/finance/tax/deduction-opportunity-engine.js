'use strict';

/**
 * Deduction Opportunity Engine
 * Identifies potential deductible expenses from classified transactions.
 *
 * INFORMATIONAL ONLY — not legal or tax advice.
 * Every suggestion is a hypothesis, not a confirmed deduction.
 * Evidence requirements and confidence are explicit per deduction.
 */

const DISCLAIMER = 'Potential deductions are unconfirmed hypotheses. Deductibility must be verified by a qualified tax professional.';

// Evidence requirements per tax category
const EVIDENCE_REQUIREMENTS = {
  business_expense: ['receipt or invoice', 'business purpose recorded'],
  home_office: ['floor plan or room measurement', 'proportion calculation', 'utility bills'],
  travel_business: ['receipt', 'business purpose', 'destination and reason'],
  vehicle_business: ['mileage log or actual cost records', 'business use percentage'],
  professional_development: ['receipt', 'course or event name', 'relevance to trade'],
  software_subscriptions: ['invoice or confirmation email', 'business use statement'],
  equipment: ['receipt', 'business use percentage', 'capital allowance calculation if >threshold'],
  marketing: ['invoice', 'campaign purpose'],
  professional_services: ['invoice', 'scope of work description'],
  meals_entertainment: ['receipt', 'attendees and business purpose', 'jurisdiction-specific rules check'],
  healthcare: ['receipt', 'prescription or referral', 'jurisdiction-specific rules check'],
  charitable: ['donation receipt', 'charity registration number', 'jurisdiction-specific rules check'],
  investment_related: ['brokerage statement', 'jurisdiction-specific rules check'],
  mixed_use: ['business use proportion', 'separate records for personal portion'],
};

/**
 * Identify deduction opportunities from classified transactions.
 *
 * @param {Object[]} classifications - output of expense-classifier classifyAll()
 * @param {Object} [options]
 * @param {boolean} [options.includeUncertain] - include low/none confidence items (default true, flagged separately)
 * @returns {Object}
 */
function identifyDeductionOpportunities(classifications, options = {}) {
  const { includeUncertain = true } = options;

  const confirmed = [];    // deductibleHypothesis === true, confidence >= medium
  const uncertain = [];    // deductibleHypothesis === null or confidence low
  const contraindicated = []; // deductibleHypothesis === false
  const reviewRequired = [];

  for (const c of classifications) {
    if (!c.taxCategory || c.taxCategory === 'personal' || !c.taxCategory) continue;
    if (c.direction === 'in') continue;

    const entry = _buildDeductionEntry(c);

    if (c.deductibleHypothesis === true && (c.confidence === 'high' || c.confidence === 'medium')) {
      confirmed.push(entry);
    } else if (c.deductibleHypothesis === false) {
      contraindicated.push(entry);
    } else {
      uncertain.push({ ...entry, reason: c.notes.join('; ') || 'deductibility unclear' });
    }

    if (c.requiresReview) reviewRequired.push({ txnId: c.txnId, date: c.date, amountCents: c.amountCents, reason: 'requires manual review' });
  }

  const totalConfirmedCents = confirmed.reduce((a, e) => a + BigInt(e.estimatedDeductibleCents), 0n);
  const totalUncertainCents = uncertain.reduce((a, e) => a + BigInt(e.estimatedDeductibleCents), 0n);

  return {
    confirmed,
    uncertain: includeUncertain ? uncertain : [],
    contraindicated,
    reviewRequired,
    summary: {
      confirmedDeductionsCents: totalConfirmedCents.toString(),
      uncertainDeductionsCents: totalUncertainCents.toString(),
      confirmedCount: confirmed.length,
      uncertainCount: uncertain.length,
      contraindicatedCount: contraindicated.length,
      reviewCount: reviewRequired.length,
    },
    disclaimer: DISCLAIMER,
  };
}

function _buildDeductionEntry(c) {
  const businessUsePct = c.businessUsePct ?? 100;
  const fullAmount = BigInt(c.amountCents);
  const deductibleAmount = (fullAmount * BigInt(businessUsePct)) / 100n;

  return {
    txnId: c.txnId,
    date: c.date,
    taxCategory: c.taxCategory,
    fullAmountCents: c.amountCents,
    estimatedDeductibleCents: deductibleAmount.toString(),
    businessUsePct,
    confidence: c.confidence,
    evidenceRequired: EVIDENCE_REQUIREMENTS[c.taxCategory] ?? ['supporting documentation'],
    notes: c.notes,
    contradictions: c.contradictions,
  };
}

/**
 * Group deduction opportunities by category with totals.
 *
 * @param {Object} opportunities - output of identifyDeductionOpportunities()
 * @returns {Object[]}
 */
function groupByCategory(opportunities) {
  const all = [...opportunities.confirmed, ...opportunities.uncertain];
  const groups = {};

  for (const entry of all) {
    const cat = entry.taxCategory;
    if (!groups[cat]) {
      groups[cat] = {
        category: cat,
        totalDeductibleCents: 0n,
        count: 0,
        evidenceRequired: entry.evidenceRequired,
        hasUncertainItems: false,
        hasContradictions: false,
      };
    }
    groups[cat].totalDeductibleCents += BigInt(entry.estimatedDeductibleCents);
    groups[cat].count += 1;
    if (entry.confidence === 'low' || entry.confidence === 'none') groups[cat].hasUncertainItems = true;
    if (entry.contradictions?.length > 0) groups[cat].hasContradictions = true;
  }

  return Object.values(groups)
    .sort((a, b) => (a.totalDeductibleCents > b.totalDeductibleCents ? -1 : 1))
    .map(g => ({
      ...g,
      totalDeductibleCents: g.totalDeductibleCents.toString(),
    }));
}

/**
 * Estimate the tax saving from deductions given a marginal rate.
 *
 * @param {string} totalDeductibleCents
 * @param {number} marginalRateBps - e.g. 4000 = 40%
 * @param {string} jurisdictionLabel - must be explicit
 * @returns {Object}
 */
function estimateTaxSaving(totalDeductibleCents, marginalRateBps, jurisdictionLabel) {
  if (!jurisdictionLabel) throw new Error('jurisdictionLabel required');

  const total = BigInt(totalDeductibleCents);
  const saving = (total * BigInt(marginalRateBps)) / 10000n;

  return {
    totalDeductibleCents,
    marginalRateBps,
    estimatedTaxSavingCents: saving.toString(),
    jurisdictionLabel,
    confidence: 'low',
    assumptions: [
      `Jurisdiction: ${jurisdictionLabel}`,
      `Marginal rate: ${marginalRateBps / 100}%`,
      'All deductions assumed fully allowable',
      'No tapering, phase-out, or cap applied',
    ],
    disclaimer: DISCLAIMER,
  };
}

module.exports = {
  identifyDeductionOpportunities,
  groupByCategory,
  estimateTaxSaving,
  EVIDENCE_REQUIREMENTS,
};
