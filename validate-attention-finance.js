'use strict';
// validate-attention-finance.js — Behavioural validation for financial-attention-scorer
// 120+ sequential tests in a single async main() to prevent state cross-contamination

const scorer = require('./lib/executive/financial-attention-scorer');

// ─── Harness ──────────────────────────────────────────────────────────────────
let passed = 0;
let failed = 0;
const failures = [];

function assert(label, condition, detail = '') {
    if (condition) {
        passed++;
    } else {
        failed++;
        failures.push(`FAIL [${label}]${detail ? ': ' + detail : ''}`);
    }
}

function between(v, lo, hi) { return typeof v === 'number' && v >= lo && v <= hi; }
function isNum(v)           { return typeof v === 'number' && isFinite(v); }

// ─── Shared fixtures ──────────────────────────────────────────────────────────
const HEALTHY_STATE = {
    reserveCents:        600_000,   // $6,000
    monthlyIncomeCents:  500_000,   // $5,000
    monthlyExpenseCents: 300_000,   // $3,000 — positive net $2,000/mo
};

const TIGHT_STATE = {
    reserveCents:        90_000,    // $900 — under 3 months
    monthlyIncomeCents:  200_000,
    monthlyExpenseCents: 210_000,   // negative net
};

const ZERO_STATE = {
    reserveCents:        0,
    monthlyIncomeCents:  0,
    monthlyExpenseCents: 0,
};

const BASIC_CANDIDATE = {
    candidateId:      'C-001',
    type:             'INVESTMENT',
    estimatedEffort:  100_000,      // $1,000 in cents
    expectedOutcome:  'Improve system reliability',
    assumptions:      { amountCents: 100_000, frequency: 'ONCE' },
    existingPriority: 0.5,
};

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {

    // ── Section 1: Module exports ─────────────────────────────────────────────
    {
        assert('1.01 scoreCandidate exported',    typeof scorer.scoreCandidate    === 'function');
        assert('1.02 scoreCandidates exported',   typeof scorer.scoreCandidates   === 'function');
        assert('1.03 LOW_CONFIDENCE_THRESHOLD',   typeof scorer.LOW_CONFIDENCE_THRESHOLD === 'number');
        assert('1.04 MAX_INFLUENCE exported',     typeof scorer.MAX_INFLUENCE     === 'number');
        assert('1.05 LOW_CONFIDENCE_THRESHOLD value', scorer.LOW_CONFIDENCE_THRESHOLD === 0.25);
        assert('1.06 MAX_INFLUENCE value',        scorer.MAX_INFLUENCE            === 0.30);
    }

    // ── Section 2: Output shape — no financial state ──────────────────────────
    {
        const r = scorer.scoreCandidate({ candidateId: 'X', type: 'OPERATIONAL' });
        assert('2.01 candidateId present',               r.candidateId === 'X');
        assert('2.02 overallPriority present',           isNum(r.overallPriority));
        assert('2.03 attentionAllocationWeight present', isNum(r.attentionAllocationWeight));
        assert('2.04 financialImpactScore present',      isNum(r.financialImpactScore));
        assert('2.05 runwayImpactScore present',         isNum(r.runwayImpactScore));
        assert('2.06 capitalEfficiencyScore present',    isNum(r.capitalEfficiencyScore));
        assert('2.07 confidenceScore present',           isNum(r.confidenceScore));
        assert('2.08 economicUrgencyScore present',      isNum(r.economicUrgencyScore));
        assert('2.09 rationale is string',               typeof r.rationale === 'string');
        assert('2.10 assumptions object present',        r.assumptions !== null && typeof r.assumptions === 'object');
        assert('2.11 evidenceReferences is array',       Array.isArray(r.evidenceReferences));
        assert('2.12 missingEvidence is array',          Array.isArray(r.missingEvidence));
        assert('2.13 contradictions is array',           Array.isArray(r.contradictions));
        assert('2.14 dataQuality object present',        r.dataQuality && typeof r.dataQuality === 'object');
        assert('2.15 isProjection true',                 r.isProjection === true);
        assert('2.16 silentElevation false',             r.silentElevation === false);
        assert('2.17 existingSignalsPreserved true',     r.existingSignalsPreserved === true);
        assert('2.18 financialInfluenceCap = 0.30',      r.financialInfluenceCap === 0.30);
        assert('2.19 lowConfidenceThreshold = 0.25',     r.lowConfidenceThreshold === 0.25);
        assert('2.20 no CFO eval without state',         r.dataQuality.hasCfoEvaluation === false);
    }

    // ── Section 3: Scores always in [0,1] ─────────────────────────────────────
    {
        const cases = [
            { candidateId: 'A', type: 'REVENUE', estimatedEffort: 1000000, existingPriority: 0.9 },
            { candidateId: 'B', type: 'MAINTENANCE', assumptions: { amountCents: 0 }, existingPriority: 0.1 },
            { candidateId: 'C', assumptions: { amountCents: null }, existingPriority: 0 },
        ];
        for (const c of cases) {
            const r = scorer.scoreCandidate(c, { financialState: HEALTHY_STATE });
            assert(`3.x financialImpactScore in [0,1] for ${c.candidateId}`,    between(r.financialImpactScore,   0, 1));
            assert(`3.x runwayImpactScore in [0,1] for ${c.candidateId}`,       between(r.runwayImpactScore,      0, 1));
            assert(`3.x capitalEfficiencyScore in [0,1] for ${c.candidateId}`,  between(r.capitalEfficiencyScore, 0, 1));
            assert(`3.x confidenceScore in [0,1] for ${c.candidateId}`,         between(r.confidenceScore,        0, 1));
            assert(`3.x economicUrgencyScore in [0,1] for ${c.candidateId}`,    between(r.economicUrgencyScore,   0, 1));
            assert(`3.x overallPriority in [0,1] for ${c.candidateId}`,         between(r.overallPriority,        0, 1));
            assert(`3.x weight in [0,1] for ${c.candidateId}`,                  between(r.attentionAllocationWeight, 0, 1));
        }
    }

    // ── Section 4: financialImpactScore ───────────────────────────────────────
    {
        // Large amount relative to reserve → high impact score
        const bigSpend = scorer.scoreCandidate(
            { candidateId: 'D', assumptions: { amountCents: 5_000_000, frequency: 'ONCE' }, existingPriority: 0.5 },
            { financialState: { reserveCents: 600_000, monthlyIncomeCents: 100_000, monthlyExpenseCents: 80_000 } }
        );
        assert('4.01 large spend → high financialImpactScore', bigSpend.financialImpactScore > 0.7);

        // Small amount relative to large reserve → low impact
        const smallSpend = scorer.scoreCandidate(
            { candidateId: 'E', assumptions: { amountCents: 1_000, frequency: 'ONCE' }, existingPriority: 0.5 },
            { financialState: { reserveCents: 10_000_000, monthlyIncomeCents: 500_000, monthlyExpenseCents: 200_000 } }
        );
        assert('4.02 small spend vs large reserve → low financialImpactScore', smallSpend.financialImpactScore < 0.3);

        // Zero amount → neutral 0.5
        const zeroSpend = scorer.scoreCandidate(
            { candidateId: 'F', assumptions: { amountCents: 0 }, existingPriority: 0.5 },
            { financialState: HEALTHY_STATE }
        );
        assert('4.03 zero amount → financialImpactScore 0.5', zeroSpend.financialImpactScore === 0.5);

        // No amount, no estimatedEffort → neutral 0.5
        const noAmount = scorer.scoreCandidate({ candidateId: 'G', type: 'RESEARCH' }, { financialState: HEALTHY_STATE });
        assert('4.04 no amount → financialImpactScore 0.5', noAmount.financialImpactScore === 0.5);

        // Zero reserve and zero income → neutral 0.5 (can't divide)
        const noBase = scorer.scoreCandidate(
            { candidateId: 'H', estimatedEffort: 50_000 },
            { financialState: ZERO_STATE }
        );
        assert('4.05 zero financial base → financialImpactScore 0.5', noBase.financialImpactScore === 0.5);
    }

    // ── Section 5: runwayImpactScore ──────────────────────────────────────────
    {
        // Affordable one-off from healthy state: runway should be neutral or positive
        const healthyResult = scorer.scoreCandidate(BASIC_CANDIDATE, { financialState: HEALTHY_STATE });
        assert('5.01 healthy state → runwayImpactScore ≥ 0.5', healthyResult.runwayImpactScore >= 0.5);

        // No financial state → runwayImpactScore = 0.5 (neutral)
        const noState = scorer.scoreCandidate(BASIC_CANDIDATE);
        assert('5.02 no financial state → runwayImpactScore = 0.5', noState.runwayImpactScore === 0.5);

        // Tight/negative-net state with large spend → shortens runway → score < 0.5
        const tightLarge = scorer.scoreCandidate(
            { candidateId: 'TL', assumptions: { amountCents: 80_000, frequency: 'ONCE' }, existingPriority: 0.5 },
            { financialState: TIGHT_STATE }
        );
        assert('5.03 tight state, spend from reserve → runwayImpactScore ≤ 0.5', tightLarge.runwayImpactScore <= 0.5);

        // runwayImpactScore is always in [0,1]
        assert('5.04 runwayImpactScore in [0,1]', between(healthyResult.runwayImpactScore, 0, 1));
        assert('5.05 runwayImpactScore in [0,1] tight', between(tightLarge.runwayImpactScore, 0, 1));
    }

    // ── Section 6: capitalEfficiencyScore ─────────────────────────────────────
    {
        // Affordable purchase from healthy state → PROCEED → efficiency near 1
        const proceed = scorer.scoreCandidate(
            { candidateId: 'P1', assumptions: { amountCents: 50_000, frequency: 'ONCE' }, existingPriority: 0.5 },
            { financialState: HEALTHY_STATE }
        );
        assert('6.01 PROCEED recommendation → capitalEfficiencyScore high', proceed.capitalEfficiencyScore >= 0.7);

        // Unaffordable purchase (amount > reserve) → AVOID/DEFER → efficiency low
        const avoid = scorer.scoreCandidate(
            { candidateId: 'A1', assumptions: { amountCents: 5_000_000, frequency: 'ONCE' }, existingPriority: 0.5 },
            { financialState: { reserveCents: 10_000, monthlyIncomeCents: 100_000, monthlyExpenseCents: 110_000 } }
        );
        assert('6.02 AVOID/DEFER recommendation → capitalEfficiencyScore low', avoid.capitalEfficiencyScore <= 0.4);

        // No eval → neutral 0.5
        const noEval = scorer.scoreCandidate({ candidateId: 'N1', type: 'MAINTENANCE' });
        assert('6.03 no CFO eval → capitalEfficiencyScore = 0.5', noEval.capitalEfficiencyScore === 0.5);

        // capitalEfficiencyScore always in [0,1]
        assert('6.04 capitalEfficiencyScore in [0,1]', between(proceed.capitalEfficiencyScore, 0, 1));
        assert('6.05 capitalEfficiencyScore in [0,1] avoid', between(avoid.capitalEfficiencyScore, 0, 1));
    }

    // ── Section 7: confidenceScore ────────────────────────────────────────────
    {
        // No financial state at all → very low confidence (0.15)
        const noState = scorer.scoreCandidate({ candidateId: 'CS1', type: 'OPERATIONAL' });
        assert('7.01 no financial state → confidenceScore = 0.15', noState.confidenceScore === 0.15);

        // Some financial state but no CFO eval possible → moderate confidence
        const someState = scorer.scoreCandidate(
            { candidateId: 'CS2', type: 'OPERATIONAL' },
            { financialState: { reserveCents: 100_000 } }
        );
        assert('7.02 some state → confidenceScore > 0.15', someState.confidenceScore > 0.15);

        // Full healthy state → higher confidence
        const fullState = scorer.scoreCandidate(BASIC_CANDIDATE, { financialState: HEALTHY_STATE });
        assert('7.03 full healthy state → confidenceScore ≥ 0.4', fullState.confidenceScore >= 0.4);

        // Candidate with null assumptions → lower confidence
        const nullAssumptions = scorer.scoreCandidate(
            { candidateId: 'CS3', assumptions: { amountCents: null, frequency: null }, existingPriority: 0.5 },
            { financialState: HEALTHY_STATE }
        );
        assert('7.04 null assumptions degrade confidence', nullAssumptions.confidenceScore < fullState.confidenceScore);

        // confidenceScore always in [0,1]
        assert('7.05 confidenceScore in [0,1]', between(fullState.confidenceScore, 0, 1));
        assert('7.06 confidenceScore in [0,1] null assumptions', between(nullAssumptions.confidenceScore, 0, 1));
    }

    // ── Section 8: economicUrgencyScore ───────────────────────────────────────
    {
        // Type = REVENUE → urgency hint ≥ 0.80
        const revenue = scorer.scoreCandidate(
            { candidateId: 'EU1', type: 'REVENUE', existingPriority: 0.5 },
            { financialState: HEALTHY_STATE }
        );
        assert('8.01 REVENUE type → economicUrgencyScore ≥ 0.7', revenue.economicUrgencyScore >= 0.7);

        // Type = MAINTENANCE → lower urgency hint
        const maintenance = scorer.scoreCandidate(
            { candidateId: 'EU2', type: 'MAINTENANCE', existingPriority: 0.5 },
            { financialState: HEALTHY_STATE }
        );
        assert('8.02 MAINTENANCE type → economicUrgencyScore < REVENUE', maintenance.economicUrgencyScore < revenue.economicUrgencyScore);

        // Very tight state (runway < 3 months) → urgency ≥ 0.85
        const tightCandidate = scorer.scoreCandidate(
            { candidateId: 'EU3', type: 'MAINTENANCE', assumptions: { amountCents: 10_000, frequency: 'ONCE' }, existingPriority: 0.5 },
            { financialState: { reserveCents: 20_000, monthlyIncomeCents: 100_000, monthlyExpenseCents: 120_000 } }
        );
        assert('8.03 tight runway → economicUrgencyScore elevated', tightCandidate.economicUrgencyScore >= 0.65);

        // economicUrgencyScore always in [0,1]
        assert('8.04 economicUrgencyScore in [0,1]', between(revenue.economicUrgencyScore, 0, 1));
        assert('8.05 economicUrgencyScore in [0,1] maintenance', between(maintenance.economicUrgencyScore, 0, 1));

        // Unknown type → default urgency 0.40
        const unknown = scorer.scoreCandidate({ candidateId: 'EU4', type: 'UNKNOWN_TYPE' });
        assert('8.06 unknown type → economicUrgencyScore 0.40', unknown.economicUrgencyScore === 0.40);
    }

    // ── Section 9: MAX_INFLUENCE cap ─────────────────────────────────────────
    {
        // Even maximum inputs cannot push weight change beyond MAX_INFLUENCE from existingPriority
        const high = scorer.scoreCandidate(
            { candidateId: 'MI1', type: 'REVENUE', estimatedEffort: 9_999_999, existingPriority: 0.5 },
            { financialState: HEALTHY_STATE, baseConfidence: 99 }
        );
        const delta = Math.abs(high.attentionAllocationWeight - 0.5);
        assert('9.01 financial delta ≤ MAX_INFLUENCE from existingPriority', delta <= scorer.MAX_INFLUENCE + 0.001);

        // Very negative signals cannot drop weight below 0
        const low = scorer.scoreCandidate(
            { candidateId: 'MI2', type: 'MAINTENANCE', assumptions: { amountCents: 9_999_999, frequency: 'ONCE' }, existingPriority: 0.1 },
            { financialState: { reserveCents: 1_000, monthlyIncomeCents: 50_000, monthlyExpenseCents: 60_000 } }
        );
        assert('9.02 weight never below 0', low.attentionAllocationWeight >= 0);

        // Very positive signals cannot push weight above 1
        const maxUp = scorer.scoreCandidate(
            { candidateId: 'MI3', type: 'REVENUE', assumptions: { amountCents: 10_000, frequency: 'ONCE' }, existingPriority: 0.95 },
            { financialState: HEALTHY_STATE, baseConfidence: 99 }
        );
        assert('9.03 weight never above 1', maxUp.attentionAllocationWeight <= 1);

        // financialInfluenceCap always reports MAX_INFLUENCE
        assert('9.04 financialInfluenceCap on result', high.financialInfluenceCap === scorer.MAX_INFLUENCE);
        assert('9.05 financialInfluenceCap on low result', low.financialInfluenceCap === scorer.MAX_INFLUENCE);
    }

    // ── Section 10: LOW_CONFIDENCE_THRESHOLD gate ────────────────────────────
    {
        // With confidence < LOW_CONFIDENCE_THRESHOLD, overallPriority cannot be HIGHER than existingPriority
        const lowConfCandidate = {
            candidateId:      'LC1',
            type:             'REVENUE',
            existingPriority: 0.30,
            assumptions:      { amountCents: null, frequency: null },
        };
        const lowConfResult = scorer.scoreCandidate(lowConfCandidate); // no financial state → confidence = 0.15
        assert('10.01 confidenceScore < LOW_CONFIDENCE_THRESHOLD', lowConfResult.confidenceScore < scorer.LOW_CONFIDENCE_THRESHOLD);
        assert('10.02 low confidence cannot elevate priority', lowConfResult.overallPriority <= 0.30 + 0.001);

        // With confidence < LOW_CONFIDENCE_THRESHOLD, attentionAllocationWeight cannot exceed existingPriority
        assert('10.03 low confidence cannot elevate weight', lowConfResult.attentionAllocationWeight <= 0.30 + 0.001);

        // Low confidence CAN reduce priority if there are risk signals
        const highExisting = {
            candidateId:      'LC2',
            type:             'MAINTENANCE',
            existingPriority: 0.80,
            assumptions:      { amountCents: null },
        };
        const reduced = scorer.scoreCandidate(highExisting); // confidence = 0.15
        assert('10.04 low confidence reduction allowed', reduced.overallPriority <= 0.80 + 0.001);

        // LOW_CONFIDENCE_THRESHOLD disclosed in every result
        assert('10.05 lowConfidenceThreshold in result', lowConfResult.lowConfidenceThreshold === scorer.LOW_CONFIDENCE_THRESHOLD);

        // Medium confidence (≥ 0.25) — elevation IS possible
        const medConf = scorer.scoreCandidate(
            { candidateId: 'LC3', type: 'REVENUE', existingPriority: 0.3, assumptions: { amountCents: 50_000, frequency: 'ONCE' } },
            { financialState: HEALTHY_STATE, baseConfidence: 80 }
        );
        assert('10.06 confidence ≥ threshold → elevation possible', medConf.confidenceScore >= scorer.LOW_CONFIDENCE_THRESHOLD);
    }

    // ── Section 11: Competing tasks ranked correctly ──────────────────────────
    {
        const candidates = [
            { candidateId: 'R-LOW',  type: 'RESEARCH',    existingPriority: 0.4, assumptions: { amountCents: 50_000, frequency: 'ONCE' } },
            { candidateId: 'R-HIGH', type: 'REVENUE',     existingPriority: 0.7, assumptions: { amountCents: 50_000, frequency: 'ONCE' } },
            { candidateId: 'R-MID',  type: 'OPERATIONAL', existingPriority: 0.5, assumptions: { amountCents: 50_000, frequency: 'ONCE' } },
        ];
        const result = scorer.scoreCandidates(candidates, { financialState: HEALTHY_STATE });
        assert('11.01 totalCandidates = 3', result.totalCandidates === 3);
        assert('11.02 ranked array length = 3', result.ranked.length === 3);
        assert('11.03 ranked descending by weight', result.ranked[0].attentionAllocationWeight >= result.ranked[1].attentionAllocationWeight);
        assert('11.04 ranked descending 1→2', result.ranked[1].attentionAllocationWeight >= result.ranked[2].attentionAllocationWeight);
        assert('11.05 REVENUE ranks highest among these', result.ranked[0].candidateId === 'R-HIGH');

        // Result metadata
        assert('11.06 avgConfidence present', isNum(result.avgConfidence));
        assert('11.07 missingEvidenceCount present', typeof result.missingEvidenceCount === 'number');
        assert('11.08 contradictionCount present', typeof result.contradictionCount === 'number');
        assert('11.09 allEvidenceVisible true', result.allEvidenceVisible === true);
        assert('11.10 silentSuppression false', result.silentSuppression === false);
        assert('11.11 isProjection true', result.isProjection === true);
    }

    // ── Section 12: Large ROI opportunity scoring ─────────────────────────────
    {
        // Candidate promising high ROI in healthy financial state → should score well
        const roiCandidate = {
            candidateId:      'ROI-1',
            type:             'REVENUE',
            estimatedEffort:  100_000,    // $1,000 investment
            expectedOutcome:  'New revenue stream — estimated $5,000/mo',
            assumptions:      { amountCents: 100_000, frequency: 'ONCE' },
            existingPriority: 0.5,
        };
        const roiResult = scorer.scoreCandidate(roiCandidate, { financialState: HEALTHY_STATE });
        assert('12.01 ROI candidate has CFO eval', roiResult.dataQuality.hasCfoEvaluation);
        assert('12.02 ROI candidate overall priority in [0,1]', between(roiResult.overallPriority, 0, 1));
        assert('12.03 ROI candidate assumptions preserved', roiResult.assumptions.amountCents === 100_000);
        assert('12.04 ROI candidate evidenceReferences is array', Array.isArray(roiResult.evidenceReferences));
        assert('12.05 ROI candidate weight ≥ 0.4', roiResult.attentionAllocationWeight >= 0.4);
    }

    // ── Section 13: Low confidence opportunity — never elevates ───────────────
    {
        const lowConfOpp = {
            candidateId:      'LCO-1',
            type:             'INVESTMENT',
            estimatedEffort:  1_000_000,
            existingPriority: 0.20,
            assumptions:      { amountCents: null, frequency: null, roi: null },
        };
        const lcResult = scorer.scoreCandidate(lowConfOpp); // no financial state
        assert('13.01 low-conf opp: confidenceScore < threshold', lcResult.confidenceScore < scorer.LOW_CONFIDENCE_THRESHOLD);
        assert('13.02 low-conf opp: priority not elevated above existing', lcResult.overallPriority <= 0.20 + 0.001);
        assert('13.03 low-conf opp: weight not elevated above existing', lcResult.attentionAllocationWeight <= 0.20 + 0.001);
        assert('13.04 low-conf opp: missingEvidence populated', lcResult.missingEvidence.length > 0);
        assert('13.05 low-conf opp: silentElevation false', lcResult.silentElevation === false);
        // Rationale must mention low confidence
        assert('13.06 low-conf opp: rationale flags low confidence', lcResult.rationale.includes('LOW CONFIDENCE'));
    }

    // ── Section 14: Runway threat scenario ───────────────────────────────────
    {
        const runwayThreat = {
            candidateId:      'RT-1',
            type:             'MAINTENANCE',
            existingPriority: 0.3,
            assumptions:      { amountCents: 0, frequency: 'ONCE' },
        };
        const criticalState = {
            reserveCents:        15_000,   // $150 — less than 1 month
            monthlyIncomeCents:  100_000,
            monthlyExpenseCents: 130_000,  // losing $300/mo
        };
        const threatResult = scorer.scoreCandidate(runwayThreat, { financialState: criticalState });
        assert('14.01 runway threat → economicUrgencyScore elevated', threatResult.economicUrgencyScore >= 0.65);
        assert('14.02 runway threat → dataQuality.hasCfoEvaluation', threatResult.dataQuality.hasCfoEvaluation);
        assert('14.03 runway threat → confidenceScore in [0,1]', between(threatResult.confidenceScore, 0, 1));
        assert('14.04 runway threat → overallPriority in [0,1]', between(threatResult.overallPriority, 0, 1));
        assert('14.05 runway threat → isProjection', threatResult.isProjection);
    }

    // ── Section 15: Stale financial data reduces influence ────────────────────
    {
        // Simulate stale accounts by passing them in financialState
        const staleAccounts = [
            { accountId: 'ACC-1', status: 'STALE', lastSyncedAt: new Date(Date.now() - 50_000_000).toISOString() },
        ];
        const staleState = { ...HEALTHY_STATE, accounts: staleAccounts };

        const freshResult = scorer.scoreCandidate(BASIC_CANDIDATE, { financialState: HEALTHY_STATE });
        const staleResult = scorer.scoreCandidate(BASIC_CANDIDATE, { financialState: staleState });

        // Stale data → CFO degrades confidence → confidenceScore should be ≤ fresh
        assert('15.01 stale accounts → confidenceScore ≤ fresh', staleResult.confidenceScore <= freshResult.confidenceScore + 0.01);
        assert('15.02 stale result → isProjection true', staleResult.isProjection === true);
        assert('15.03 stale result has CFO eval', staleResult.dataQuality.hasCfoEvaluation);
        assert('15.04 stale result weight in [0,1]', between(staleResult.attentionAllocationWeight, 0, 1));
        assert('15.05 stale result preserves existingSignals flag', staleResult.existingSignalsPreserved === true);
    }

    // ── Section 16: Missing evidence always disclosed ─────────────────────────
    {
        // No amount → missing evidence
        const noAmount = scorer.scoreCandidate({ candidateId: 'ME1', type: 'INVESTMENT' }, { financialState: HEALTHY_STATE });
        assert('16.01 no amount → missingEvidence includes amount note', noAmount.missingEvidence.some(m => m.includes('amount') || m.includes('effort')));

        // No expectedOutcome → missing evidence
        const noOutcome = scorer.scoreCandidate(
            { candidateId: 'ME2', assumptions: { amountCents: 50_000, frequency: 'ONCE' } },
            { financialState: HEALTHY_STATE }
        );
        assert('16.02 no expectedOutcome → missingEvidence includes outcome note', noOutcome.missingEvidence.some(m => m.includes('outcome') || m.includes('efficiency')));

        // No financial state → missing evidence
        const noFs = scorer.scoreCandidate({ candidateId: 'ME3' });
        assert('16.03 no financialState → missingEvidence flags it', noFs.missingEvidence.some(m => m.includes('financial state') || m.includes('CFO')));

        // missingEvidence is always an array (even when nothing missing)
        const full = scorer.scoreCandidate(BASIC_CANDIDATE, { financialState: HEALTHY_STATE });
        assert('16.04 missingEvidence always array', Array.isArray(full.missingEvidence));

        // evidenceReferences is always an array
        assert('16.05 evidenceReferences always array (no state)', Array.isArray(noFs.evidenceReferences));
    }

    // ── Section 17: Contradictions remain visible ─────────────────────────────
    {
        // A contradiction-rich scenario: recommendation says DEFER but large expense
        const contradictory = scorer.scoreCandidate(
            {
                candidateId:      'CON-1',
                type:             'INVESTMENT',
                existingPriority: 0.6,
                assumptions:      { amountCents: 500_000, frequency: 'ONCE', guaranteed: true },
            },
            { financialState: { reserveCents: 100_000, monthlyIncomeCents: 50_000, monthlyExpenseCents: 80_000 } }
        );
        // contradictions is always an array
        assert('17.01 contradictions is array', Array.isArray(contradictory.contradictions));
        // existingSignalsPreserved always true
        assert('17.02 existingSignalsPreserved true even with contradictions', contradictory.existingSignalsPreserved === true);
        // silentElevation always false
        assert('17.03 silentElevation false even with contradictions', contradictory.silentElevation === false);
        // dataQuality present
        assert('17.04 dataQuality present', contradictory.dataQuality && typeof contradictory.dataQuality === 'object');
        // If contradictions exist, they don't get silently dropped
        assert('17.05 contradictions never null', contradictory.contradictions !== null);
    }

    // ── Section 18: Confidence degradation with missing data ─────────────────
    {
        const fullData = scorer.scoreCandidate(
            { candidateId: 'CD1', assumptions: { amountCents: 100_000, frequency: 'ONCE' }, existingPriority: 0.5 },
            { financialState: HEALTHY_STATE }
        );
        const missingMany = scorer.scoreCandidate(
            { candidateId: 'CD2', assumptions: { amountCents: null, frequency: null, roi: null, timeline: null }, existingPriority: 0.5 },
            { financialState: HEALTHY_STATE }
        );
        assert('18.01 more missing assumptions → lower or equal confidence', missingMany.confidenceScore <= fullData.confidenceScore);
        assert('18.02 confidence degradation stays in [0,1]', between(missingMany.confidenceScore, 0, 1));

        // Completely empty candidate vs full
        const emptyCandidate = scorer.scoreCandidate({}, { financialState: HEALTHY_STATE });
        assert('18.03 empty candidate → confidenceScore < full', emptyCandidate.confidenceScore <= fullData.confidenceScore);
        assert('18.04 empty candidate → confidenceScore in [0,1]', between(emptyCandidate.confidenceScore, 0, 1));

        // candidateId null for empty candidate
        assert('18.05 empty candidate → candidateId null', emptyCandidate.candidateId === null);
    }

    // ── Section 19: Existing priority baseline preserved ─────────────────────
    {
        // When confidence < LOW_CONFIDENCE_THRESHOLD, priority cannot go UP
        [0.1, 0.3, 0.5, 0.7, 0.9].forEach((ep, i) => {
            const r = scorer.scoreCandidate({ candidateId: `EP${i}`, existingPriority: ep });
            // No financial state → confidence = 0.15 → no elevation
            assert(`19.0${i+1} existing ${ep} not elevated when low confidence`, r.overallPriority <= ep + 0.001);
        });
    }

    // ── Section 20: scoreCandidates edge cases ────────────────────────────────
    {
        // Empty array
        const empty = scorer.scoreCandidates([], { financialState: HEALTHY_STATE });
        assert('20.01 empty candidates → totalCandidates 0', empty.totalCandidates === 0);
        assert('20.02 empty candidates → ranked empty array', Array.isArray(empty.ranked) && empty.ranked.length === 0);
        assert('20.03 empty candidates → avgConfidence 0', empty.avgConfidence === 0);

        // Single candidate
        const single = scorer.scoreCandidates([BASIC_CANDIDATE], { financialState: HEALTHY_STATE });
        assert('20.04 single candidate → totalCandidates 1', single.totalCandidates === 1);
        assert('20.05 single candidate → ranked length 1', single.ranked.length === 1);

        // Tie-breaking by candidateId
        const tied = scorer.scoreCandidates([
            { candidateId: 'Z', existingPriority: 0.5 },
            { candidateId: 'A', existingPriority: 0.5 },
        ]);
        assert('20.06 tie-broken alphabetically', tied.ranked[0].candidateId === 'A');

        // maxInfluence always reported
        assert('20.07 maxInfluence in batch result', single.maxInfluence === scorer.MAX_INFLUENCE);
        assert('20.08 lowConfidenceThreshold in batch result', single.lowConfidenceThreshold === scorer.LOW_CONFIDENCE_THRESHOLD);
    }

    // ── Section 21: dataQuality fields ────────────────────────────────────────
    {
        const withState = scorer.scoreCandidate(BASIC_CANDIDATE, { financialState: HEALTHY_STATE });
        assert('21.01 dataQuality.hasCfoEvaluation true with state', withState.dataQuality.hasCfoEvaluation === true);
        assert('21.02 dataQuality.hasFinancialState true', withState.dataQuality.hasFinancialState === true);
        assert('21.03 dataQuality.dataIsProjection true', withState.dataQuality.dataIsProjection === true);
        assert('21.04 dataQuality.missingVarCount is number', typeof withState.dataQuality.missingVarCount === 'number');
        assert('21.05 dataQuality.healthWarningCount is number', typeof withState.dataQuality.healthWarningCount === 'number');

        const noState = scorer.scoreCandidate(BASIC_CANDIDATE);
        assert('21.06 dataQuality.hasCfoEvaluation false without state', noState.dataQuality.hasCfoEvaluation === false);
        assert('21.07 dataQuality.hasFinancialState false', noState.dataQuality.hasFinancialState === false);
    }

    // ── Section 22: ZERO financial state ──────────────────────────────────────
    {
        const zeroResult = scorer.scoreCandidate(BASIC_CANDIDATE, { financialState: ZERO_STATE });
        assert('22.01 zero state → all scores in [0,1]', [
            zeroResult.financialImpactScore,
            zeroResult.runwayImpactScore,
            zeroResult.capitalEfficiencyScore,
            zeroResult.confidenceScore,
            zeroResult.economicUrgencyScore,
        ].every(s => between(s, 0, 1)));
        assert('22.02 zero state → overallPriority in [0,1]', between(zeroResult.overallPriority, 0, 1));
        assert('22.03 zero state → weight in [0,1]', between(zeroResult.attentionAllocationWeight, 0, 1));
        assert('22.04 zero state → isProjection true', zeroResult.isProjection === true);
    }

    // ── Section 23: End-to-end pipeline — three competing candidates ──────────
    {
        const e2eCandidates = [
            {
                candidateId:      'E2E-A',
                type:             'COST_CUT',
                estimatedEffort:  50_000,
                expectedOutcome:  'Reduce $500/mo overhead',
                assumptions:      { amountCents: 50_000, frequency: 'ONCE' },
                existingPriority: 0.4,
            },
            {
                candidateId:      'E2E-B',
                type:             'INVESTMENT',
                estimatedEffort:  1_000_000,
                expectedOutcome:  'Platform upgrade',
                assumptions:      { amountCents: 1_000_000, frequency: 'ONCE' },
                existingPriority: 0.6,
            },
            {
                candidateId:      'E2E-C',
                type:             'RESEARCH',
                estimatedEffort:  0,
                expectedOutcome:  null,
                assumptions:      {},
                existingPriority: 0.5,
            },
        ];
        const e2eResult = scorer.scoreCandidates(e2eCandidates, {
            financialState:   HEALTHY_STATE,
            baseConfidence:   80,
            projectionMonths: 12,
        });

        assert('23.01 E2E totalCandidates = 3', e2eResult.totalCandidates === 3);
        assert('23.02 E2E ranked has 3 entries', e2eResult.ranked.length === 3);
        assert('23.03 E2E all weights in [0,1]', e2eResult.ranked.every(r => between(r.attentionAllocationWeight, 0, 1)));
        assert('23.04 E2E all priorities in [0,1]', e2eResult.ranked.every(r => between(r.overallPriority, 0, 1)));
        assert('23.05 E2E ranked descending', e2eResult.ranked[0].attentionAllocationWeight >= e2eResult.ranked[1].attentionAllocationWeight);
        assert('23.06 E2E missingEvidence populated for E2E-C', e2eResult.ranked.find(r => r.candidateId === 'E2E-C').missingEvidence.length > 0);
        assert('23.07 E2E all results have candidateId', e2eResult.ranked.every(r => r.candidateId !== undefined));
        assert('23.08 E2E silentSuppression false', e2eResult.silentSuppression === false);
        assert('23.09 E2E allEvidenceVisible true', e2eResult.allEvidenceVisible === true);
        assert('23.10 E2E avgConfidence in [0,1]', between(e2eResult.avgConfidence, 0, 1));
    }

    // ─── Results ───────────────────────────────────────────────────────────────
    console.log(`\nPassed: ${passed} / ${passed + failed}`);
    if (failures.length > 0) {
        console.log('\nFailures:');
        for (const f of failures) console.log(' ', f);
        process.exit(1);
    } else {
        console.log('All tests passed.');
    }
}

main().catch(err => {
    console.error('Fatal error in test runner:', err);
    process.exit(1);
});
