'use strict';
// lib/finance/decision-support.js — Structured decision analysis with explicit assumptions
// Imports integer-cent helpers from forecast-engine; no floating-point money arithmetic

const {
    analyzeAffordability,
    projectRunway,
    _decay,
} = require('./forecast-engine');

const RECOMMENDATION_LEVELS = {
    PROCEED:           'PROCEED',
    PROCEED_WITH_CARE: 'PROCEED_WITH_CARE',
    DEFER:             'DEFER',
    AVOID:             'AVOID',
    INSUFFICIENT_DATA: 'INSUFFICIENT_DATA',
};

// Null/undefined means missing; 0 is valid (e.g. no reserve is still a value)
function _detectMissingVars(decision, state) {
    const missing = [];
    const flag = (name, val) => { if (val === null || val === undefined) missing.push(name); };
    flag('amountCents',         decision.amountCents);
    flag('frequency',           decision.frequency);
    flag('reserveCents',        state.reserveCents);
    flag('monthlyIncomeCents',  state.monthlyIncomeCents);
    flag('monthlyExpenseCents', state.monthlyExpenseCents);
    return missing;
}

function _majorRisks(decision, state, affordable) {
    const risks      = [];
    const reserve    = Math.trunc(state.reserveCents        || 0);
    const amount     = Math.trunc(decision.amountCents      || 0);
    const income     = Math.trunc(state.monthlyIncomeCents  || 0);
    const expense    = Math.trunc(state.monthlyExpenseCents || 0);
    const net        = income - expense;
    const freq       = decision.frequency;

    if (!affordable)                                           risks.push('UNAFFORDABLE');
    if (net < 0)                                               risks.push('NEGATIVE_MONTHLY_NET');
    if (freq === 'ONCE'    && reserve < amount * 3)            risks.push('LOW_RESERVE_BUFFER');
    if (freq === 'MONTHLY' && net > 0 && amount > net * 0.3)  risks.push('HIGH_INCOME_COMMITMENT');

    return risks;
}

// Analyse a financial decision against the current state
// decision: { action, amountCents, frequency, assumptions, baseConfidence }
// state:    { reserveCents, monthlyIncomeCents, monthlyExpenseCents }
function analyzeDecision(decision = {}, state = {}) {
    const missingVariables = _detectMissingVars(decision, state);

    const reserveCents        = Math.trunc(state.reserveCents        || 0);
    const monthlyIncomeCents  = Math.trunc(state.monthlyIncomeCents  || 0);
    const monthlyExpenseCents = Math.trunc(state.monthlyExpenseCents || 0);
    const amountCents         = Math.trunc(decision.amountCents      || 0);
    const frequency           = decision.frequency || 'ONCE';
    const baseConfidence      = decision.baseConfidence !== undefined ? decision.baseConfidence : 80;

    const monthlyNetCents = monthlyIncomeCents - monthlyExpenseCents;

    const runwayBefore  = projectRunway(reserveCents, monthlyIncomeCents, monthlyExpenseCents, baseConfidence);
    const affordability = analyzeAffordability(amountCents, frequency, reserveCents, monthlyNetCents, baseConfidence);
    const affordable    = affordability.affordable;

    // Compute post-decision reserve and expense
    let newReserveCents  = reserveCents;
    let newExpenseCents  = monthlyExpenseCents;

    if (frequency === 'ONCE') {
        newReserveCents = reserveCents - amountCents;
    } else if (frequency === 'MONTHLY') {
        newExpenseCents = monthlyExpenseCents + amountCents;
    } else if (frequency === 'ANNUAL') {
        newExpenseCents = monthlyExpenseCents + Math.floor(amountCents / 12);
    }

    const runwayAfter      = projectRunway(Math.max(0, newReserveCents), monthlyIncomeCents, newExpenseCents, baseConfidence);
    const monthlyNetAfter  = monthlyIncomeCents - newExpenseCents;
    const reserveAfter     = Math.max(0, newReserveCents);

    const runwayMonthsBefore = runwayBefore.infinite ? null : (runwayBefore.runwayMonths || 0);
    const runwayMonthsAfter  = runwayAfter.infinite  ? null : (runwayAfter.runwayMonths  || 0);
    const runwayImpact       = (runwayMonthsBefore !== null && runwayMonthsAfter !== null)
        ? runwayMonthsAfter - runwayMonthsBefore
        : null;

    const majorRisks = _majorRisks(decision, state, affordable);

    let recommendation;
    if (missingVariables.length >= 3) {
        recommendation = RECOMMENDATION_LEVELS.INSUFFICIENT_DATA;
    } else if (affordable && majorRisks.length === 0) {
        recommendation = RECOMMENDATION_LEVELS.PROCEED;
    } else if (affordable && majorRisks.length <= 2) {
        recommendation = RECOMMENDATION_LEVELS.PROCEED_WITH_CARE;
    } else if (!affordable && reserveCents > 0) {
        recommendation = RECOMMENDATION_LEVELS.DEFER;
    } else {
        recommendation = RECOMMENDATION_LEVELS.AVOID;
    }

    const confidence = _decay(baseConfidence, 0, missingVariables.length);

    return {
        action:           decision.action || null,
        amountCents,
        frequency,
        affordable,
        projectedImpact: {
            runwayMonthsBefore,
            runwayMonthsAfter,
            runwayImpact,
            reserveAfter,
            monthlyNetAfter,
        },
        confidence,
        assumptionsUsed:            decision.assumptions || {},
        missingVariables,
        majorRisks,
        alternativeInterpretations: missingVariables.length > 0
            ? ['Missing data may change outcome'] : [],
        recommendation,
        recommendationConfidence:   confidence,
        isProjection:               true,
    };
}

module.exports = {
    RECOMMENDATION_LEVELS,
    analyzeDecision,
};
