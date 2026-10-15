'use strict';

/**
 * Expense Classifier
 * Maps transactions to tax-relevant categories.
 *
 * INFORMATIONAL ONLY — not legal or tax advice.
 * Jurisdiction adapters implemented elsewhere; this module uses explicit assumptions.
 * All classifications carry confidence and contradiction fields.
 */

// Canonical tax categories (jurisdiction-agnostic labels)
const TAX_CATEGORIES = {
  BUSINESS_EXPENSE: 'business_expense',
  HOME_OFFICE: 'home_office',
  TRAVEL_BUSINESS: 'travel_business',
  VEHICLE_BUSINESS: 'vehicle_business',
  PROFESSIONAL_DEVELOPMENT: 'professional_development',
  SOFTWARE_SUBSCRIPTIONS: 'software_subscriptions',
  EQUIPMENT: 'equipment',
  MARKETING: 'marketing',
  PROFESSIONAL_SERVICES: 'professional_services',
  MEALS_ENTERTAINMENT: 'meals_entertainment',
  HEALTHCARE: 'healthcare',
  CHARITABLE: 'charitable',
  INVESTMENT_RELATED: 'investment_related',
  PERSONAL: 'personal',
  MIXED_USE: 'mixed_use',
  UNCATEGORISED: 'uncategorised',
};

// Keyword → tax category mapping (illustrative; jurisdiction adapter overrides these)
const KEYWORD_MAP = [
  { pattern: /\b(aws|azure|google cloud|hosting|domain|cloudflare)\b/i, category: TAX_CATEGORIES.SOFTWARE_SUBSCRIPTIONS, deductibleHypothesis: true, confidence: 'medium' },
  { pattern: /\b(notion|slack|zoom|github|figma|linear|jira|asana|trello|dropbox|1password)\b/i, category: TAX_CATEGORIES.SOFTWARE_SUBSCRIPTIONS, deductibleHypothesis: true, confidence: 'medium' },
  { pattern: /\b(hotel|airbnb|flight|train|uber|lyft|taxi|national rail|eurostar)\b/i, category: TAX_CATEGORIES.TRAVEL_BUSINESS, deductibleHypothesis: null, confidence: 'low', note: 'business purpose must be verified' },
  { pattern: /\b(udemy|coursera|linkedin learning|pluralsight|book|conference|training)\b/i, category: TAX_CATEGORIES.PROFESSIONAL_DEVELOPMENT, deductibleHypothesis: true, confidence: 'medium' },
  { pattern: /\b(laptop|monitor|keyboard|desk|chair|printer|hard drive|ssd|webcam)\b/i, category: TAX_CATEGORIES.EQUIPMENT, deductibleHypothesis: null, confidence: 'low', note: 'business use % required' },
  { pattern: /\b(accountant|solicitor|lawyer|consultant|bookkeeper|legal)\b/i, category: TAX_CATEGORIES.PROFESSIONAL_SERVICES, deductibleHypothesis: true, confidence: 'high' },
  { pattern: /\b(facebook ads|google ads|meta ads|advertising|marketing|pr agency)\b/i, category: TAX_CATEGORIES.MARKETING, deductibleHypothesis: true, confidence: 'medium' },
  { pattern: /\b(restaurant|cafe|lunch|dinner|coffee meeting|client meal)\b/i, category: TAX_CATEGORIES.MEALS_ENTERTAINMENT, deductibleHypothesis: null, confidence: 'low', note: 'business entertainment deductibility varies by jurisdiction' },
  { pattern: /\b(charity|donation|donate|oxfam|red cross)\b/i, category: TAX_CATEGORIES.CHARITABLE, deductibleHypothesis: null, confidence: 'low', note: 'charitable rules vary significantly by jurisdiction' },
  { pattern: /\b(doctor|dentist|pharmacy|prescription|optician|nhs|hospital)\b/i, category: TAX_CATEGORIES.HEALTHCARE, deductibleHypothesis: null, confidence: 'low', note: 'healthcare deductibility is jurisdiction-specific' },
  { pattern: /\b(electricity|gas|broadband|internet|utilities)\b/i, category: TAX_CATEGORIES.HOME_OFFICE, deductibleHypothesis: null, confidence: 'low', note: 'home office proportion must be established' },
  { pattern: /\b(broker|trading|investment|dividend|isa transfer)\b/i, category: TAX_CATEGORIES.INVESTMENT_RELATED, deductibleHypothesis: null, confidence: 'medium', note: 'investment fees deductibility is jurisdiction-specific' },
  { pattern: /\b(fuel|petrol|diesel|parking|car insurance|mot|vehicle)\b/i, category: TAX_CATEGORIES.VEHICLE_BUSINESS, deductibleHypothesis: null, confidence: 'low', note: 'vehicle business use % required' },
];

/**
 * Classify a single transaction against tax categories.
 *
 * @param {Object} txn - {id, date, amountCents, description, category, direction, vendor, notes}
 * @param {Object} [overrides] - manual overrides {taxCategory, businessUsePct, notes}
 * @returns {Object} classification result
 */
function classifyTransaction(txn, overrides = {}) {
  const desc = `${txn.description || ''} ${txn.vendor || ''}`.trim();
  const matches = [];

  for (const rule of KEYWORD_MAP) {
    if (rule.pattern.test(desc)) {
      matches.push(rule);
    }
  }

  let taxCategory, confidence, deductibleHypothesis, notes, contradictions;

  if (overrides.taxCategory) {
    // Manual override takes precedence
    taxCategory = overrides.taxCategory;
    confidence = 'high';
    deductibleHypothesis = overrides.deductibleHypothesis ?? null;
    notes = overrides.notes ? [overrides.notes] : ['manually classified'];
    contradictions = matches.length > 0 && matches.every(m => m.category !== taxCategory)
      ? [`keyword matching suggested ${matches[0].category} but manual override applied`]
      : [];
  } else if (matches.length === 0) {
    taxCategory = txn.category === 'income' || txn.direction === 'in'
      ? null
      : TAX_CATEGORIES.UNCATEGORISED;
    confidence = 'none';
    deductibleHypothesis = null;
    notes = ['no keyword match — manual review needed'];
    contradictions = [];
  } else if (matches.length === 1) {
    taxCategory = matches[0].category;
    confidence = matches[0].confidence;
    deductibleHypothesis = matches[0].deductibleHypothesis;
    notes = matches[0].note ? [matches[0].note] : [];
    contradictions = [];
  } else {
    // Multiple matches — flag contradiction
    const categories = [...new Set(matches.map(m => m.category))];
    if (categories.length === 1) {
      taxCategory = categories[0];
      confidence = matches[0].confidence;
      deductibleHypothesis = matches[0].deductibleHypothesis;
      notes = matches.flatMap(m => m.note ? [m.note] : []);
      contradictions = [];
    } else {
      taxCategory = TAX_CATEGORIES.MIXED_USE;
      confidence = 'low';
      deductibleHypothesis = null;
      notes = ['multiple tax categories matched — mixed use or review required'];
      contradictions = categories.map(c => `matched ${c}`);
    }
  }

  // Income transactions are never expenditure deductions
  if (txn.direction === 'in') {
    taxCategory = null;
    deductibleHypothesis = null;
    confidence = 'high';
    notes = ['income transaction — not an expense'];
    contradictions = [];
  }

  return {
    txnId: txn.id,
    date: txn.date,
    amountCents: txn.amountCents?.toString() ?? '0',
    taxCategory,
    confidence,
    deductibleHypothesis,
    businessUsePct: overrides.businessUsePct ?? null,
    notes,
    contradictions,
    requiresReview: confidence === 'none' || confidence === 'low' || contradictions.length > 0,
    disclaimer: 'Classification is informational only. Confirm with a qualified tax professional.',
  };
}

/**
 * Classify an array of transactions.
 *
 * @param {Object[]} transactions
 * @param {Object} overrideMap - {txnId: overrides}
 * @returns {Object[]}
 */
function classifyAll(transactions, overrideMap = {}) {
  return transactions.map(t => classifyTransaction(t, overrideMap[t.id] ?? {}));
}

/**
 * Summarise classifications by tax category.
 *
 * @param {Object[]} classifications - output of classifyAll()
 * @returns {Object}
 */
function classificationSummary(classifications) {
  const byCategory = {};
  let totalExpenseCents = 0n;
  let reviewRequired = 0;
  let contradictions = 0;

  for (const c of classifications) {
    if (!c.taxCategory) continue;
    const cat = c.taxCategory;
    if (!byCategory[cat]) byCategory[cat] = { totalCents: 0n, count: 0, lowConfidence: 0 };
    byCategory[cat].totalCents += BigInt(c.amountCents);
    byCategory[cat].count += 1;
    if (c.confidence === 'low' || c.confidence === 'none') byCategory[cat].lowConfidence += 1;
    if (cat !== TAX_CATEGORIES.PERSONAL) totalExpenseCents += BigInt(c.amountCents);
    if (c.requiresReview) reviewRequired += 1;
    if (c.contradictions.length > 0) contradictions += 1;
  }

  return {
    byCategory: Object.fromEntries(
      Object.entries(byCategory).map(([k, v]) => [k, {
        totalCents: v.totalCents.toString(),
        count: v.count,
        lowConfidenceCount: v.lowConfidence,
      }])
    ),
    totalPotentialExpenseCents: totalExpenseCents.toString(),
    transactionsRequiringReview: reviewRequired,
    transactionsWithContradictions: contradictions,
    disclaimer: 'Totals are informational. Deductibility must be confirmed by a tax professional.',
  };
}

module.exports = {
  classifyTransaction,
  classifyAll,
  classificationSummary,
  TAX_CATEGORIES,
};
