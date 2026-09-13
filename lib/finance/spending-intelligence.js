'use strict';

/**
 * Spending Intelligence
 * Observational analysis of where money goes.
 * Never auto-recommends deletions. Uncertainty remains visible.
 */

const SUBSCRIPTION_MAX_VARIANCE_BPS = 200; // 2% variance = likely subscription
const RECURRING_MIN_OCCURRENCES = 2;
const LIFESTYLE_CREEP_WINDOW_MONTHS = 3;
const LIFESTYLE_CREEP_THRESHOLD_BPS = 1500; // 15% increase triggers flag

/**
 * Aggregate spending by category.
 * @param {Object[]} transactions - {amountCents, category, date, direction}
 * @param {string} [fromDate] - ISO date filter
 * @param {string} [toDate]
 * @returns {Object[]} sorted by total descending
 */
function categoryAnalysis(transactions, fromDate, toDate) {
  const filtered = filterByDate(transactions, fromDate, toDate)
    .filter(t => t.direction === 'out');

  const buckets = {};
  for (const t of filtered) {
    const cat = t.category || 'uncategorised';
    if (!buckets[cat]) buckets[cat] = { category: cat, totalCents: 0n, count: 0 };
    buckets[cat].totalCents += BigInt(t.amountCents);
    buckets[cat].count += 1;
  }

  const total = Object.values(buckets).reduce((a, b) => a + b.totalCents, 0n);

  return Object.values(buckets)
    .sort((a, b) => (a.totalCents > b.totalCents ? -1 : 1))
    .map(b => ({
      category: b.category,
      totalCents: b.totalCents.toString(),
      transactionCount: b.count,
      shareOfSpendBps: total > 0n
        ? Number((b.totalCents * 10000n) / total)
        : 0,
    }));
}

/**
 * Identify likely subscriptions: same vendor, similar amount, roughly monthly cadence.
 * @param {Object[]} transactions
 * @returns {Object[]}
 */
function subscriptionIdentification(transactions) {
  const outflows = transactions.filter(t => t.direction === 'out');
  const byVendor = groupBy(outflows, t => normaliseVendor(t.description || t.vendor || ''));

  const candidates = [];

  for (const [vendor, txns] of Object.entries(byVendor)) {
    if (txns.length < RECURRING_MIN_OCCURRENCES) continue;

    const sorted = txns.slice().sort((a, b) =>
      new Date(a.date) - new Date(b.date)
    );

    // Check amount consistency
    const amounts = sorted.map(t => BigInt(t.amountCents));
    const minAmt = amounts.reduce((a, b) => (a < b ? a : b));
    const maxAmt = amounts.reduce((a, b) => (a > b ? a : b));

    if (minAmt === 0n) continue;
    const varianceBps = Number(((maxAmt - minAmt) * 10000n) / minAmt);

    if (varianceBps > SUBSCRIPTION_MAX_VARIANCE_BPS) continue;

    // Check cadence consistency (roughly 25–35 day gaps)
    const gaps = [];
    for (let i = 1; i < sorted.length; i++) {
      const gap = daysBetween(sorted[i - 1].date, sorted[i].date);
      gaps.push(gap);
    }
    const avgGap = gaps.reduce((a, b) => a + b, 0) / gaps.length;
    const isMonthly = avgGap >= 25 && avgGap <= 35;
    const isWeekly = avgGap >= 6 && avgGap <= 8;
    const isAnnual = avgGap >= 350 && avgGap <= 380;

    if (!isMonthly && !isWeekly && !isAnnual) continue;

    candidates.push({
      vendor,
      cadence: isMonthly ? 'monthly' : isWeekly ? 'weekly' : 'annual',
      typicalAmountCents: amounts[amounts.length - 1].toString(),
      occurrences: sorted.length,
      firstSeen: sorted[0].date,
      lastSeen: sorted[sorted.length - 1].date,
      amountVarianceBps: varianceBps,
      confidence: sorted.length >= 3 ? 'high' : 'medium',
    });
  }

  return candidates.sort((a, b) =>
    BigInt(b.typicalAmountCents) > BigInt(a.typicalAmountCents) ? 1 : -1
  );
}

/**
 * Detect recurring transactions (broader than subscriptions — includes variable amounts).
 * @param {Object[]} transactions
 * @returns {Object[]}
 */
function recurringTransactionDetection(transactions) {
  const byVendor = groupBy(
    transactions,
    t => normaliseVendor(t.description || t.vendor || '')
  );

  const recurring = [];

  for (const [vendor, txns] of Object.entries(byVendor)) {
    if (txns.length < RECURRING_MIN_OCCURRENCES || !vendor) continue;

    const sorted = txns.slice().sort((a, b) => new Date(a.date) - new Date(b.date));
    const direction = txns[0].direction;
    const allSameDirection = txns.every(t => t.direction === direction);

    recurring.push({
      vendor,
      direction: allSameDirection ? direction : 'mixed',
      occurrences: txns.length,
      firstSeen: sorted[0].date,
      lastSeen: sorted[sorted.length - 1].date,
      confidence: txns.length >= 4 ? 'high' : 'medium',
    });
  }

  return recurring;
}

/**
 * Detect lifestyle creep: spending categories increasing over consecutive months.
 * @param {Object[]} transactions
 * @param {number} windowMonths
 * @returns {Object[]}
 */
function lifestyleCreepDetection(transactions, windowMonths = LIFESTYLE_CREEP_WINDOW_MONTHS) {
  const outflows = transactions.filter(t => t.direction === 'out');

  // Group by month and category
  const monthCat = {};
  for (const t of outflows) {
    const d = new Date(t.date);
    const month = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
    const cat = t.category || 'uncategorised';
    const key = `${month}::${cat}`;
    if (!monthCat[key]) monthCat[key] = { month, category: cat, totalCents: 0n };
    monthCat[key].totalCents += BigInt(t.amountCents);
  }

  const months = [...new Set(Object.values(monthCat).map(v => v.month))].sort();
  const recentMonths = months.slice(-windowMonths);

  if (recentMonths.length < 2) return [];

  const categories = [...new Set(Object.values(monthCat).map(v => v.category))];
  const creep = [];

  for (const cat of categories) {
    const series = recentMonths.map(m => {
      const entry = monthCat[`${m}::${cat}`];
      return { month: m, totalCents: entry ? entry.totalCents : 0n };
    });

    const first = series[0].totalCents;
    const last = series[series.length - 1].totalCents;

    if (first === 0n) continue;

    const changeBps = Number(((last - first) * 10000n) / first);
    if (changeBps >= LIFESTYLE_CREEP_THRESHOLD_BPS) {
      creep.push({
        category: cat,
        changeBps,
        fromCents: first.toString(),
        toCents: last.toString(),
        windowMonths: recentMonths.length,
        monthRange: `${recentMonths[0]} → ${recentMonths[recentMonths.length - 1]}`,
        confidence: recentMonths.length >= 3 ? 'medium' : 'low',
      });
    }
  }

  return creep.sort((a, b) => b.changeBps - a.changeBps);
}

/**
 * Flag unusual spending: single transactions substantially above vendor/category norm.
 * @param {Object[]} transactions
 * @param {number} deviationThresholdBps - deviation considered unusual (default 300% = 30000 bps)
 * @returns {Object[]}
 */
function unusualSpendingAlerts(transactions, deviationThresholdBps = 30000) {
  const outflows = transactions.filter(t => t.direction === 'out');
  const byVendor = groupBy(outflows, t => normaliseVendor(t.description || t.vendor || ''));
  const alerts = [];

  for (const [vendor, txns] of Object.entries(byVendor)) {
    if (txns.length < 2) continue;

    const amounts = txns.map(t => BigInt(t.amountCents));
    const sum = amounts.reduce((a, b) => a + b, 0n);
    const mean = sum / BigInt(amounts.length);
    if (mean === 0n) continue;

    for (const t of txns) {
      const amt = BigInt(t.amountCents);
      const deviationBps = Number(((amt - mean) * 10000n) / mean);
      if (deviationBps >= deviationThresholdBps) {
        alerts.push({
          date: t.date,
          vendor,
          amountCents: t.amountCents.toString(),
          typicalAmountCents: mean.toString(),
          deviationBps,
          category: t.category,
        });
      }
    }
  }

  return alerts.sort((a, b) => b.deviationBps - a.deviationBps);
}

/**
 * Vendor concentration analysis: what fraction of total spend goes to top vendors.
 * @param {Object[]} transactions
 * @param {number} topN
 * @returns {Object}
 */
function vendorConcentrationAnalysis(transactions, topN = 10) {
  const outflows = transactions.filter(t => t.direction === 'out');
  const byVendor = groupBy(outflows, t => normaliseVendor(t.description || t.vendor || ''));

  const totalSpend = outflows.reduce((a, t) => a + BigInt(t.amountCents), 0n);

  const vendors = Object.entries(byVendor)
    .map(([vendor, txns]) => ({
      vendor,
      totalCents: txns.reduce((a, t) => a + BigInt(t.amountCents), 0n),
      transactionCount: txns.length,
    }))
    .sort((a, b) => (a.totalCents > b.totalCents ? -1 : 1));

  const top = vendors.slice(0, topN).map(v => ({
    vendor: v.vendor,
    totalCents: v.totalCents.toString(),
    shareOfSpendBps: totalSpend > 0n
      ? Number((v.totalCents * 10000n) / totalSpend)
      : 0,
    transactionCount: v.transactionCount,
  }));

  const topShareBps = top.reduce((a, v) => a + v.shareOfSpendBps, 0);

  return {
    topVendors: top,
    topNShareBps: topShareBps,
    totalVendors: vendors.length,
    concentrationLevel: topShareBps > 7000 ? 'high' : topShareBps > 4000 ? 'medium' : 'low',
  };
}

/**
 * Largest recurring costs: combines subscription and recurring detection, sorted by impact.
 */
function largestRecurringCosts(transactions) {
  const subs = subscriptionIdentification(transactions);
  const recurring = recurringTransactionDetection(transactions);

  // Merge: subscriptions take priority (more specific)
  const subVendors = new Set(subs.map(s => s.vendor));
  const otherRecurring = recurring.filter(r => !subVendors.has(r.vendor));

  return {
    subscriptions: subs.slice(0, 10),
    otherRecurring: otherRecurring.slice(0, 10),
  };
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function filterByDate(transactions, fromDate, toDate) {
  return transactions.filter(t => {
    const d = new Date(t.date);
    if (fromDate && d < new Date(fromDate)) return false;
    if (toDate && d > new Date(toDate)) return false;
    return true;
  });
}

function groupBy(arr, keyFn) {
  const out = {};
  for (const item of arr) {
    const k = keyFn(item);
    if (!out[k]) out[k] = [];
    out[k].push(item);
  }
  return out;
}

function normaliseVendor(str) {
  return str.toLowerCase().replace(/\s+/g, ' ').trim().slice(0, 60);
}

function daysBetween(a, b) {
  return Math.round((new Date(b) - new Date(a)) / 86400000);
}

module.exports = {
  categoryAnalysis,
  subscriptionIdentification,
  recurringTransactionDetection,
  lifestyleCreepDetection,
  unusualSpendingAlerts,
  vendorConcentrationAnalysis,
  largestRecurringCosts,
};
