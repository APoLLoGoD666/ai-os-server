'use strict';

/**
 * Cashflow Engine
 * Transforms precision financial data into cashflow intelligence.
 * Never performs arithmetic on JS floats — all numeric inputs assumed
 * to be integer cent values or BigInt-compatible strings.
 */

const TREND_WINDOW_MONTHS = 3;

/**
 * Compute rolling cashflow over a window (30 / 60 / 90 days).
 * @param {Object[]} events - Array of {date: string, amountCents: number, direction: 'in'|'out'}
 * @param {number} days - 30, 60, or 90
 * @param {string} asOf - ISO date string for the reference point
 * @returns {Object}
 */
function rollingCashflow(events, days, asOf) {
  const ref = new Date(asOf);
  const cutoff = new Date(ref);
  cutoff.setDate(cutoff.getDate() - days);

  const inWindow = events.filter(e => {
    const d = new Date(e.date);
    return d >= cutoff && d <= ref;
  });

  let inflowCents = 0n;
  let outflowCents = 0n;

  for (const e of inWindow) {
    const cents = BigInt(e.amountCents);
    if (e.direction === 'in') inflowCents += cents;
    else outflowCents += cents;
  }

  const netCents = inflowCents - outflowCents;

  return {
    windowDays: days,
    asOf,
    inflowCents: inflowCents.toString(),
    outflowCents: outflowCents.toString(),
    netCents: netCents.toString(),
    netPositive: netCents > 0n,
    transactionCount: inWindow.length,
  };
}

/**
 * Summarise cashflow by calendar month.
 * @param {Object[]} events
 * @returns {Object[]} sorted ascending
 */
function monthlySummaries(events) {
  const buckets = {};

  for (const e of events) {
    const d = new Date(e.date);
    const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
    if (!buckets[key]) {
      buckets[key] = { month: key, inflowCents: 0n, outflowCents: 0n, count: 0 };
    }
    const cents = BigInt(e.amountCents);
    if (e.direction === 'in') buckets[key].inflowCents += cents;
    else buckets[key].outflowCents += cents;
    buckets[key].count += 1;
  }

  return Object.values(buckets)
    .sort((a, b) => a.month.localeCompare(b.month))
    .map(b => ({
      month: b.month,
      inflowCents: b.inflowCents.toString(),
      outflowCents: b.outflowCents.toString(),
      netCents: (b.inflowCents - b.outflowCents).toString(),
      transactionCount: b.count,
    }));
}

/**
 * Detect deterioration: whether the most recent N months show declining net cashflow.
 * @param {Object[]} summaries - output of monthlySummaries()
 * @param {number} windowMonths
 * @returns {Object}
 */
function trendDirection(summaries, windowMonths = TREND_WINDOW_MONTHS) {
  if (summaries.length < 2) {
    return { trend: 'insufficient_data', confidence: 'low', windowMonths };
  }

  const recent = summaries.slice(-windowMonths);
  if (recent.length < 2) {
    return { trend: 'insufficient_data', confidence: 'low', windowMonths };
  }

  let declining = 0;
  let improving = 0;

  for (let i = 1; i < recent.length; i++) {
    const prev = BigInt(recent[i - 1].netCents);
    const curr = BigInt(recent[i].netCents);
    if (curr < prev) declining++;
    else if (curr > prev) improving++;
  }

  const total = recent.length - 1;
  const trend =
    declining === total ? 'deteriorating'
    : improving === total ? 'improving'
    : declining > improving ? 'mostly_deteriorating'
    : improving > declining ? 'mostly_improving'
    : 'flat';

  const confidence = total >= 2 ? 'medium' : 'low';

  return { trend, confidence, windowMonths, periodsAnalysed: total };
}

/**
 * Detect anomalous months where net cashflow deviates substantially from the mean.
 * Uses integer arithmetic on cent values; deviation threshold is 2× standard deviation
 * computed via a simple integer-safe approximation.
 * @param {Object[]} summaries
 * @returns {Object[]}
 */
function anomalyIdentification(summaries) {
  if (summaries.length < 3) return [];

  const nets = summaries.map(s => BigInt(s.netCents));
  const n = BigInt(nets.length);
  const sum = nets.reduce((a, b) => a + b, 0n);
  const mean = sum / n;

  // variance = sum of (x - mean)^2 / n — stays as BigInt squared-cents
  const variance = nets.reduce((acc, v) => {
    const diff = v - mean;
    return acc + diff * diff;
  }, 0n) / n;

  // stddev approximation: integer square root
  let stddev = variance > 0n ? bigIntSqrt(variance) : 0n;
  const threshold = stddev * 2n;

  return summaries
    .filter((s, i) => {
      const diff = nets[i] - mean;
      const absDiff = diff < 0n ? -diff : diff;
      return threshold > 0n && absDiff > threshold;
    })
    .map(s => ({
      month: s.month,
      netCents: s.netCents,
      anomalyType: BigInt(s.netCents) < mean ? 'significant_outflow' : 'significant_inflow',
    }));
}

/**
 * Estimate months of runway given current liquid balance and average monthly outflow.
 * @param {string} liquidBalanceCents - BigInt-string
 * @param {Object[]} summaries - recent monthly summaries
 * @param {number} lookbackMonths - how many months to average outflow over
 * @returns {Object}
 */
function forecastRunway(liquidBalanceCents, summaries, lookbackMonths = 3) {
  const balance = BigInt(liquidBalanceCents);
  const recent = summaries.slice(-lookbackMonths);

  if (recent.length === 0) {
    return { runwayMonths: null, confidence: 'none', reason: 'no_outflow_data' };
  }

  const totalOut = recent.reduce((acc, s) => acc + BigInt(s.outflowCents), 0n);
  const avgOut = totalOut / BigInt(recent.length);

  if (avgOut === 0n) {
    return { runwayMonths: null, confidence: 'none', reason: 'zero_outflow_average' };
  }

  const runwayMonths = balance / avgOut;
  const confidence = recent.length >= 3 ? 'medium' : 'low';

  return {
    runwayMonths: runwayMonths.toString(),
    avgMonthlyOutflowCents: avgOut.toString(),
    liquidBalanceCents,
    confidence,
    basedOnMonths: recent.length,
  };
}

/**
 * Identify surplus capacity: months where inflow substantially exceeded outflow.
 * @param {Object[]} summaries
 * @param {number} surplusThresholdBps - basis points of inflow considered surplus (default 2000 = 20%)
 * @returns {Object[]}
 */
function surplusCapacity(summaries, surplusThresholdBps = 2000) {
  return summaries
    .filter(s => {
      const inflow = BigInt(s.inflowCents);
      const net = BigInt(s.netCents);
      if (inflow === 0n) return false;
      const surplusBps = (net * 10000n) / inflow;
      return surplusBps >= BigInt(surplusThresholdBps);
    })
    .map(s => ({
      month: s.month,
      netCents: s.netCents,
      inflowCents: s.inflowCents,
    }));
}

// Integer square root (Newton's method, BigInt-safe)
function bigIntSqrt(n) {
  if (n < 0n) throw new RangeError('negative input');
  if (n === 0n) return 0n;
  let x = n;
  let y = (x + 1n) / 2n;
  while (y < x) {
    x = y;
    y = (x + n / x) / 2n;
  }
  return x;
}

/**
 * Full cashflow analysis convenience wrapper.
 */
function analyseCashflow(events, liquidBalanceCents, asOf) {
  const summaries = monthlySummaries(events);
  return {
    rolling30: rollingCashflow(events, 30, asOf),
    rolling60: rollingCashflow(events, 60, asOf),
    rolling90: rollingCashflow(events, 90, asOf),
    monthlySummaries: summaries,
    trend: trendDirection(summaries),
    anomalies: anomalyIdentification(summaries),
    runway: forecastRunway(liquidBalanceCents, summaries),
    surplus: surplusCapacity(summaries),
  };
}

module.exports = {
  rollingCashflow,
  monthlySummaries,
  trendDirection,
  anomalyIdentification,
  forecastRunway,
  surplusCapacity,
  analyseCashflow,
};
