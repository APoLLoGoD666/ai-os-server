'use strict';

/**
 * Opportunity Engine
 * Surfaces hypotheses about potential financial improvements.
 * All suggestions are labelled as hypotheses, never facts.
 * Every output includes evidence and counterarguments.
 */

/**
 * @typedef {Object} Opportunity
 * @property {string} type
 * @property {string} title
 * @property {string} hypothesis
 * @property {'high'|'medium'|'low'} confidence
 * @property {string[]} evidence
 * @property {string[]} counterarguments
 * @property {string|null} estimatedImpactCents
 * @property {string} [impactNote]
 */

/**
 * Detect recurring expenses that have increased substantially.
 * @param {Object[]} subscriptions - from subscriptionIdentification()
 * @param {Object[]} transactions - raw transactions for historical comparison
 * @param {number} increaseThresholdBps - default 2500 = 25%
 * @returns {Opportunity[]}
 */
function detectPriceIncreases(subscriptions, transactions, increaseThresholdBps = 2500) {
  const opportunities = [];

  for (const sub of subscriptions) {
    const vendor = sub.vendor;
    const current = BigInt(sub.typicalAmountCents);

    const vendorTxns = transactions
      .filter(t =>
        t.direction === 'out' &&
        normaliseVendor(t.description || t.vendor || '') === vendor
      )
      .sort((a, b) => new Date(a.date) - new Date(b.date));

    if (vendorTxns.length < 3) continue;

    const earliest = BigInt(vendorTxns[0].amountCents);
    if (earliest === 0n) continue;

    const changeBps = Number(((current - earliest) * 10000n) / earliest);

    if (changeBps >= increaseThresholdBps) {
      const annualExtraCents = ((current - earliest) * 12n).toString();
      opportunities.push({
        type: 'recurring_price_increase',
        title: `${vendor} cost has risen ~${Math.round(changeBps / 100)}%`,
        hypothesis: `This service may be costing more than expected due to a price increase or plan change.`,
        confidence: sub.confidence === 'high' ? 'medium' : 'low',
        evidence: [
          `First observed payment: ${earliest.toString()} cents`,
          `Most recent payment: ${current.toString()} cents`,
          `Change: +${Math.round(changeBps / 100)}%`,
          `${sub.occurrences} occurrences detected`,
        ],
        counterarguments: [
          'The earlier payment may have been a promotional rate',
          'The plan may have been upgraded intentionally',
          'Currency fluctuation could explain the difference',
        ],
        estimatedImpactCents: annualExtraCents,
        impactNote: 'estimated annual extra vs first observed amount',
      });
    }
  }

  return opportunities;
}

/**
 * Detect idle cash opportunities: large cash balances with no observed investment activity.
 * @param {string} liquidBalanceCents
 * @param {Object[]} transactions
 * @param {string} idleThresholdCents - amount above which cash is considered potentially idle
 * @returns {Opportunity[]}
 */
function detectIdleCash(liquidBalanceCents, transactions, idleThresholdCents = '300000') {
  const balance = BigInt(liquidBalanceCents);
  const threshold = BigInt(idleThresholdCents);

  if (balance < threshold) return [];

  const investmentKeywords = ['invest', 'isa', 'pension', 'fund', 'stock', 'etf', 'vanguard', 'trading'];
  const recentTxns = transactions.filter(t => {
    const d = new Date(t.date);
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 90);
    return d >= cutoff;
  });

  const hasRecentInvestment = recentTxns.some(t =>
    investmentKeywords.some(kw =>
      (t.description || '').toLowerCase().includes(kw)
    )
  );

  if (hasRecentInvestment) return [];

  return [{
    type: 'idle_cash',
    title: `Substantial cash balance with no recent investment activity observed`,
    hypothesis: `A portion of liquid funds may be available for deployment into savings or investments.`,
    confidence: 'low',
    evidence: [
      `Liquid balance: ${liquidBalanceCents} cents`,
      `Threshold used: ${idleThresholdCents} cents`,
      `No investment-related transactions found in past 90 days`,
    ],
    counterarguments: [
      'Balance may be earmarked for known upcoming expenses',
      'Investments may be made via accounts not in this dataset',
      'Owner may prefer holding liquidity for operational reasons',
    ],
    estimatedImpactCents: null,
    impactNote: 'impact depends on where funds would be deployed — not estimated here',
  }];
}

/**
 * Cashflow improvement opportunities: recurring outflows with no clear business purpose.
 * Flags categories where outflow significantly exceeds the prior-period average.
 * @param {Object[]} monthlySummaries - from cashflow-engine
 * @param {number} spikeThresholdBps - default 5000 = 50% above average
 * @returns {Opportunity[]}
 */
function detectCashflowImprovements(monthlySummaries, spikeThresholdBps = 5000) {
  if (monthlySummaries.length < 3) return [];

  const recent = monthlySummaries[monthlySummaries.length - 1];
  const prior = monthlySummaries.slice(0, -1);
  const avgOut = prior.reduce((a, s) => a + BigInt(s.outflowCents), 0n) / BigInt(prior.length);

  if (avgOut === 0n) return [];

  const recentOut = BigInt(recent.outflowCents);
  const changeBps = Number(((recentOut - avgOut) * 10000n) / avgOut);

  if (changeBps < spikeThresholdBps) return [];

  return [{
    type: 'cashflow_spike',
    title: `Outflow in ${recent.month} was ~${Math.round(changeBps / 100)}% above recent average`,
    hypothesis: `Last month's spending was notably higher than the norm. This may represent a one-time event or an emerging trend.`,
    confidence: 'medium',
    evidence: [
      `${recent.month} outflow: ${recentOut.toString()} cents`,
      `Prior average outflow: ${avgOut.toString()} cents`,
      `Deviation: +${Math.round(changeBps / 100)}%`,
      `${prior.length} months used for baseline`,
    ],
    counterarguments: [
      'One-time payments (annual subscriptions, tax, insurance) can create spikes',
      'Seasonal patterns may explain the increase',
      'Sample size may be too small to establish a reliable norm',
    ],
    estimatedImpactCents: (recentOut - avgOut).toString(),
    impactNote: 'estimated excess vs average — may normalise next month',
  }];
}

/**
 * Debt optimisation opportunities: flags if high-interest debt is present alongside idle cash.
 * @param {Object[]} debts - [{label, balanceCents, interestRateBps}]
 * @param {string} liquidBalanceCents
 * @returns {Opportunity[]}
 */
function detectDebtOptimisation(debts, liquidBalanceCents) {
  const opps = [];
  const liquid = BigInt(liquidBalanceCents);

  const highInterestDebts = debts.filter(d => d.interestRateBps >= 1000); // ≥10%

  for (const debt of highInterestDebts) {
    const balance = BigInt(debt.balanceCents);
    if (balance <= 0n || liquid < balance / 4n) continue;

    const annualInterestCents = (balance * BigInt(debt.interestRateBps)) / 10000n;

    opps.push({
      type: 'debt_optimisation',
      title: `${debt.label} may be worth prioritising given available liquidity`,
      hypothesis: `If a portion of liquid funds were applied to this debt, interest costs could be reduced.`,
      confidence: 'low',
      evidence: [
        `Debt balance: ${balance.toString()} cents`,
        `Interest rate: ${debt.interestRateBps / 100}%`,
        `Estimated annual interest: ${annualInterestCents.toString()} cents`,
        `Available liquid balance: ${liquidBalanceCents} cents`,
      ],
      counterarguments: [
        'Emergency fund may need to remain intact',
        'Prepayment penalties may apply',
        'Liquidity may be needed for near-term obligations',
        'Investment returns might exceed debt interest rate',
      ],
      estimatedImpactCents: annualInterestCents.toString(),
      impactNote: 'estimated annual interest saved if debt fully repaid — actual impact depends on partial payment',
    });
  }

  return opps;
}

/**
 * Missed savings: income months where no savings outflow was observed.
 * @param {Object[]} monthlySummaries
 * @param {Object[]} transactions
 * @returns {Opportunity[]}
 */
function detectMissedSavings(monthlySummaries, transactions) {
  const savingsKeywords = ['savings', 'isa', 'pension', 'invest', 'transfer to savings'];

  const savingsByMonth = {};
  for (const t of transactions) {
    if (t.direction !== 'out') continue;
    const desc = (t.description || '').toLowerCase();
    const isSavings = savingsKeywords.some(kw => desc.includes(kw));
    if (!isSavings) continue;
    const d = new Date(t.date);
    const month = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
    savingsByMonth[month] = true;
  }

  const missedMonths = monthlySummaries.filter(s => {
    const hasInflow = BigInt(s.inflowCents) > 0n;
    return hasInflow && !savingsByMonth[s.month];
  });

  if (missedMonths.length === 0) return [];

  return [{
    type: 'missed_savings',
    title: `${missedMonths.length} income month(s) had no observed savings activity`,
    hypothesis: `Savings may have been missed or recorded in an account not covered by this dataset.`,
    confidence: 'low',
    evidence: [
      `Months with income but no savings detected: ${missedMonths.map(m => m.month).join(', ')}`,
      `Keywords searched: ${savingsKeywords.join(', ')}`,
    ],
    counterarguments: [
      'Savings may be made via accounts not in this dataset',
      'Savings keyword list may not match actual transaction descriptions',
      'Savings may be made as lump sums in other months',
    ],
    estimatedImpactCents: null,
    impactNote: 'cannot estimate without savings rate target',
  }];
}

/**
 * Run all opportunity detections and return a unified list sorted by confidence.
 */
function allOpportunities({
  subscriptions = [],
  transactions = [],
  liquidBalanceCents = '0',
  monthlySummaries = [],
  debts = [],
} = {}) {
  const results = [
    ...detectPriceIncreases(subscriptions, transactions),
    ...detectIdleCash(liquidBalanceCents, transactions),
    ...detectCashflowImprovements(monthlySummaries),
    ...detectDebtOptimisation(debts, liquidBalanceCents),
    ...detectMissedSavings(monthlySummaries, transactions),
  ];

  const confidenceOrder = { high: 0, medium: 1, low: 2 };
  return results.sort(
    (a, b) => (confidenceOrder[a.confidence] ?? 3) - (confidenceOrder[b.confidence] ?? 3)
  );
}

function normaliseVendor(str) {
  return str.toLowerCase().replace(/\s+/g, ' ').trim().slice(0, 60);
}

module.exports = {
  detectPriceIncreases,
  detectIdleCash,
  detectCashflowImprovements,
  detectDebtOptimisation,
  detectMissedSavings,
  allOpportunities,
};
