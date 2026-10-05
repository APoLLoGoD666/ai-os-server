'use strict';
// lib/executive/financial-attention-scorer.js
// Augments attention candidates with economic scoring from the CFO layer.
// Financial influence is additive/multiplicative — never replaces existing attention signals.
// MAX_INFLUENCE caps total financial contribution at 30%.
// LOW_CONFIDENCE_THRESHOLD prevents financial uncertainty from elevating priority.

const cfo = require('./cfo');

const LOW_CONFIDENCE_THRESHOLD = 0.25; // below this, financial data cannot elevate priority
const MAX_INFLUENCE            = 0.30; // financial layer contributes at most 30% to attention weight
const MAX_RUNWAY_MONTHS        = 120;  // normalisation ceiling for runway month calculations

const RECOMMENDATION_EFFICIENCY = {
    PROCEED:           1.0,
    PROCEED_WITH_CARE: 0.7,
    DEFER:             0.35,
    AVOID:             0.05,
    INSUFFICIENT_DATA: 0.5,
};

const TYPE_URGENCY_HINT = {
    REVENUE:     0.80,
    COST_CUT:    0.70,
    INVESTMENT:  0.60,
    OPERATIONAL: 0.50,
    MAINTENANCE: 0.30,
    RESEARCH:    0.25,
};

function _clamp(v, lo, hi) {
    return Math.min(hi, Math.max(lo, v));
}

function _normConf(c) {
    return _clamp((c || 0) / 100, 0, 1);
}

// financialImpactScore — magnitude of financial consequence (0 = trivial, 1 = enormous)
function _financialImpactScore(candidate, financialState) {
    const reserve = Math.trunc(financialState.reserveCents || 0);
    const income  = Math.trunc(financialState.monthlyIncomeCents || 0);
    const amount  = Math.trunc(
        candidate.assumptions?.amountCents ?? candidate.estimatedEffort ?? 0
    );

    if (amount <= 0) return 0.5;
    const base = Math.max(reserve, income * 12);
    if (base <= 0) return 0.5;
    return _clamp(amount / base, 0, 1);
}

// runwayImpactScore — 0 = harms runway severely, 1 = greatly extends runway, 0.5 = neutral
function _runwayImpactScore(projectedImpact) {
    if (!projectedImpact) return 0.5;
    const impact = projectedImpact.runwayImpact; // scalar months gained (+) or lost (-)
    if (impact === null || impact === undefined) return 0.5;
    return _clamp(0.5 + impact / MAX_RUNWAY_MONTHS, 0, 1);
}

// capitalEfficiencyScore — quality of capital deployment based on CFO recommendation
function _capitalEfficiencyScore(evalResult) {
    if (!evalResult) return 0.5;
    const rec = evalResult.recommendation || 'INSUFFICIENT_DATA';
    return RECOMMENDATION_EFFICIENCY[rec] ?? 0.5;
}

// confidenceScore — gates all other dimensions (0 = no data, 1 = full confidence)
function _confidenceScore(evalResult, candidate, financialState) {
    if (!evalResult) {
        const hasSomeData = financialState.reserveCents != null || financialState.monthlyIncomeCents != null;
        return hasSomeData ? 0.40 : 0.15;
    }
    let conf = _normConf(evalResult.confidence);
    // Additional penalty for missing assumptions in the candidate itself
    const candidateMissing = Object.values(candidate.assumptions || {}).filter(v => v == null).length;
    conf = _clamp(conf - candidateMissing * 0.05, 0, 1);
    return conf;
}

// economicUrgencyScore — how urgently do economics demand action now?
function _economicUrgencyScore(candidate, evalResult) {
    let score = TYPE_URGENCY_HINT[candidate.type] ?? 0.40;

    if (!evalResult) return score;

    const runwayBefore = evalResult.projectedImpact?.runwayMonthsBefore;
    if (runwayBefore !== null && runwayBefore !== undefined) {
        if (runwayBefore < 3)       score = Math.max(score, 0.90);
        else if (runwayBefore < 6)  score = Math.max(score, 0.75);
        else if (runwayBefore < 12) score = Math.max(score, 0.60);
    }

    const risks = evalResult.majorRisks || [];
    if (risks.includes('UNAFFORDABLE'))          score = Math.max(score, 0.85);
    if (risks.includes('NEGATIVE_MONTHLY_NET'))  score = Math.max(score, 0.80);

    // Contradictions signal uncertainty — dampen urgency when present
    if ((evalResult.contradictions || []).length > 0) score = Math.min(score, 0.70);

    return _clamp(score, 0, 1);
}

function _buildRationale(candidate, scores, evalResult) {
    const parts = [];
    if (evalResult) {
        parts.push(`Recommendation: ${evalResult.recommendation} (confidence: ${Math.round(scores.confidenceScore * 100)}%)`);
        if ((evalResult.majorRisks || []).length > 0)
            parts.push(`Risks: ${evalResult.majorRisks.join(', ')}`);
        if ((evalResult.contradictions || []).length > 0)
            parts.push(`Contradictions: ${evalResult.contradictions.length} detected`);
    }
    parts.push(`Economic urgency: ${Math.round(scores.economicUrgencyScore * 100)}%, capital efficiency: ${Math.round(scores.capitalEfficiencyScore * 100)}%`);
    if (scores.confidenceScore < LOW_CONFIDENCE_THRESHOLD)
        parts.push('LOW CONFIDENCE — financial layer cannot elevate priority');
    return parts.join('. ');
}

function _missingEvidence(candidate, evalResult) {
    const missing = [];
    if (!evalResult)
        missing.push('No financial state provided — CFO evaluation skipped');
    else
        for (const mv of (evalResult.missingAssumptions || [])) missing.push(`Missing: ${mv}`);

    if (candidate.assumptions?.amountCents == null && candidate.estimatedEffort == null)
        missing.push('No amount or effort estimate — financial impact unquantifiable');
    if (candidate.expectedOutcome == null)
        missing.push('No expected outcome — capital efficiency unmeasured');
    return missing;
}

// Score a single attention candidate against financial reality
// candidate: { candidateId, type, estimatedEffort, expectedOutcome, assumptions, existingPriority }
// opts:      { financialState, baseConfidence, projectionMonths, cfoOptions }
function scoreCandidate(candidate = {}, opts = {}) {
    const financialState   = opts.financialState || {};
    const baseConfidence   = opts.baseConfidence || 80;
    const existingPriority = candidate.existingPriority != null ? candidate.existingPriority : 0.5;

    const hasFinancialState = financialState.reserveCents != null
        || financialState.monthlyIncomeCents != null
        || financialState.monthlyExpenseCents != null;

    let evalResult = null;
    if (hasFinancialState) {
        try {
            const decision = {
                action:       candidate.type || candidate.candidateId || 'Attention candidate',
                amountCents:  candidate.assumptions?.amountCents ?? candidate.estimatedEffort ?? 0,
                frequency:    candidate.assumptions?.frequency || 'ONCE',
                assumptions:  candidate.assumptions || {},
                baseConfidence,
            };
            const raw = cfo.evaluateDecision(decision, financialState, {
                baseConfidence,
                projectionMonths: opts.projectionMonths || 12,
                ...(opts.cfoOptions || {}),
            });
            evalResult = {
                recommendation:     raw.recommendation,
                confidence:         raw.confidence,
                majorRisks:         raw.majorRisks         || [],
                contradictions:     raw.contradictions     || [],
                missingAssumptions: raw.missingAssumptions || [],
                evidenceSources:    raw.evidenceSources    || [],
                healthWarnings:     raw.healthWarnings     || [],
                projectedImpact:    raw.runwayImpact       || null,
                affordable:         raw.affordability?.affordable ?? null,
            };
        } catch (_) {
            // CFO evaluation failed — evalResult stays null
        }
    }

    const financialImpactScore   = _financialImpactScore(candidate, financialState);
    const runwayImpactScore      = _runwayImpactScore(evalResult?.projectedImpact);
    const capitalEfficiencyScore = _capitalEfficiencyScore(evalResult);
    const confidenceScore        = _confidenceScore(evalResult, candidate, financialState);
    const economicUrgencyScore   = _economicUrgencyScore(candidate, evalResult);

    const scores = { financialImpactScore, runwayImpactScore, capitalEfficiencyScore, confidenceScore, economicUrgencyScore };

    // Aggregate financial signal — gated by confidence
    const rawSignal      = (financialImpactScore + capitalEfficiencyScore + economicUrgencyScore) / 3;
    const confidenceGate = confidenceScore < LOW_CONFIDENCE_THRESHOLD ? 0 : confidenceScore;
    const financialSignal = rawSignal * confidenceGate;

    // Delta shifts existing priority toward the financial signal, capped at MAX_INFLUENCE
    const delta = (financialSignal - 0.5) * MAX_INFLUENCE * 2; // max range [-0.30, +0.30]

    // Low confidence: can reduce priority but NEVER elevate it
    const allowedDelta = confidenceScore < LOW_CONFIDENCE_THRESHOLD
        ? Math.min(0, delta)  // only allow negative adjustments
        : delta;

    const attentionAllocationWeight = _clamp(existingPriority + allowedDelta, 0, 1);
    const overallPriority           = _clamp(existingPriority + allowedDelta, 0, 1);

    return {
        candidateId:              candidate.candidateId || null,
        overallPriority,
        attentionAllocationWeight,

        financialImpactScore,
        runwayImpactScore,
        capitalEfficiencyScore,
        confidenceScore,
        economicUrgencyScore,

        rationale:           _buildRationale(candidate, scores, evalResult),
        assumptions:         candidate.assumptions || {},
        evidenceReferences:  evalResult?.evidenceSources || [],
        missingEvidence:     _missingEvidence(candidate, evalResult),
        contradictions:      evalResult?.contradictions || [],

        dataQuality: {
            hasCfoEvaluation:   evalResult !== null,
            hasFinancialState,
            confidenceScore,
            healthWarningCount: (evalResult?.healthWarnings || []).length,
            missingVarCount:    (evalResult?.missingAssumptions || []).length,
            dataIsProjection:   true,
        },

        isProjection:              true,
        financialInfluenceCap:     MAX_INFLUENCE,
        lowConfidenceThreshold:    LOW_CONFIDENCE_THRESHOLD,
        existingSignalsPreserved:  true,
        silentElevation:           false,
    };
}

// Score a batch of candidates and return ranked list
function scoreCandidates(candidates = [], opts = {}) {
    const scored = candidates.map(c => scoreCandidate(c, opts));

    const ranked = [...scored].sort((a, b) => {
        const diff = b.attentionAllocationWeight - a.attentionAllocationWeight;
        if (diff !== 0) return diff;
        return (a.candidateId || '') < (b.candidateId || '') ? -1 : 1;
    });

    const missingEvidenceCount = scored.reduce((n, s) => n + s.missingEvidence.length, 0);
    const contradictionCount   = scored.reduce((n, s) => n + s.contradictions.length, 0);
    const avgConfidence        = scored.length > 0
        ? scored.reduce((s, c) => s + c.confidenceScore, 0) / scored.length
        : 0;

    return {
        totalCandidates:        candidates.length,
        ranked,
        avgConfidence,
        missingEvidenceCount,
        contradictionCount,
        maxInfluence:           MAX_INFLUENCE,
        lowConfidenceThreshold: LOW_CONFIDENCE_THRESHOLD,
        allEvidenceVisible:     true,
        silentSuppression:      false,
        isProjection:           true,
    };
}

module.exports = {
    scoreCandidate,
    scoreCandidates,
    LOW_CONFIDENCE_THRESHOLD,
    MAX_INFLUENCE,
};
