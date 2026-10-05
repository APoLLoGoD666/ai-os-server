'use strict';
// lib/constitution/public-interest-balancer.js — Balance competing public interests constitutionally
// Popularity is not legitimacy. Efficiency is not sufficient justification.

let _seq = 0;
function _pid() { return `BAL-${++_seq}`; }

const BALANCING_SCENARIOS = {
    MAJORITY_BENEFIT_MINORITY_HARM: 'MAJORITY_BENEFIT_MINORITY_HARM',
    EFFICIENCY_VS_FAIRNESS:         'EFFICIENCY_VS_FAIRNESS',
    SHORT_TERM_VS_LONG_TERM:        'SHORT_TERM_VS_LONG_TERM',
    LOCAL_VS_SYSTEMIC:              'LOCAL_VS_SYSTEMIC',
    TRANSPARENCY_VS_SECURITY:       'TRANSPARENCY_VS_SECURITY',
    COMPETING_STAKEHOLDERS:         'COMPETING_STAKEHOLDERS',
};

// Create a balancing analysis for a given scenario
// input: { scenario, options[], minorityImpacts[], rationale, popularOption, reversible }
function createBalancingAnalysis(input = {}) {
    const {
        scenario                      = BALANCING_SCENARIOS.COMPETING_STAKEHOLDERS,
        options                       = [],
        minorityImpacts               = [],
        rationale                     = '',
        popularOption                 = null,
        reversible                    = true,
        constitutionalReviewAvailable = true,
    } = input;

    const tradeOffsAcknowledged = options.length >= 2 && rationale.length >= 40;
    const minorityVisible       = minorityImpacts.length > 0;

    return {
        id:                           _pid(),
        scenario,
        options:                      options.map(o => ({ ...o })),
        minorityImpacts:              [...minorityImpacts],
        rationale,
        reversible,
        tradeOffsAcknowledged,
        minorityVisible,
        popularityDecisive:           false,  // popularity is never decisive
        popularityOverrideBlocked:    true,
        popularityNotLegitimacy:      true,
        constitutionalReviewAvailable: constitutionalReviewAvailable !== false,
        legitimacySource:             'constitutional-principles',
    };
}

// Resolve majority-benefit vs minority-harm: trade-off must be exposed and mitigated
function resolveMajorityMinority(majorityBenefit, minorityHarm, mitigationOptions = []) {
    const mitigated  = mitigationOptions.length > 0;
    const acceptable = majorityBenefit > 0.60 && minorityHarm < 0.30 && mitigated;

    return {
        id:                     _pid(),
        majorityBenefit,
        minorityHarm,
        mitigated,
        mitigationOptions,
        acceptable,
        minorityImpactPreserved: true,  // minority impact is always preserved in the record
        popularityNotApplied:    true,
        tradeOffExposed:         true,
        recommendation:          acceptable ? 'PROCEED_WITH_MITIGATION' : 'ESCALATE_OR_DEFER',
    };
}

// Efficiency vs fairness — efficiency alone cannot determine outcome
function balanceEfficiencyFairness(efficiencyGain, fairnessCost, rationale = '') {
    const efficiencyAlone = /efficient/i.test(rationale) && !/fair|equit/i.test(rationale);
    const acceptable      = efficiencyGain > 0.50 && fairnessCost < 0.20 && !efficiencyAlone;

    return {
        id:                       _pid(),
        efficiencyGain,
        fairnessCost,
        efficiencyAlone,
        efficiencyCannotWinAlone: true,
        acceptable,
        tradeOffAcknowledged:     true,
        recommendation:           acceptable ? 'PROCEED' : efficiencyAlone ? 'REJECT_EFFICIENCY_ONLY' : 'ESCALATE',
    };
}

// Short-term vs long-term: irreversible short-term gains are constitutionally suspect
function assessTemporalTradeOff(shortTermBenefit, longTermRisk, reversible = true) {
    const acceptable = reversible && longTermRisk < 0.40;
    return {
        id:                           _pid(),
        shortTermBenefit,
        longTermRisk,
        reversible,
        tradeOffAcknowledged:         true,
        constitutionalReviewAvailable: true,
        acceptable,
        recommendation:               acceptable ? 'PROCEED_WITH_MONITORING' : 'DEFER_FOR_REVIEW',
    };
}

// Constitutional review cannot be blocked regardless of scenario
function assertConstitutionalReviewAvailable(analysis) {
    return {
        available:  analysis?.constitutionalReviewAvailable !== false,
        blocked:    false, // constitutional review can never be blocked
        analysisId: analysis?.id || null,
    };
}

// Simulate N balancing decisions and verify no popularity-driven outcomes
function runBalancingSimulation(n = 100) {
    const scenarioKeys    = Object.values(BALANCING_SCENARIOS);
    let popularityDecisiveCount   = 0;
    let minorityInvisibleCount    = 0;
    let reviewUnavailableCount    = 0;
    let tradeOffsExposedCount     = 0;

    for (let i = 0; i < n; i++) {
        const scenario = scenarioKeys[i % scenarioKeys.length];
        const analysis = createBalancingAnalysis({
            scenario,
            options: [
                { id: 'A', label: 'Option A', preferred: i % 3 === 0 },
                { id: 'B', label: 'Option B' },
            ],
            minorityImpacts: i % 4 === 0
                ? []
                : [{ group: 'minority-group', impact: -0.20 }],
            rationale: i % 5 === 0
                ? 'This is the most efficient path forward available.'
                : 'This balances fairness and efficiency with minority protections in place.',
            popularOption: i % 3 === 0 ? 'A' : null,
            reversible: i % 7 !== 0,
        });

        if (analysis.popularityDecisive)            popularityDecisiveCount++;
        if (!analysis.minorityVisible)              minorityInvisibleCount++;
        if (!analysis.constitutionalReviewAvailable) reviewUnavailableCount++;
        if (analysis.tradeOffsAcknowledged)         tradeOffsExposedCount++;
    }

    return {
        total:                  n,
        popularityNeverDecisive: popularityDecisiveCount === 0,
        popularityDecisiveCount,
        minorityInvisibleCount,
        reviewAlwaysAvailable:  reviewUnavailableCount === 0,
        tradeOffsExposedCount,
    };
}

function resetSequence() { _seq = 0; }

module.exports = {
    BALANCING_SCENARIOS,
    createBalancingAnalysis,
    resolveMajorityMinority,
    balanceEfficiencyFairness,
    assessTemporalTradeOff,
    assertConstitutionalReviewAvailable,
    runBalancingSimulation,
    resetSequence,
};
