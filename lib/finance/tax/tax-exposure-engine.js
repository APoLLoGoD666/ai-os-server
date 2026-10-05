'use strict';

/**
 * Tax Exposure Engine
 * Estimates tax exposure from income and allowable deductions.
 *
 * INFORMATIONAL ONLY — not legal or tax advice.
 * All figures are estimates. Jurisdiction assumptions are explicit.
 * Confidence degrades with missing evidence.
 */

/**
 * @typedef {Object} ExposureEstimate
 * @property {string} grossIncomeCents
 * @property {string} estimatedAllowableDeductionsCents
 * @property {string} estimatedTaxableIncomeCents
 * @property {string} estimatedTaxLiabilityCents
 * @property {'high'|'medium'|'low'|'none'} confidence
 * @property {string[]} assumptions
 * @property {string[]} uncertainties
 * @property {string} disclaimer
 */

const DISCLAIMER = 'This is an estimate for preparation purposes only. It is not tax advice. Engage a qualified tax professional before filing.';

/**
 * Estimate income tax exposure using a simplified bracket approach.
 * Jurisdiction assumptions are passed in explicitly — no defaults are silently applied.
 *
 * @param {Object} params
 * @param {string} params.grossIncomeCents - total gross income as integer-cent string
 * @param {string} params.estimatedDeductionsCents - total estimated allowable deductions
 * @param {Object[]} params.brackets - [{thresholdCents: string, rateBps: number, label: string}] sorted ascending
 * @param {string} params.personalAllowanceCents - tax-free allowance
 * @param {string} params.jurisdictionLabel - explicit label, e.g. 'UK 2024/25 (illustrative)'
 * @param {string[]} params.missingItems - list of data gaps that increase uncertainty
 * @returns {ExposureEstimate}
 */
function estimateIncomeTaxExposure({
  grossIncomeCents,
  estimatedDeductionsCents = '0',
  brackets = [],
  personalAllowanceCents = '0',
  jurisdictionLabel,
  missingItems = [],
}) {
  if (!jurisdictionLabel) {
    throw new Error('jurisdictionLabel is required — jurisdiction assumptions must be explicit');
  }
  if (!Array.isArray(brackets) || brackets.length === 0) {
    return {
      grossIncomeCents,
      estimatedAllowableDeductionsCents: estimatedDeductionsCents,
      estimatedTaxableIncomeCents: null,
      estimatedTaxLiabilityCents: null,
      confidence: 'none',
      assumptions: [`Jurisdiction: ${jurisdictionLabel}`],
      uncertainties: ['No tax brackets supplied — cannot estimate liability', ...missingItems],
      disclaimer: DISCLAIMER,
    };
  }

  const gross = BigInt(grossIncomeCents);
  const deductions = BigInt(estimatedDeductionsCents);
  const allowance = BigInt(personalAllowanceCents);

  const afterDeductions = gross - deductions;
  const taxableIncome = afterDeductions > allowance ? afterDeductions - allowance : 0n;

  // Apply brackets
  let totalTax = 0n;
  let remaining = taxableIncome;

  const sortedBrackets = [...brackets].sort(
    (a, b) => Number(BigInt(a.thresholdCents) - BigInt(b.thresholdCents))
  );

  for (let i = 0; i < sortedBrackets.length; i++) {
    if (remaining <= 0n) break;
    const current = sortedBrackets[i];
    const next = sortedBrackets[i + 1];

    const bandCeiling = next ? BigInt(next.thresholdCents) : null;
    const bandStart = BigInt(current.thresholdCents);

    let bandIncome;
    if (bandCeiling) {
      const bandWidth = bandCeiling - bandStart;
      bandIncome = remaining > bandWidth ? bandWidth : remaining;
    } else {
      bandIncome = remaining;
    }

    // rateBps is integer basis points (e.g. 2000 = 20%)
    const taxInBand = (bandIncome * BigInt(current.rateBps)) / 10000n;
    totalTax += taxInBand;
    remaining -= bandIncome;
  }

  const effectiveRateBps = taxableIncome > 0n
    ? Number((totalTax * 10000n) / taxableIncome)
    : 0;

  const confidence = missingItems.length === 0 ? 'medium'
    : missingItems.length <= 2 ? 'low'
    : 'none';

  const assumptions = [
    `Jurisdiction: ${jurisdictionLabel}`,
    `Personal allowance: ${personalAllowanceCents} cents`,
    'Brackets applied in ascending order',
    'No reliefs, credits, or surcharges modelled',
    'Deductions assumed fully allowable — not verified',
  ];

  const uncertainties = [
    ...missingItems,
    'Effective deduction rate may differ from estimate',
    'National Insurance / payroll taxes not included',
    'Capital gains, dividend income treated separately',
  ];

  return {
    grossIncomeCents: gross.toString(),
    estimatedAllowableDeductionsCents: deductions.toString(),
    estimatedTaxableIncomeCents: taxableIncome.toString(),
    estimatedTaxLiabilityCents: totalTax.toString(),
    effectiveRateBps,
    confidence,
    assumptions,
    uncertainties,
    disclaimer: DISCLAIMER,
  };
}

/**
 * Estimate self-assessment / self-employment exposure components.
 *
 * @param {Object} params
 * @param {string} params.selfEmployedIncomeCents
 * @param {string} params.allowableExpensesCents
 * @param {string} params.jurisdictionLabel
 * @param {string[]} params.missingItems
 * @returns {Object}
 */
function estimateSelfEmploymentExposure({
  selfEmployedIncomeCents,
  allowableExpensesCents = '0',
  jurisdictionLabel,
  missingItems = [],
}) {
  if (!jurisdictionLabel) {
    throw new Error('jurisdictionLabel is required');
  }

  const income = BigInt(selfEmployedIncomeCents);
  const expenses = BigInt(allowableExpensesCents);
  const profit = income > expenses ? income - expenses : 0n;

  const confidence = missingItems.length === 0 ? 'medium'
    : missingItems.length <= 3 ? 'low'
    : 'none';

  return {
    selfEmployedIncomeCents: income.toString(),
    allowableExpensesCents: expenses.toString(),
    estimatedProfitCents: profit.toString(),
    confidence,
    assumptions: [
      `Jurisdiction: ${jurisdictionLabel}`,
      'All supplied expenses assumed potentially allowable — not verified',
      'Basis period adjustments not modelled',
    ],
    uncertainties: [
      ...missingItems,
      'Disallowable portions of mixed-use expenses not deducted',
      'Overlap relief, capital allowances not included',
    ],
    requiresProfessionalReview: confidence !== 'medium',
    disclaimer: DISCLAIMER,
  };
}

/**
 * Year-to-date exposure snapshot.
 *
 * @param {Object[]} monthlyIncomes - [{month: 'YYYY-MM', incomeCents: string}]
 * @param {string} yearLabel - e.g. '2024/25'
 * @returns {Object}
 */
function ytdExposureSnapshot(monthlyIncomes, yearLabel) {
  const total = monthlyIncomes.reduce((a, m) => a + BigInt(m.incomeCents), 0n);
  const months = monthlyIncomes.length;

  return {
    yearLabel,
    ytdIncomeCents: total.toString(),
    monthsCovered: months,
    projectedAnnualCents: months > 0
      ? ((total * 12n) / BigInt(months)).toString()
      : null,
    confidence: months >= 6 ? 'medium' : months >= 3 ? 'low' : 'none',
    assumptions: [
      'Projection assumes income continues at observed average rate',
      'One-off receipts may distort projection',
    ],
    disclaimer: DISCLAIMER,
  };
}

module.exports = {
  estimateIncomeTaxExposure,
  estimateSelfEmploymentExposure,
  ytdExposureSnapshot,
  DISCLAIMER,
};
