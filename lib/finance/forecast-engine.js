'use strict';
// lib/finance/forecast-engine.js — Financial projections using integer arithmetic only
// All money values in integer cents — BigInt for overflow-safe intermediate multiplication

// BigInt-safe multiply-then-divide — avoids JS number overflow on large cent values
function _intMulDiv(a, b, c) {
    const product = BigInt(Math.trunc(a)) * BigInt(Math.trunc(b));
    return Number(product / BigInt(Math.trunc(c)));
}

// Apply a basis-point rate (integer bps) to a cent value; result floored
function _applyRate(cents, bps) {
    return _intMulDiv(cents, bps, 10000);
}

// Confidence decay: integer 0–100, floor 5; penalises time horizon and missing variables
function _decay(base, months, missingVars = 0) {
    const timePenalty    = Math.min(Math.trunc(months),    70);
    const missingPenalty = Math.min(Math.trunc(missingVars) * 10, 30);
    return Math.max(5, Math.trunc(base) - timePenalty - missingPenalty);
}

// Project income growing at a fixed monthly rate (in basis points)
function projectIncome(baseCents, monthlyGrowthBps, months, baseConfidence = 80) {
    const base      = Math.trunc(baseCents);
    const growthBps = Math.trunc(monthlyGrowthBps);
    const n         = Math.trunc(months);

    const monthlyValues = [];
    let current = base;
    for (let m = 1; m <= n; m++) {
        current = current + _applyRate(current, growthBps);
        monthlyValues.push({ month: m, incomeCents: current });
    }

    const finalCents  = n === 0 ? base : monthlyValues[n - 1].incomeCents;
    const totalCents  = monthlyValues.reduce((s, mv) => s + mv.incomeCents, 0);

    return {
        isProjection:     true,
        baseCents:        base,
        monthlyGrowthBps: growthBps,
        months:           n,
        finalCents,
        totalCents,
        monthlyValues,
        confidence:       _decay(baseConfidence, n),
    };
}

// Project expenses growing at a fixed monthly inflation rate (in basis points)
function projectExpenses(baseCents, inflationBps, months, baseConfidence = 80) {
    const base = Math.trunc(baseCents);
    const bps  = Math.trunc(inflationBps);
    const n    = Math.trunc(months);

    const monthlyValues = [];
    let current = base;
    for (let m = 1; m <= n; m++) {
        current = current + _applyRate(current, bps);
        monthlyValues.push({ month: m, expenseCents: current });
    }

    const finalCents = n === 0 ? base : monthlyValues[n - 1].expenseCents;
    const totalCents = monthlyValues.reduce((s, mv) => s + mv.expenseCents, 0);

    return {
        isProjection:  true,
        baseCents:     base,
        inflationBps:  bps,
        months:        n,
        finalCents,
        totalCents,
        monthlyValues,
        confidence:    _decay(baseConfidence, n),
    };
}

// Project financial runway — months until reserve is exhausted given net monthly cash flow
// Returns infinite/accumulating when income meets or exceeds expenses
function projectRunway(reserveCents, monthlyIncomeCents, monthlyExpenseCents, baseConfidence = 80) {
    const reserve = Math.trunc(reserveCents);
    const income  = Math.trunc(monthlyIncomeCents);
    const expense = Math.trunc(monthlyExpenseCents);
    const net     = income - expense;

    if (net >= 0) {
        return {
            isProjection:    true,
            infinite:        true,
            accumulating:    true,
            reserveCents:    reserve,
            monthlyNetCents: net,
            confidence:      _decay(baseConfidence, 0),
        };
    }

    let remaining = reserve;
    let months    = 0;
    while (remaining > 0 && months < 10000) {
        remaining += net;
        months++;
    }

    return {
        isProjection:    true,
        infinite:        false,
        accumulating:    false,
        runwayMonths:    months,
        reserveCents:    reserve,
        monthlyNetCents: net,
        confidence:      _decay(baseConfidence, months),
    };
}

// Model how many months an emergency fund covers at a given monthly expense rate
function modelEmergencyDepletion(fundCents, monthlyExpenseCents, baseConfidence = 80) {
    const fund    = Math.trunc(fundCents);
    const expense = Math.trunc(monthlyExpenseCents);

    if (expense <= 0) {
        return {
            isProjection:        true,
            infinite:            true,
            fundCents:           fund,
            monthlyExpenseCents: expense,
            confidence:          _decay(baseConfidence, 0),
        };
    }

    // Integer floor division: how many complete months before fund is gone
    const monthsToDepletion = Math.floor(fund / expense);
    const remainderCents    = fund - (monthsToDepletion * expense);

    return {
        isProjection:        true,
        infinite:            false,
        monthsToDepletion,
        remainderCents,
        fundCents:           fund,
        monthlyExpenseCents: expense,
        confidence:          _decay(baseConfidence, monthsToDepletion),
    };
}

// Forecast months to pay off a debt given monthly payment and annual rate in basis points
// Returns PAYMENT_BELOW_INTEREST immediately if payment cannot cover accrued interest
function forecastDebtPayoff(balanceCents, monthlyPaymentCents, annualRateBps, baseConfidence = 80) {
    const balance  = Math.trunc(balanceCents);
    const payment  = Math.trunc(monthlyPaymentCents);
    const rateBps  = Math.trunc(annualRateBps);

    let remaining     = balance;
    let totalInterest = 0;
    let months        = 0;

    while (remaining > 0 && months < 12000) {
        // Monthly interest = floor(remaining * annualRateBps / (12 * 10000))
        const interest = _intMulDiv(remaining, rateBps, 12 * 10000);

        // Check BEFORE modifying balance — catches non-convergent payoff
        if (interest >= payment) {
            return {
                isProjection:        true,
                payoffPossible:      false,
                reason:              'PAYMENT_BELOW_INTEREST',
                interestCents:       interest,
                monthlyPaymentCents: payment,
                remainingCents:      remaining,
                months,
                confidence:          _decay(baseConfidence, months),
            };
        }

        const principal = payment - interest;
        totalInterest  += interest;
        remaining       = Math.max(0, remaining - principal);
        months++;
    }

    return {
        isProjection:        true,
        payoffPossible:      true,
        months,
        totalInterestCents:  totalInterest,
        totalPaidCents:      balance + totalInterest,
        balanceCents:        balance,
        monthlyPaymentCents: payment,
        annualRateBps:       rateBps,
        confidence:          _decay(baseConfidence, months),
    };
}

// Compare cumulative savings over N months with and without an additional monthly amount
function modelSavingsAcceleration(currentSavingsCents, additionalCents, months, baseConfidence = 80) {
    const current    = Math.trunc(currentSavingsCents);
    const additional = Math.trunc(additionalCents);
    const n          = Math.trunc(months);

    const baseTotalCents        = current * n;
    const acceleratedMonthly    = current + additional;
    const acceleratedTotalCents = acceleratedMonthly * n;
    const accelerationGainCents = additional * n;

    return {
        isProjection:            true,
        currentMonthlyCents:     current,
        additionalMonthlyCents:  additional,
        acceleratedMonthlyCents: acceleratedMonthly,
        months:                  n,
        baseTotalCents,
        acceleratedTotalCents,
        accelerationGainCents,
        confidence:              _decay(baseConfidence, n),
    };
}

// Estimate months to reach a savings goal given monthly contributions and compound growth
function estimateGoalCompletion(targetCents, currentCents, monthlySavingsCents, monthlyGrowthBps, baseConfidence = 80) {
    const target    = Math.trunc(targetCents);
    const current   = Math.trunc(currentCents);
    const monthly   = Math.trunc(monthlySavingsCents);
    const growthBps = Math.trunc(monthlyGrowthBps);

    if (current >= target) {
        return {
            isProjection:   true,
            alreadyReached: true,
            months:         0,
            currentCents:   current,
            targetCents:    target,
            confidence:     _decay(baseConfidence, 0),
        };
    }

    let accumulated = current;
    let months      = 0;

    while (accumulated < target && months < 12000) {
        accumulated += _applyRate(accumulated, growthBps);
        accumulated += monthly;
        months++;
    }

    return {
        isProjection:        true,
        alreadyReached:      false,
        months,
        currentCents:        current,
        targetCents:         target,
        finalCents:          accumulated,
        monthlySavingsCents: monthly,
        monthlyGrowthBps:    growthBps,
        confidence:          _decay(baseConfidence, months),
    };
}

// Assess whether a proposed expenditure is affordable given frequency and current finances
// frequency: 'ONCE' | 'MONTHLY' | 'ANNUAL'
function analyzeAffordability(proposedCents, frequency, reserveCents, monthlyNetCents, baseConfidence = 80) {
    const proposed   = Math.trunc(proposedCents);
    const reserve    = Math.trunc(reserveCents);
    const monthlyNet = Math.trunc(monthlyNetCents);

    let affordable, impactNote;

    if (frequency === 'ONCE') {
        affordable = proposed <= reserve;
        impactNote = affordable ? 'reserve_sufficient' : 'reserve_insufficient';
    } else if (frequency === 'MONTHLY') {
        affordable = proposed <= monthlyNet;
        impactNote = affordable ? 'within_monthly_net' : 'exceeds_monthly_net';
    } else if (frequency === 'ANNUAL') {
        const annualNet = monthlyNet * 12;
        affordable = proposed <= annualNet;
        impactNote = affordable ? 'within_annual_net' : 'exceeds_annual_net';
    } else {
        return { ok: false, error: 'INVALID_FREQUENCY', isProjection: true };
    }

    return {
        isProjection:    true,
        proposedCents:   proposed,
        frequency,
        reserveCents:    reserve,
        monthlyNetCents: monthlyNet,
        affordable,
        impactNote,
        confidence:      _decay(baseConfidence, 0),
    };
}

// Project best / expected / worst trajectories using income and expense variance in basis points
// params: { reserveCents, monthlyIncomeCents, monthlyExpenseCents, months,
//           incomeVarianceBps, expenseVarianceBps, baseConfidence }
function projectTrajectories(params = {}) {
    const {
        reserveCents,
        monthlyIncomeCents,
        monthlyExpenseCents,
        months         = 0,
        incomeVarianceBps  = 0,
        expenseVarianceBps = 0,
        baseConfidence = 80,
    } = params;

    // Build a runway projection with signed income/expense adjustments
    function _project(incomeDeltaBps, expenseDeltaBps) {
        const income  = Math.trunc(monthlyIncomeCents)  + _intMulDiv(monthlyIncomeCents,  incomeDeltaBps,  10000);
        const expense = Math.trunc(monthlyExpenseCents) + _intMulDiv(monthlyExpenseCents, expenseDeltaBps, 10000);
        return projectRunway(reserveCents, income, expense, baseConfidence);
    }

    return {
        isProjection:      true,
        months:            Math.trunc(months),
        expected:          projectRunway(reserveCents, monthlyIncomeCents, monthlyExpenseCents, baseConfidence),
        best:              _project( incomeVarianceBps, -expenseVarianceBps),
        worst:             _project(-incomeVarianceBps,  expenseVarianceBps),
        incomeVarianceBps,
        expenseVarianceBps,
        confidence:        _decay(baseConfidence, Math.trunc(months)),
    };
}

module.exports = {
    _intMulDiv,
    _applyRate,
    _decay,
    projectIncome,
    projectExpenses,
    projectRunway,
    modelEmergencyDepletion,
    forecastDebtPayoff,
    modelSavingsAcceleration,
    estimateGoalCompletion,
    analyzeAffordability,
    projectTrajectories,
};
