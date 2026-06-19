'use strict';
// validate-financial-forecasting.js — Phase 42 behavioural validation
// 140+ checks across forecast-engine, scenario-engine, and decision-support

const fe  = require('./lib/finance/forecast-engine');
const se  = require('./lib/finance/scenario-engine');
const ds  = require('./lib/finance/decision-support');

let total = 0, passed = 0;

function check(label, condition) {
    total++;
    const ok = !!condition;
    if (ok) passed++;
    else console.log(`  FAIL [${total}]: ${label}`);
}

// ─── Section 1: Income projections (15) ─────────────────────────────────────
console.log('\nSection 1: Income projections');
{
    const r = fe.projectIncome(100000, 0, 12, 80);
    check('isProjection flag', r.isProjection === true);
    check('zero-growth: finalCents equals base', r.finalCents === 100000);
    check('zero-growth: totalCents = base * months', r.totalCents === 1200000);
    check('monthlyValues length equals months', r.monthlyValues.length === 12);
    check('confidence decays with time', r.confidence === 68);     // 80 - 12 = 68
    check('baseCents preserved', r.baseCents === 100000);

    const r2 = fe.projectIncome(100000, 100, 3, 80);               // 1% monthly growth
    // Month 1: 100000 + 1000 = 101000
    // Month 2: 101000 + 1010 = 102010
    // Month 3: 102010 + 1020 = 103030
    check('positive-growth: final > base', r2.finalCents > 100000);
    check('positive-growth: month1 = 101000', r2.monthlyValues[0].incomeCents === 101000);
    check('positive-growth: month2 = 102010', r2.monthlyValues[1].incomeCents === 102010);
    check('positive-growth: month3 = 103030', r2.monthlyValues[2].incomeCents === 103030);
    check('positive-growth: finalCents matches last entry', r2.finalCents === r2.monthlyValues[2].incomeCents);

    const r3 = fe.projectIncome(100000, 0, 0, 80);                 // 0 months
    check('zero-months: monthlyValues empty', r3.monthlyValues.length === 0);
    check('zero-months: finalCents = base', r3.finalCents === 100000);
    check('zero-months: confidence unpenalised', r3.confidence === 80);

    const r4 = fe.projectIncome(100000, -50, 2, 80);               // deflation (-0.5%)
    // Month 1: 100000 + _intMulDiv(100000, -50, 10000) = 100000 - 500 = 99500
    check('negative-growth: final < base', r4.finalCents < 100000);
}

// ─── Section 2: Expense projections (8) ─────────────────────────────────────
console.log('Section 2: Expense projections');
{
    const r = fe.projectExpenses(80000, 0, 6, 80);
    check('isProjection flag', r.isProjection === true);
    check('zero-inflation: finalCents = base', r.finalCents === 80000);
    check('totalCents = base * months', r.totalCents === 480000);
    check('monthlyValues length = months', r.monthlyValues.length === 6);

    const r2 = fe.projectExpenses(80000, 200, 3, 80);              // 2% monthly inflation
    // Month 1: 80000 + 1600 = 81600
    check('inflation: month1 = 81600', r2.monthlyValues[0].expenseCents === 81600);
    check('inflation: finalCents > base', r2.finalCents > 80000);
    check('inflationBps preserved', r2.inflationBps === 200);

    const r3 = fe.projectExpenses(80000, 0, 0, 80);
    check('zero-months: finalCents = base', r3.finalCents === 80000);
}

// ─── Section 3: Runway & Emergency depletion (12) ──────────────────────────
console.log('Section 3: Runway & Emergency');
{
    const r = fe.projectRunway(600000, 200000, 300000, 80);        // net = -100000/month
    check('finite runway: infinite=false', r.infinite === false);
    check('finite runway: runwayMonths=6', r.runwayMonths === 6);
    check('isProjection flag', r.isProjection === true);
    check('monthlyNetCents = -100000', r.monthlyNetCents === -100000);

    const r2 = fe.projectRunway(0, 300000, 200000, 80);            // net positive
    check('accumulating: infinite=true', r2.infinite === true);
    check('accumulating: accumulating=true', r2.accumulating === true);

    const r3 = fe.projectRunway(0, 100000, 100000, 80);            // exactly balanced
    check('balanced: infinite=true (net=0)', r3.infinite === true);

    const r4 = fe.projectRunway(0, 50000, 200000, 80);             // no reserve, net negative
    check('zero-reserve: runwayMonths=0', r4.runwayMonths === 0);

    const e = fe.modelEmergencyDepletion(300000, 100000, 80);
    check('emergency: monthsToDepletion=3', e.monthsToDepletion === 3);
    check('emergency: remainderCents=0', e.remainderCents === 0);
    check('emergency: isProjection', e.isProjection === true);

    const e2 = fe.modelEmergencyDepletion(350000, 100000, 80);
    check('emergency with remainder: months=3', e2.monthsToDepletion === 3);
    check('emergency with remainder: remainder=50000', e2.remainderCents === 50000);
}

// ─── Section 4: Debt payoff (12) ────────────────────────────────────────────
console.log('Section 4: Debt payoff');
{
    const r = fe.forecastDebtPayoff(100000, 100000, 0, 80);        // $1000 debt, $1000 payment, 0% rate
    check('zero-rate: payoffPossible=true', r.payoffPossible === true);
    check('zero-rate: months=1', r.months === 1);
    check('zero-rate: totalInterestCents=0', r.totalInterestCents === 0);
    check('zero-rate: totalPaidCents=balance', r.totalPaidCents === 100000);
    check('isProjection flag', r.isProjection === true);

    const r2 = fe.forecastDebtPayoff(200000, 50000, 0, 80);        // 4-month payoff
    check('zero-rate 4-month: months=4', r2.months === 4);
    check('zero-rate 4-month: totalPaid=200000', r2.totalPaidCents === 200000);

    const r3 = fe.forecastDebtPayoff(1000000, 100, 12000, 80);     // payment can't cover interest
    check('payment-below-interest: payoffPossible=false', r3.payoffPossible === false);
    check('payment-below-interest: reason', r3.reason === 'PAYMENT_BELOW_INTEREST');
    check('payment-below-interest: isProjection', r3.isProjection === true);

    const r4 = fe.forecastDebtPayoff(0, 10000, 0, 80);             // already paid off
    check('zero-balance: months=0', r4.months === 0);
    check('zero-balance: payoffPossible=true', r4.payoffPossible === true);
    check('zero-balance: totalPaid=0', r4.totalPaidCents === 0);
}

// ─── Section 5: Savings acceleration & Goal completion (12) ─────────────────
console.log('Section 5: Savings acceleration & Goals');
{
    const r = fe.modelSavingsAcceleration(50000, 20000, 12, 80);
    check('isProjection flag', r.isProjection === true);
    check('baseTotalCents = current * months', r.baseTotalCents === 600000);
    check('acceleratedTotal = (current+additional)*months', r.acceleratedTotalCents === 840000);
    check('accelerationGain = additional * months', r.accelerationGainCents === 240000);
    check('acceleratedMonthly = current + additional', r.acceleratedMonthlyCents === 70000);

    const g = fe.estimateGoalCompletion(500000, 0, 50000, 0, 80);  // $5000 goal, $500/month, 0% growth
    check('goal: months=10', g.months === 10);
    check('goal: alreadyReached=false', g.alreadyReached === false);
    check('goal: isProjection', g.isProjection === true);

    const g2 = fe.estimateGoalCompletion(100000, 200000, 50000, 0, 80);  // already met
    check('goal already reached: alreadyReached=true', g2.alreadyReached === true);
    check('goal already reached: months=0', g2.months === 0);

    const g3 = fe.estimateGoalCompletion(110000, 100000, 10000, 0, 80);  // 1 month away
    check('goal one month: months=1', g3.months === 1);

    const g4 = fe.estimateGoalCompletion(200000, 0, 0, 0, 80);           // zero savings, unreachable cap
    check('goal unreachable cap: months=12000', g4.months === 12000);
}

// ─── Section 6: Affordability (12) ──────────────────────────────────────────
console.log('Section 6: Affordability');
{
    const a1 = fe.analyzeAffordability(100000, 'ONCE', 200000, 50000, 80);
    check('ONCE affordable: true', a1.affordable === true);
    check('ONCE affordable: impactNote', a1.impactNote === 'reserve_sufficient');
    check('isProjection', a1.isProjection === true);

    const a2 = fe.analyzeAffordability(300000, 'ONCE', 200000, 50000, 80);
    check('ONCE unaffordable: false', a2.affordable === false);
    check('ONCE unaffordable: impactNote', a2.impactNote === 'reserve_insufficient');

    const a3 = fe.analyzeAffordability(30000, 'MONTHLY', 0, 50000, 80);
    check('MONTHLY affordable: true', a3.affordable === true);
    check('MONTHLY affordable: impactNote', a3.impactNote === 'within_monthly_net');

    const a4 = fe.analyzeAffordability(60000, 'MONTHLY', 0, 50000, 80);
    check('MONTHLY unaffordable: false', a4.affordable === false);
    check('MONTHLY unaffordable: impactNote', a4.impactNote === 'exceeds_monthly_net');

    const a5 = fe.analyzeAffordability(600000, 'ANNUAL', 0, 60000, 80);  // $6000/yr, $720/yr net
    check('ANNUAL affordable: true', a5.affordable === true);

    const a6 = fe.analyzeAffordability(900000, 'ANNUAL', 0, 60000, 80);  // $9000/yr > $720
    check('ANNUAL unaffordable: false', a6.affordable === false);

    const a7 = fe.analyzeAffordability(100000, 'INVALID', 0, 50000, 80);
    check('invalid frequency: error', a7.error === 'INVALID_FREQUENCY');
}

// ─── Section 7: Trajectories (12) ───────────────────────────────────────────
console.log('Section 7: Trajectories');
{
    const t = fe.projectTrajectories({
        reserveCents:       600000,
        monthlyIncomeCents: 300000,
        monthlyExpenseCents: 200000,
        months:             12,
        incomeVarianceBps:  1000,
        expenseVarianceBps: 500,
        baseConfidence:     80,
    });
    check('isProjection', t.isProjection === true);
    check('expected: infinite (net > 0)', t.expected.infinite === true);
    check('best: infinite', t.best.infinite === true);
    check('confidence = _decay(80,12)', t.confidence === 68);
    check('incomeVarianceBps preserved', t.incomeVarianceBps === 1000);
    check('expenseVarianceBps preserved', t.expenseVarianceBps === 500);

    // Worst-case goes negative in this scenario
    const t2 = fe.projectTrajectories({
        reserveCents:        100000,
        monthlyIncomeCents:  200000,
        monthlyExpenseCents: 190000,
        months:              6,
        incomeVarianceBps:   2000,
        expenseVarianceBps:  1000,
        baseConfidence:      80,
    });
    // worst: income = 200000 - 40000 = 160000, expense = 190000 + 19000 = 209000, net = -49000
    // runway: 100000/49000 → months computed by loop
    check('worst: infinite=false', t2.worst.infinite === false);
    check('best: infinite=true', t2.best.infinite === true);
    check('expected: infinite (net=10000>0)', t2.expected.infinite === true);

    // Zero variance: all three trajectories should match expected
    const t3 = fe.projectTrajectories({
        reserveCents: 100000, monthlyIncomeCents: 100000,
        monthlyExpenseCents: 200000, months: 0,
        incomeVarianceBps: 0, expenseVarianceBps: 0, baseConfidence: 80,
    });
    check('zero-variance: best === expected runwayMonths', t3.best.runwayMonths === t3.expected.runwayMonths);
    check('zero-variance: worst === expected runwayMonths', t3.worst.runwayMonths === t3.expected.runwayMonths);
    check('zero-variance: expected infinite=false (net<0)', t3.expected.infinite === false);
    check('zero-variance: months preserved', t3.months === 0);
}

// ─── Section 8: Scenario creation & branching (16) ──────────────────────────
console.log('Section 8: Scenario creation & branching');
{
    const s1 = se.createScenario('Base Case', { growthRate: 500, inflation: 200 }, {}, 80);
    check('scenarioId format', /^SCN-\d{6}$/.test(s1.scenarioId));
    check('isProjection', s1.isProjection === true);
    check('name preserved', s1.name === 'Base Case');
    check('no missing vars when all provided', s1.missingVariables.length === 0);
    check('hasMissingData = false', s1.hasMissingData === false);
    check('confidence unpenalised', s1.confidence === 80);

    const s2 = se.createScenario('Partial', { growthRate: 500, inflation: null }, {}, 80);
    check('null assumption flagged as missing', s2.missingVariables.includes('inflation'));
    check('hasMissingData = true', s2.hasMissingData === true);
    check('confidence penalised by missing', s2.confidence < 80);

    const s3 = se.createScenario('Zero ok', { reserveCents: 0 }, {}, 80);
    check('zero value NOT missing', s3.missingVariables.length === 0);

    const s4 = se.createScenario('S2', { growthRate: 700 }, {}, 80);
    check('IDs are sequential', s4.scenarioId !== s1.scenarioId);

    const b = se.branchScenario(s1, { growthRate: 600 }, 'Optimistic');
    check('branch: new scenarioId', b.scenarioId !== s1.scenarioId);
    check('branch: parentScenarioId = base', b.parentScenarioId === s1.scenarioId);
    check('branch: branchedFrom = base', b.branchedFrom === s1.scenarioId);
    check('branch: changedAssumptions recorded', b.changedAssumptions.growthRate === 600);
    check('branch: merged assumptions has inflation', b.assumptions.inflation === 200);
    check('branch: name set to branchName', b.name === 'Optimistic');
    check('branch: isProjection', b.isProjection === true);
}

// ─── Section 9: Scenario comparison & sensitivity (12) ──────────────────────
console.log('Section 9: Comparison & sensitivity');
{
    const sA = se.createScenario('Low',  { rate: 100 }, {}, 80);
    const sB = se.createScenario('Mid',  { rate: 200 }, {}, 80);
    const sC = se.createScenario('High', { rate: 300 }, {}, 80);

    const cmp = se.compareScenarios([sA, sB, sC], s => s.assumptions.rate);
    check('compareScenarios: totalScenarios=3', cmp.totalScenarios === 3);
    check('bestScenario has highest rate', cmp.bestScenario.assumptions.rate === 300);
    check('worstScenario has lowest rate', cmp.worstScenario.assumptions.rate === 100);
    check('ranked[0] is best', cmp.ranked[0].metric === 300);
    check('allAssumptionsVisible=true', cmp.allAssumptionsVisible === true);
    check('assumptionDiffs.rate.varies=true', cmp.assumptionDiffs.rate.varies === true);

    const sen = se.identifySensitivity([sA, sC], s => s.assumptions.rate);
    check('identifySensitivity: ok=true', sen.ok === true);
    check('mostSensitive = rate', sen.mostSensitive === 'rate');
    check('metricRange = 200 (300-100)', sen.sensitivities[0].metricRange === 200);
    check('sensitive=true', sen.sensitivities[0].sensitive === true);
    check('sensitiveCount=1', sen.sensitiveCount === 1);

    const errCmp = se.compareScenarios([sA], 'not-a-function');
    check('compareScenarios: error on non-function', errCmp.error === 'METRIC_FN_REQUIRED');
    const errSen = se.identifySensitivity([sA], 'not-a-function');
    check('identifySensitivity: error on non-function', errSen.error === 'METRIC_FN_REQUIRED');
}

// ─── Section 10: Decision support (20) ──────────────────────────────────────
console.log('Section 10: Decision support');
{
    // PROCEED: affordable, no risks
    const d1 = ds.analyzeDecision(
        { amountCents: 50000, frequency: 'ONCE', action: 'buy_item' },
        { reserveCents: 500000, monthlyIncomeCents: 300000, monthlyExpenseCents: 200000 }
    );
    check('PROCEED: isProjection', d1.isProjection === true);
    check('PROCEED: affordable=true', d1.affordable === true);
    check('PROCEED: recommendation=PROCEED', d1.recommendation === 'PROCEED');
    check('PROCEED: missingVariables empty', d1.missingVariables.length === 0);
    check('PROCEED: projectedImpact.reserveAfter=450000', d1.projectedImpact.reserveAfter === 450000);

    // PROCEED_WITH_CARE: affordable but low reserve buffer
    const d2 = ds.analyzeDecision(
        { amountCents: 100000, frequency: 'ONCE' },
        { reserveCents: 200000, monthlyIncomeCents: 300000, monthlyExpenseCents: 200000 }
    );
    check('PROCEED_WITH_CARE: affordable=true', d2.affordable === true);
    check('PROCEED_WITH_CARE: has LOW_RESERVE_BUFFER risk', d2.majorRisks.includes('LOW_RESERVE_BUFFER'));
    check('PROCEED_WITH_CARE: recommendation', d2.recommendation === 'PROCEED_WITH_CARE');

    // DEFER: not affordable but reserve > 0
    const d3 = ds.analyzeDecision(
        { amountCents: 600000, frequency: 'ONCE' },
        { reserveCents: 200000, monthlyIncomeCents: 300000, monthlyExpenseCents: 200000 }
    );
    check('DEFER: affordable=false', d3.affordable === false);
    check('DEFER: recommendation=DEFER', d3.recommendation === 'DEFER');

    // AVOID: not affordable, no reserve
    const d4 = ds.analyzeDecision(
        { amountCents: 600000, frequency: 'ONCE' },
        { reserveCents: 0, monthlyIncomeCents: 0, monthlyExpenseCents: 100000 }
    );
    check('AVOID: recommendation=AVOID', d4.recommendation === 'AVOID');

    // INSUFFICIENT_DATA: 3+ missing variables
    const d5 = ds.analyzeDecision({}, {});
    check('INSUFFICIENT_DATA: recommendation', d5.recommendation === 'INSUFFICIENT_DATA');
    check('INSUFFICIENT_DATA: missingVariables >= 3', d5.missingVariables.length >= 3);

    // MONTHLY frequency: HIGH_INCOME_COMMITMENT risk
    const d6 = ds.analyzeDecision(
        { amountCents: 50000, frequency: 'MONTHLY' },
        { reserveCents: 100000, monthlyIncomeCents: 300000, monthlyExpenseCents: 200000 }
    );
    // net = 100000; 50000 > 100000*0.3 = 30000 → HIGH_INCOME_COMMITMENT
    check('MONTHLY: HIGH_INCOME_COMMITMENT flagged', d6.majorRisks.includes('HIGH_INCOME_COMMITMENT'));

    // ANNUAL frequency: monthly net after = expense + floor(annual/12)
    const d7 = ds.analyzeDecision(
        { amountCents: 120000, frequency: 'ANNUAL' },
        { reserveCents: 500000, monthlyIncomeCents: 300000, monthlyExpenseCents: 200000 }
    );
    // newExpense = 200000 + floor(120000/12) = 200000 + 10000 = 210000
    check('ANNUAL: monthlyNetAfter = 300000-210000 = 90000', d7.projectedImpact.monthlyNetAfter === 90000);

    // Confidence penalised by missing variables
    const d8 = ds.analyzeDecision(
        { amountCents: 50000, frequency: 'MONTHLY', baseConfidence: 80 },
        { reserveCents: null, monthlyIncomeCents: 100000, monthlyExpenseCents: 80000 }
    );
    check('confidence penalised: reserveCents missing', d8.missingVariables.includes('reserveCents'));
    check('confidence = 80 - 1*10 = 70', d8.confidence === 70);

    // Action preserved in result
    const d9 = ds.analyzeDecision(
        { amountCents: 10000, frequency: 'ONCE', action: 'test_action' },
        { reserveCents: 500000, monthlyIncomeCents: 200000, monthlyExpenseCents: 100000 }
    );
    check('action preserved', d9.action === 'test_action');
    check('frequency preserved', d9.frequency === 'ONCE');
    check('recommendationConfidence = confidence', d9.recommendationConfidence === d9.confidence);

    // alternativeInterpretations populated when variables missing
    check('INSUFFICIENT_DATA: alternativeInterpretations populated', d5.alternativeInterpretations.length > 0);

    // Negative monthly net risk
    const d10 = ds.analyzeDecision(
        { amountCents: 10000, frequency: 'ONCE' },
        { reserveCents: 500000, monthlyIncomeCents: 100000, monthlyExpenseCents: 200000 }
    );
    check('NEGATIVE_MONTHLY_NET flagged', d10.majorRisks.includes('NEGATIVE_MONTHLY_NET'));
}

// ─── Section 11: Integer arithmetic invariants (10) ─────────────────────────
console.log('Section 11: Integer arithmetic');
{
    // _intMulDiv: large values should not overflow
    const bigResult = fe._intMulDiv(100000000, 500, 10000);
    check('_intMulDiv: large value = 5000000', bigResult === 5000000);
    check('_intMulDiv: result is integer', Number.isInteger(bigResult));

    // _applyRate: 100000 cents at 100 bps = 1000 cents
    check('_applyRate: 100bps of 100000 = 1000', fe._applyRate(100000, 100) === 1000);
    check('_applyRate: 0bps = 0', fe._applyRate(100000, 0) === 0);
    check('_applyRate: result integer', Number.isInteger(fe._applyRate(99999, 1)));

    // _decay: floor at 5
    check('_decay: floor at 5', fe._decay(80, 200, 0) === 10);    // min(200,70)=70; 80-70=10
    check('_decay: floor when heavy penalty', fe._decay(10, 70, 3) === 5);  // 10-70-30=-90 → 5
    check('_decay: no penalty at 0 months', fe._decay(80, 0, 0) === 80);

    // Income projections: all monthly values must be integers
    const incR = fe.projectIncome(100000, 33, 6, 80);
    check('income: all monthlyValues are integers', incR.monthlyValues.every(mv => Number.isInteger(mv.incomeCents)));

    // Expense projections: all monthly values must be integers
    const expR = fe.projectExpenses(80000, 17, 6, 80);
    check('expense: all monthlyValues are integers', expR.monthlyValues.every(mv => Number.isInteger(mv.expenseCents)));
}

// ─── Section 12: Long-term & incomplete data (14) ───────────────────────────
console.log('Section 12: Long-term & incomplete data');
{
    // 10-year (120-month) income projection
    const r120 = fe.projectIncome(100000, 50, 120, 80);
    check('120-month: monthlyValues.length=120', r120.monthlyValues.length === 120);
    check('120-month: finalCents > base', r120.finalCents > 100000);
    check('120-month: confidence = _decay(80,120) = 10', r120.confidence === 10);  // 80 - min(120,70) = 10
    check('120-month: all values are integers', r120.monthlyValues.every(mv => Number.isInteger(mv.incomeCents)));

    // Confidence floor at 5 (max penalty)
    const lowConf = fe._decay(5, 300, 3);
    check('confidence floor is 5', lowConf === 5);

    // Emergency fund: 10 years of expenses
    const bigFund = fe.modelEmergencyDepletion(12000000, 100000, 80);  // 120 months
    check('big fund: monthsToDepletion=120', bigFund.monthsToDepletion === 120);
    check('big fund: remainderCents=0', bigFund.remainderCents === 0);

    // Debt payoff with interest — totalPaid > balance
    const debtR = fe.forecastDebtPayoff(500000, 20000, 1200, 80);     // $5000, $200/month, 12%
    check('debt with interest: payoffPossible=true', debtR.payoffPossible === true);
    check('debt with interest: totalPaidCents > balance', debtR.totalPaidCents > 500000);
    check('debt with interest: totalInterestCents > 0', debtR.totalInterestCents > 0);
    check('debt: totalPaid = balance + totalInterest', debtR.totalPaidCents === 500000 + debtR.totalInterestCents);

    // Scenario with many missing assumptions
    const sMissing = se.createScenario('Speculative', { a: null, b: null, c: null, d: 100 }, {}, 80);
    check('many missing: confidence penalised', sMissing.confidence < 60);
    check('many missing: missingVariables length=3', sMissing.missingVariables.length === 3);
    check('many missing: hasMissingData=true', sMissing.hasMissingData === true);

    // 3-var missing → INSUFFICIENT_DATA in decision support
    const partialDecision = ds.analyzeDecision(
        { amountCents: 10000 },  // missing: frequency
        { reserveCents: null, monthlyIncomeCents: null }  // missing: reserveCents, monthlyIncomeCents, monthlyExpenseCents
    );
    check('partial decision: INSUFFICIENT_DATA', partialDecision.recommendation === 'INSUFFICIENT_DATA');

    // Sensitivity with identical metrics: metricRange = 0, sensitive = false
    const sX = se.createScenario('X', { rate: 100 }, {}, 80);
    const sY = se.createScenario('Y', { rate: 200 }, {}, 80);
    const senFlat = se.identifySensitivity([sX, sY], () => 42);  // constant metric
    check('flat metric: sensitive=false', senFlat.sensitivities[0].sensitive === false);
    check('flat metric: sensitiveCount=0', senFlat.sensitiveCount === 0);
}

// ─── Results ─────────────────────────────────────────────────────────────────
console.log(`\n${'─'.repeat(50)}`);
console.log(`Phase 42 Forecast & Decision: ${passed}/${total} passed`);

if (passed === total) {
    console.log('Verdict A — all checks passed');
    process.exit(0);
} else {
    console.log(`Verdict B — ${total - passed} check(s) failed`);
    process.exit(1);
}
