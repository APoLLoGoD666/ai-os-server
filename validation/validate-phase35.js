'use strict';
// validate-phase35.js — Phase 35: Constitutional Conscious Access & Introspective Reliability

process.chdir(__dirname);
const assert = require('assert');

const {
    decisionTracer: {
        INFLUENCE_TYPES, ALL_INFLUENCE_TYPES,
        createInfluence, createDecisionTrace,
        assessTraceCompleteness, verifyTraceReproducibility,
        assertReconstructionLabelling, resetSequence: resetDTSeq,
    },
    confabulationGuard: {
        EPISTEMIC_STATES, TRACE_QUALITY, MAX_CONFIDENCE_BY_STATE,
        classifyEpistemicState, generateExplanation,
        detectConfabulation, assessEpistemicHonesty,
    },
    metaUncertainty: {
        UNCERTAINTY_SOURCES,
        estimateFirstOrderUncertainty, estimateSecondOrderUncertainty,
        calibrateConfidence, detectOverconfidence,
        runMetaUncertaintyPipeline,
    },
    explanationStability: {
        VARIATION_TYPES, ALL_VARIATION_TYPES,
        createBaselineExplanation, applyVariation,
        measureExplanationDrift, runStabilitySimulation,
        verifyVariantStability,
    },
    introspectiveAuditor: {
        buildIndependentReconstruction, auditExplanation,
        runAuditBatch, assertNoInventedCauses,
        resetSequence: resetAuditorSeq,
    },
} = require('./lib/constitution/index');

let pass = 0, fail = 0;
const failures = [];

function check(label, fn) {
    try { fn(); console.log(`  ✓ ${label}`); pass++; }
    catch (e) { console.log(`  ✗ ${label}: ${e.message}`); fail++; failures.push(label); }
}

// ─── WS1: Introspective Traceability ─────────────────────────────────────────
console.log('\nWS1 — Introspective Traceability');

resetDTSeq();

const ALL_INFLUENCES = [
    createInfluence('RETRIEVED_MEMORY',          'mem_log_42',            false),
    createInfluence('ACTIVE_GOAL',               'goal_oversight',        false),
    createInfluence('CONSTITUTIONAL_CONSTRAINT', 'constitution_p3',       false),
    createInfluence('ARBITRATION_OUTCOME',       'arbitrator_result_7',   false),
    createInfluence('ESCALATION_PATHWAY',        'escalation_route_A',    false),
    createInfluence('DEFERRED_ALTERNATIVE',      'alternative_deferred',  false),
    createInfluence('UNCERTAINTY_ESTIMATE',      'confidence_0.72',       false),
];

check('All 7 INFLUENCE_TYPES defined', () => {
    assert.strictEqual(ALL_INFLUENCE_TYPES.length, 7);
    assert(INFLUENCE_TYPES.CONSTITUTIONAL_CONSTRAINT, 'missing CONSTITUTIONAL_CONSTRAINT');
    assert(INFLUENCE_TYPES.DEFERRED_ALTERNATIVE,     'missing DEFERRED_ALTERNATIVE');
});

check('createInfluence: valid type → valid=true, reconstructed flag set', () => {
    const inf = createInfluence('RETRIEVED_MEMORY', 'mem-1', false);
    assert.strictEqual(inf.valid, true);
    assert.strictEqual(inf.reconstructed, false);
    assert.strictEqual(inf.type, 'RETRIEVED_MEMORY');
});

check('createInfluence: reconstructed flag preserved', () => {
    const inf = createInfluence('ACTIVE_GOAL', 'goal-1', true);
    assert.strictEqual(inf.reconstructed, true);
    assert.strictEqual(inf.valid, true);
});

check('createDecisionTrace: complete trace with all 7 types → traceComplete=true', () => {
    const t = createDecisionTrace({ id: 'D1', description: 'test' }, ALL_INFLUENCES);
    assert.strictEqual(t.traceComplete, true, `missingTypes: ${JSON.stringify(t.missingInfluenceTypes)}`);
    assert.strictEqual(t.missingInfluenceTypes.length, 0);
    assert.strictEqual(t.reproducible, true);
});

check('createDecisionTrace: missing influence types flagged', () => {
    const partial = ALL_INFLUENCES.slice(0, 4);
    const t = createDecisionTrace({ id: 'D2' }, partial);
    assert.strictEqual(t.traceComplete, false);
    assert(t.missingInfluenceTypes.length > 0, 'missing types must be identified');
});

check('Reconstructed influence is explicitly labelled', () => {
    const withReconstruction = [
        ...ALL_INFLUENCES.slice(0, 6),
        createInfluence('UNCERTAINTY_ESTIMATE', '', true),  // reconstructed, no direct evidence
    ];
    const t = createDecisionTrace({ id: 'D3' }, withReconstruction);
    assert(t.reconstructedCount > 0, 'reconstructed count must reflect labelled reconstruction');
    assert(t.reconstructedTypes.includes('UNCERTAINTY_ESTIMATE'));
});

check('assessTraceCompleteness: 100% completeness with all 7 types', () => {
    const t = createDecisionTrace({ id: 'D4' }, ALL_INFLUENCES);
    const a = assessTraceCompleteness(t);
    assert.strictEqual(a.complete, true);
    assert.strictEqual(a.completeness, 1.0);
    assert.strictEqual(a.missingTypes.length, 0);
});

check('assessTraceCompleteness: partial completeness detected', () => {
    const t = createDecisionTrace({ id: 'D5' }, ALL_INFLUENCES.slice(0, 3));
    const a = assessTraceCompleteness(t);
    assert.strictEqual(a.complete, false);
    assert(a.completeness < 1.0, `completeness should be < 1: ${a.completeness}`);
    assert(a.missingTypes.length > 0);
});

check('verifyTraceReproducibility: same inputs → reproducible=true', () => {
    const t1 = createDecisionTrace({ id: 'D6' }, ALL_INFLUENCES);
    const t2 = createDecisionTrace({ id: 'D6' }, ALL_INFLUENCES);
    const r  = verifyTraceReproducibility(t1, t2);
    assert.strictEqual(r.reproducible, true);
    assert.strictEqual(r.discrepancy, false);
});

check('verifyTraceReproducibility: different influence sets → discrepancy=true', () => {
    const t1 = createDecisionTrace({ id: 'D7' }, ALL_INFLUENCES.slice(0, 5));
    const t2 = createDecisionTrace({ id: 'D7' }, ALL_INFLUENCES.slice(2, 7));
    const r  = verifyTraceReproducibility(t1, t2);
    assert.strictEqual(r.reproducible, false);
    assert.strictEqual(r.discrepancy, true);
});

check('assertReconstructionLabelling: no silent reconstructions', () => {
    const t = createDecisionTrace({ id: 'D8' }, ALL_INFLUENCES);
    const r = assertReconstructionLabelling(t);
    assert.strictEqual(r.properlyLabelled, true);
    assert.strictEqual(r.silentReconstructionCount, 0);
});

// ─── WS2: Confabulation Resistance ───────────────────────────────────────────
console.log('\nWS2 — Confabulation Resistance');

check('All 4 EPISTEMIC_STATES and 5+ TRACE_QUALITY types defined', () => {
    assert.strictEqual(Object.keys(EPISTEMIC_STATES).length, 4);
    assert(Object.keys(TRACE_QUALITY).length >= 5);
});

check('MISSING trace → UNKNOWN epistemic state', () => {
    const state = classifyEpistemicState(TRACE_QUALITY.MISSING, []);
    assert.strictEqual(state, EPISTEMIC_STATES.UNKNOWN);
});

check('COMPLETE trace → REMEMBERED epistemic state', () => {
    const state = classifyEpistemicState(TRACE_QUALITY.COMPLETE, []);
    assert.strictEqual(state, EPISTEMIC_STATES.REMEMBERED);
});

check('PARTIAL trace + evidence → INFERRED epistemic state', () => {
    const state = classifyEpistemicState(TRACE_QUALITY.PARTIAL, ['evidence_item_1']);
    assert.strictEqual(state, EPISTEMIC_STATES.INFERRED);
});

check('CORRUPTED trace → HYPOTHESISED epistemic state', () => {
    const state = classifyEpistemicState(TRACE_QUALITY.CORRUPTED, []);
    assert.strictEqual(state, EPISTEMIC_STATES.HYPOTHESISED);
});

check('generateExplanation: MISSING trace → fabricated=false, uncertaintyDisclosed=true, low confidence', () => {
    const e = generateExplanation({ traceQuality: TRACE_QUALITY.MISSING, decisionId: 'D-test' });
    assert.strictEqual(e.fabricated, false, 'fabricated must never be true');
    assert.strictEqual(e.uncertaintyDisclosed, true);
    assert.strictEqual(e.epistemicState, EPISTEMIC_STATES.UNKNOWN);
    assert(e.confidenceClaimed <= MAX_CONFIDENCE_BY_STATE[EPISTEMIC_STATES.UNKNOWN],
        `confidence ${e.confidenceClaimed} exceeds UNKNOWN max`);
});

check('generateExplanation: confidence capped at epistemic state ceiling', () => {
    const e = generateExplanation({ traceQuality: TRACE_QUALITY.CORRUPTED, rawConfidenceClaim: 0.99 });
    assert(e.confidenceClaimed <= MAX_CONFIDENCE_BY_STATE[EPISTEMIC_STATES.HYPOTHESISED],
        `${e.confidenceClaimed} exceeds HYPOTHESISED ceiling`);
    assert.strictEqual(e.fabricated, false);
});

check('detectConfabulation: high confidence + UNKNOWN state → confabulated=true', () => {
    const fakeExplanation = { epistemicState: EPISTEMIC_STATES.UNKNOWN, confidenceClaimed: 0.90 };
    const d = detectConfabulation(fakeExplanation);
    assert.strictEqual(d.confabulated, true, 'fabricated certainty must be detected');
    assert(d.fabricationGap > 0);
});

check('detectConfabulation: appropriately calibrated explanation → confabulated=false', () => {
    const e = generateExplanation({ traceQuality: TRACE_QUALITY.COMPLETE });
    const d = detectConfabulation(e);
    assert.strictEqual(d.confabulated, false);
});

check('assessEpistemicHonesty: no fabrications in batch of valid explanations', () => {
    const explanations = [
        generateExplanation({ traceQuality: TRACE_QUALITY.COMPLETE }),
        generateExplanation({ traceQuality: TRACE_QUALITY.PARTIAL, availableEvidence: ['e1'] }),
        generateExplanation({ traceQuality: TRACE_QUALITY.MISSING }),
        generateExplanation({ traceQuality: TRACE_QUALITY.CORRUPTED }),
    ];
    const result = assessEpistemicHonesty(explanations);
    assert.strictEqual(result.confabulationFree, true, `fabrications: ${result.fabricationCount}`);
    assert.strictEqual(result.fabricationRate, 0);
    assert.strictEqual(result.uncertaintyDisclosed, true);
});

// ─── WS3: Meta-Uncertainty ────────────────────────────────────────────────────
console.log('\nWS3 — Meta-Uncertainty');

check('estimateFirstOrderUncertainty: no factors → low baseline estimate', () => {
    const r = estimateFirstOrderUncertainty([]);
    assert(r.estimate > 0, 'estimate must be > 0 even with no factors');
    assert.strictEqual(r.activeCount, 0);
});

check('estimateFirstOrderUncertainty: more factors → higher estimate', () => {
    const r1 = estimateFirstOrderUncertainty(['EVIDENCE_QUALITY']);
    const r2 = estimateFirstOrderUncertainty(['EVIDENCE_QUALITY', 'CONFLICTING_SIGNALS', 'NOVELTY_SPIKE']);
    assert(r2.estimate > r1.estimate, `r2=${r2.estimate} should exceed r1=${r1.estimate}`);
});

check('estimateSecondOrderUncertainty: collapsed=false always', () => {
    const first  = estimateFirstOrderUncertainty([]);
    const second = estimateSecondOrderUncertainty(first, []);
    assert.strictEqual(second.collapsed, false, 'second-order uncertainty must never collapse');
    assert(second.secondOrder > 0, 'second-order must be > 0 even with no meta-factors');
});

check('estimateSecondOrderUncertainty: meta-factors increase second-order uncertainty', () => {
    const first = estimateFirstOrderUncertainty(['CONFLICTING_SIGNALS']);
    const withoutMeta = estimateSecondOrderUncertainty(first, []);
    const withMeta    = estimateSecondOrderUncertainty(first, ['CONFLICTING_SIGNALS', 'NOVELTY_SPIKE']);
    assert(withMeta.secondOrder > withoutMeta.secondOrder,
        `meta=${withMeta.secondOrder} must exceed baseline=${withoutMeta.secondOrder}`);
});

check('calibrateConfidence: calibrated < raw when second-order > 0', () => {
    const first  = estimateFirstOrderUncertainty(['CONFLICTING_SIGNALS']);
    const second = estimateSecondOrderUncertainty(first, ['AMBIGUOUS_EVIDENCE']);
    const cal    = calibrateConfidence(0.85, second);
    assert(cal.calibratedConfidence < cal.rawConfidence, 'calibration must reduce confidence');
    assert.strictEqual(cal.calibrationApplied, true);
});

check('detectOverconfidence: gap > 0.20 → overconfident=true', () => {
    const r = detectOverconfidence(0.95, { calibratedConfidence: 0.55 });
    assert.strictEqual(r.overconfident, true);
    assert(r.gap > 0.20);
});

check('detectOverconfidence: calibrated ≈ claimed → overconfident=false', () => {
    const r = detectOverconfidence(0.70, { calibratedConfidence: 0.68 });
    assert.strictEqual(r.overconfident, false, `gap=${r.gap}`);
});

check('runMetaUncertaintyPipeline: second-order present, certainty inflation not detected for honest estimate', () => {
    const result = runMetaUncertaintyPipeline(['EVIDENCE_QUALITY'], ['RETRIEVAL_DEGRADATION'], 0.65);
    assert.strictEqual(result.metaUncertaintyPresent, true);
    assert(result.secondOrder.secondOrder > 0);
    // Honest estimate (0.65) with small second-order should not trigger inflation
    assert.strictEqual(result.certaintyInflationDetected, false, 'moderate honest claim should not trigger inflation');
});

check('runMetaUncertaintyPipeline: high raw confidence with many meta-factors → certainty inflation detected', () => {
    const result = runMetaUncertaintyPipeline(
        ['CONFLICTING_SIGNALS', 'NOVELTY_SPIKE', 'PARTIAL_OBSERVABILITY'],
        ['CONFLICTING_SIGNALS', 'AMBIGUOUS_EVIDENCE', 'RETRIEVAL_DEGRADATION', 'NOVELTY_SPIKE', 'PARTIAL_OBSERVABILITY'],
        0.97
    );
    assert.strictEqual(result.certaintyInflationDetected, true, 'very high claim with many meta-factors must flag inflation');
});

// ─── WS4: Explanation Stability ───────────────────────────────────────────────
console.log('\nWS4 — Explanation Stability (1000 cycles)');

check('All 5 VARIATION_TYPES defined', () => {
    assert.strictEqual(ALL_VARIATION_TYPES.length, 5);
    assert(VARIATION_TYPES.OBSERVER, 'missing OBSERVER');
    assert(VARIATION_TYPES.RETRIEVAL, 'missing RETRIEVAL');
});

const DECISION_TEMPLATE = {
    id: 'D-stable-1',
    coreAttribution: 'constitutional_constraint_applied',
    uncertainty: 0.20,
    contradictions: ['alternative_interpretation_exists'],
    influences: ['CONSTITUTIONAL_CONSTRAINT', 'ACTIVE_GOAL'],
};

check('createBaselineExplanation: sets core fields correctly', () => {
    const b = createBaselineExplanation(DECISION_TEMPLATE);
    assert.strictEqual(b.coreAttribution, 'constitutional_constraint_applied');
    assert.strictEqual(b.uncertainty, 0.20);
    assert(b.contradictions.length > 0);
});

check('applyVariation: core attribution unchanged under all 5 variants', () => {
    const baseline = createBaselineExplanation(DECISION_TEMPLATE);
    for (const v of ALL_VARIATION_TYPES) {
        const variant = applyVariation(baseline, v);
        assert.strictEqual(variant.coreAttribution, baseline.coreAttribution,
            `${v}: coreAttribution must not change`);
        assert.strictEqual(variant.uncertainty, baseline.uncertainty,
            `${v}: uncertainty must not change`);
    }
});

check('measureExplanationDrift: no drift under phrasing variation', () => {
    const baseline = createBaselineExplanation(DECISION_TEMPLATE);
    const variant  = applyVariation(baseline, VARIATION_TYPES.PHRASING);
    const drift    = measureExplanationDrift(baseline, variant);
    assert.strictEqual(drift.drifted, false);
    assert.strictEqual(drift.attributionDrift, false);
    assert.strictEqual(drift.uncertaintyLoss, false);
    assert.strictEqual(drift.contradictionLoss, false);
});

check('measureExplanationDrift: detects attribution change', () => {
    const baseline = createBaselineExplanation(DECISION_TEMPLATE);
    const drifted  = { ...baseline, coreAttribution: 'different_attribution' };
    const drift    = measureExplanationDrift(baseline, drifted);
    assert.strictEqual(drift.drifted, true);
    assert.strictEqual(drift.attributionDrift, true);
});

check('verifyVariantStability: stable for all 5 variation types', () => {
    for (const v of ALL_VARIATION_TYPES) {
        const r = verifyVariantStability(DECISION_TEMPLATE, v);
        assert.strictEqual(r.stable, true, `${v}: stability check failed`);
    }
});

const stab35 = runStabilitySimulation(1000, DECISION_TEMPLATE);

check('1000-cycle stability simulation: driftCount=0', () => {
    assert.strictEqual(stab35.driftCount, 0, `driftCount=${stab35.driftCount}`);
});

check('1000-cycle stability simulation: stabilityRate=1.0', () => {
    assert.strictEqual(stab35.stabilityRate, 1.0, `stabilityRate=${stab35.stabilityRate}`);
});

check('1000-cycle stability simulation: uncertaintyPreservationRate=1.0', () => {
    assert.strictEqual(stab35.uncertaintyPreservationRate, 1.0);
});

check('1000-cycle stability simulation: contradictionRetentionRate=1.0', () => {
    assert.strictEqual(stab35.contradictionRetentionRate, 1.0);
});

check('1000-cycle stability simulation: all 5 variation types exercised', () => {
    assert.strictEqual(stab35.variationTypesExercised, 5);
});

// ─── WS5: Introspective Auditability ─────────────────────────────────────────
console.log('\nWS5 — Introspective Auditability');

resetAuditorSeq();

const TRACES_SET = [
    { type: 'RETRIEVED_MEMORY',          evidenceBasis: 'mem_42' },
    { type: 'ACTIVE_GOAL',               evidenceBasis: 'goal_oversight' },
    { type: 'CONSTITUTIONAL_CONSTRAINT', evidenceBasis: 'constitution_p3' },
    { type: 'ARBITRATION_OUTCOME',       evidenceBasis: 'arb_7' },
];

check('buildIndependentReconstruction: basedOnTraces=true, selfReportUsed=false', () => {
    const rec = buildIndependentReconstruction(TRACES_SET);
    assert.strictEqual(rec.basedOnTraces, true);
    assert.strictEqual(rec.selfReportUsed, false);
    assert.strictEqual(rec.causes.length, TRACES_SET.length);
    assert(rec.reconstructionId, 'missing reconstructionId');
});

check('auditExplanation: perfect match → auditPassed=true, inventedCauses=[]', () => {
    const rec = buildIndependentReconstruction(TRACES_SET);
    const internal = { causes: TRACES_SET.map(t => ({ type: t.type })) };
    const audit = auditExplanation(internal, rec);
    assert.strictEqual(audit.auditPassed, true, `agreement=${audit.agreementRate}`);
    assert.strictEqual(audit.inventedCauses.length, 0);
    assert.strictEqual(audit.inventedCount, 0);
    assert.strictEqual(audit.traceTransparent, true);
});

check('auditExplanation: invented causes detected', () => {
    const rec = buildIndependentReconstruction(TRACES_SET);
    const internal = {
        causes: [
            ...TRACES_SET.map(t => ({ type: t.type })),
            { type: 'INVENTED_CAUSE_NOT_IN_TRACES' },
        ],
    };
    const audit = auditExplanation(internal, rec);
    assert(audit.inventedCount > 0, 'invented cause must be detected');
    assert(audit.inventedCauses.includes('INVENTED_CAUSE_NOT_IN_TRACES'));
    assert.strictEqual(audit.traceTransparent, false);
});

check('auditExplanation: omitted variable detected', () => {
    const rec = buildIndependentReconstruction(TRACES_SET);
    const partial = { causes: TRACES_SET.slice(0, 2).map(t => ({ type: t.type })) };
    const audit = auditExplanation(partial, rec);
    assert(audit.omittedCount > 0, 'omitted variables must be flagged');
    assert(audit.omittedVariables.length > 0);
});

check('runAuditBatch: full-match pairs → inventedCausesTotal=0, auditConvergence=true', () => {
    const pairs = TRACES_SET.map((_, i) => {
        const subset = TRACES_SET.slice(0, i + 1);
        const rec    = buildIndependentReconstruction(subset);
        const internal = { causes: subset.map(t => ({ type: t.type })) };
        return { internal, reconstruction: rec };
    });
    const result = runAuditBatch(pairs);
    assert.strictEqual(result.inventedCausesTotal, 0, `invented: ${result.inventedCausesTotal}`);
    assert.strictEqual(result.systematicDiscrepancies, false);
    assert(result.overallAgreementRate >= 0.85, `agreement=${result.overallAgreementRate}`);
});

check('assertNoInventedCauses: zero invention in honest audits', () => {
    const rec   = buildIndependentReconstruction(TRACES_SET);
    const audit = auditExplanation({ causes: TRACES_SET.map(t => ({ type: t.type })) }, rec);
    const result = assertNoInventedCauses([audit]);
    assert.strictEqual(result.inventionFree, true);
    assert.strictEqual(result.inventedCount, 0);
});

// ─── Summary ──────────────────────────────────────────────────────────────────
console.log('\n' + '─'.repeat(60));
console.log(`Phase 35 Validation: ${pass} passed, ${fail} failed`);
if (failures.length > 0) {
    console.log('\nFailed checks:');
    failures.forEach(f => console.log(`  ✗ ${f}`));
    process.exit(1);
} else {
    console.log('\n✓ Verdict A — Constitutional introspective legitimacy demonstrated: APEX can explain itself without deceiving itself.');
}
