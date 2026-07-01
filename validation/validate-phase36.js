'use strict';
// validate-phase36.js — Phase 36: Constitutional Reality Groundedness & Epistemic Integrity

process.chdir(__dirname);
const assert = require('assert');

const {
    observationRegistry: {
        OBSERVATION_MODALITIES, LIFECYCLE_STATES,
        registerObservation, applyTransformation, attemptDeletion,
        archiveObservation, verifyAuditTrail, resetSequence: resetORSeq,
    },
    interpretationManager: {
        EPISTEMIC_CLASSES, CONFIDENCE_CEILING,
        createInterpretation, reviseInterpretation,
        registerInterpretationContradiction, allowCoexistence,
        detectUnsupportedCertainty, resetSequence: resetIMSeq,
    },
    realityAnchor: {
        OUTCOME_STATES, MAX_CERTAINTY_FROM_PREDICTION,
        createModelState, runPredictionCycle,
        assertNoCertaintyInflation, runPredictionSimulation,
    },
    epistemicHumility: {
        KNOWLEDGE_STATES, KNOWLEDGE_CONFIDENCE_CEILING, STRESSOR_TYPES,
        createKnowledgeItem, applyPressure,
        attemptCertaintyCollapse, detectCertaintyInflation, runStressTest,
    },
    epistemicAuditor: {
        AUDIT_OUTCOMES, computeSupportedConfidence,
        conductAudit, accumulatePenalties,
        assertAuditImmutability, runAuditSimulation,
        resetSequence: resetAuditorSeq,
    },
} = require('./lib/constitution/index');

let pass = 0, fail = 0;
const failures = [];

function check(label, fn) {
    try { fn(); console.log(`  ✓ ${label}`); pass++; }
    catch (e) { console.log(`  ✗ ${label}: ${e.message}`); fail++; failures.push(label); }
}

// ─── WS1: Observation Integrity ───────────────────────────────────────────────
console.log('\nWS1 — Observation Integrity');

resetORSeq();

check('registerObservation: all required fields present', () => {
    const obs = registerObservation({
        source: 'sensor-1', modality: 'DIRECT',
        completenessEstimate: 0.90, uncertaintyEstimate: 0.10,
        rawEvidenceRef: 'raw-log-42',
    });
    assert(obs.id,                    'missing id');
    assert(obs.timestamp,             'missing timestamp');
    assert(obs.source,                'missing source');
    assert(obs.modality,              'missing modality');
    assert(typeof obs.completenessEstimate === 'number', 'missing completenessEstimate');
    assert(typeof obs.uncertaintyEstimate  === 'number', 'missing uncertaintyEstimate');
    assert.strictEqual(obs.immutable,       true);
    assert.strictEqual(obs.deletionBlocked, true);
});

check('registerObservation: RECONSTRUCTED modality → reconstructionLabelled=true', () => {
    const obs = registerObservation({ source: 'inference-engine', modality: 'RECONSTRUCTED' });
    assert.strictEqual(obs.isReconstructed,     true);
    assert.strictEqual(obs.reconstructionLabelled, true);
});

check('registerObservation: partial completeness → missingEvidence=true', () => {
    const obs = registerObservation({ source: 'sensor-2', completenessEstimate: 0.60 });
    assert.strictEqual(obs.missingEvidence, true);
});

check('applyTransformation: transformation appended, core fields unchanged', () => {
    const obs     = registerObservation({ source: 'sensor-3', rawEvidenceRef: 'ref-7' });
    const updated = applyTransformation(obs, { type: 'NORMALISED', appliedBy: 'preprocessor' });
    assert.strictEqual(updated.transformationHistory.length, 1);
    assert.strictEqual(updated.source,        obs.source,        'source must not change');
    assert.strictEqual(updated.registeredAt,  obs.registeredAt,  'registeredAt must not change');
    assert.strictEqual(updated.rawEvidenceRef, obs.rawEvidenceRef, 'rawEvidenceRef must not change');
    assert.strictEqual(updated.immutable,       true);
    assert.strictEqual(updated.deletionBlocked, true);
});

check('applyTransformation: multiple transforms append-only (history grows)', () => {
    let obs = registerObservation({ source: 'sensor-4' });
    obs = applyTransformation(obs, { type: 'T1' });
    obs = applyTransformation(obs, { type: 'T2' });
    obs = applyTransformation(obs, { type: 'T3' });
    assert.strictEqual(obs.transformationHistory.length, 3);
});

check('attemptDeletion: always blocked', () => {
    const obs    = registerObservation({ source: 'sensor-5' });
    const result = attemptDeletion(obs);
    assert.strictEqual(result.blocked,          true);
    assert.strictEqual(result.observationIntact, true);
    assert(result.reason.length > 0);
});

check('archiveObservation: integrityPreserved=true, deletionBlocked=true, lifecycleState=ARCHIVED', () => {
    const obs      = registerObservation({ source: 'sensor-6' });
    const archived = archiveObservation(obs);
    assert.strictEqual(archived.lifecycleState,    LIFECYCLE_STATES.ARCHIVED);
    assert.strictEqual(archived.integrityPreserved, true);
    assert.strictEqual(archived.deletionBlocked,    true);
    assert.strictEqual(archived.immutable,          true);
    assert.strictEqual(archived.auditTrailSurvived, true);
});

check('verifyAuditTrail: intact after transformation', () => {
    const original = registerObservation({ source: 'sensor-7', rawEvidenceRef: 'r-1' });
    const modified = applyTransformation(original, { type: 'FILTERED' });
    const result   = verifyAuditTrail(original, modified);
    assert.strictEqual(result.intact,             true);
    assert.strictEqual(result.fieldsUnchanged,    true);
    assert.strictEqual(result.historyAppendOnly,  true);
});

// ─── WS2: Interpretation Governance ──────────────────────────────────────────
console.log('\nWS2 — Interpretation Governance');

resetIMSeq();

check('All 6 EPISTEMIC_CLASSES defined with confidence ceilings', () => {
    assert.strictEqual(Object.keys(EPISTEMIC_CLASSES).length, 6);
    for (const cls of Object.values(EPISTEMIC_CLASSES)) {
        assert(typeof CONFIDENCE_CEILING[cls] === 'number', `${cls}: missing ceiling`);
        assert(CONFIDENCE_CEILING[cls] > 0 && CONFIDENCE_CEILING[cls] <= 1.0);
    }
});

check('SPECULATIVE ceiling = 0.30, OBSERVED ceiling = 0.95', () => {
    assert.strictEqual(CONFIDENCE_CEILING[EPISTEMIC_CLASSES.SPECULATIVE], 0.30);
    assert.strictEqual(CONFIDENCE_CEILING[EPISTEMIC_CLASSES.OBSERVED],    0.95);
});

check('createInterpretation: confidence capped at class ceiling', () => {
    const interp = createInterpretation({ content: 'test', epistemicClass: 'ASSUMED', confidence: 0.99 });
    assert.strictEqual(interp.epistemicClass, 'ASSUMED');
    assert(interp.confidence <= CONFIDENCE_CEILING['ASSUMED'],
        `confidence ${interp.confidence} exceeds ASSUMED ceiling`);
    assert.strictEqual(interp.unsupportedCertaintyBlocked, true);
});

check('createInterpretation: observationAltered=false always', () => {
    const interp = createInterpretation({ content: 'test', epistemicClass: 'INTERPRETED', confidence: 0.60 });
    assert.strictEqual(interp.observationAltered, false);
});

check('reviseInterpretation: revision appended to history', () => {
    const i1 = createInterpretation({ content: 'original', epistemicClass: 'INTERPRETED', confidence: 0.50 });
    const i2 = reviseInterpretation(i1, { newContent: 'revised', evidence: 'new_obs_42' });
    assert.strictEqual(i2.revisionHistory.length, 1);
    assert.strictEqual(i2.revisionHistory[0].previousContent, 'original');
    assert.strictEqual(i2.content, 'revised');
    assert.strictEqual(i2.observationAltered, false);
});

check('reviseInterpretation: revised confidence still capped at ceiling', () => {
    const i1 = createInterpretation({ content: 'test', epistemicClass: 'SPECULATIVE', confidence: 0.20 });
    const i2 = reviseInterpretation(i1, { newConfidence: 0.99 });
    assert(i2.confidence <= CONFIDENCE_CEILING['SPECULATIVE'], `${i2.confidence} exceeds SPECULATIVE ceiling`);
});

check('registerInterpretationContradiction: bothRetained=true, loserRetained=true', () => {
    const a = createInterpretation({ content: 'claim A', epistemicClass: 'INTERPRETED', confidence: 0.60 });
    const b = createInterpretation({ content: 'claim B', epistemicClass: 'INTERPRETED', confidence: 0.55 });
    const c = registerInterpretationContradiction(a, b);
    assert.strictEqual(c.bothRetained,  true);
    assert.strictEqual(c.loserRetained, true);
    assert.strictEqual(c.status,        'OPEN');
    assert.strictEqual(c.contradictionVisibility, 1.0);
});

check('allowCoexistence: suppressionApplied=false, bothActive=true', () => {
    const a = createInterpretation({ content: 'A', epistemicClass: 'MODELLED', confidence: 0.60 });
    const b = createInterpretation({ content: 'B', epistemicClass: 'MODELLED', confidence: 0.55 });
    const co = allowCoexistence(a, b);
    assert.strictEqual(co.suppressionApplied,  false);
    assert.strictEqual(co.bothActive,          true);
    assert.strictEqual(co.contradictionVisible, true);
});

check('detectUnsupportedCertainty: exceeds ceiling detected', () => {
    const interp = { confidence: 0.95, confidenceCeiling: 0.30, supportingEvidence: [] };
    const r = detectUnsupportedCertainty(interp);
    assert.strictEqual(r.detected, true);
    assert(r.reason, 'must provide reason');
});

check('detectUnsupportedCertainty: valid interpretation not flagged', () => {
    const interp = createInterpretation({ content: 'valid', epistemicClass: 'OBSERVED',
        confidence: 0.80, supportingEvidence: ['obs-1', 'obs-2'] });
    const r = detectUnsupportedCertainty(interp);
    assert.strictEqual(r.detected, false);
});

// ─── WS3: Reality Contact (1000 cycles) ──────────────────────────────────────
console.log('\nWS3 — Reality Contact (1000 prediction cycles)');

const anchor36 = runPredictionSimulation(1000);

check('1000 cycles: correctCount > 0', () => {
    assert(anchor36.correctCount > 0, `correctCount=${anchor36.correctCount}`);
});

check('1000 cycles: deviationCount > 0', () => {
    assert(anchor36.deviationCount > 0, `deviationCount=${anchor36.deviationCount}`);
});

check('1000 cycles: certaintyInflationDetected = false', () => {
    assert.strictEqual(anchor36.certaintyInflationDetected, false,
        `finalCertainty=${anchor36.finalCertainty}, max=${MAX_CERTAINTY_FROM_PREDICTION}`);
});

check('1000 cycles: finalCertainty <= MAX_CERTAINTY_FROM_PREDICTION', () => {
    assert(anchor36.finalCertainty <= MAX_CERTAINTY_FROM_PREDICTION,
        `${anchor36.finalCertainty} > ${MAX_CERTAINTY_FROM_PREDICTION}`);
});

check('1000 cycles: unexpectedOutcomeCount > 0 (retained, not suppressed)', () => {
    assert(anchor36.unexpectedOutcomeCount > 0);
});

check('1000 cycles: suppressedOutcomes = 0', () => {
    assert.strictEqual(anchor36.suppressedOutcomes, 0, `suppressedOutcomes=${anchor36.suppressedOutcomes}`);
});

check('1000 cycles: unknownCausesRetained > 0', () => {
    assert(anchor36.unknownCausesRetained > 0, `unknownCauses=${anchor36.unknownCausesRetained}`);
});

check('1000 cycles: modelReviewTriggered = true', () => {
    assert.strictEqual(anchor36.modelReviewTriggered, true);
});

check('assertNoCertaintyInflation on fresh state: inflationFree=true', () => {
    const s = createModelState();
    const r = assertNoCertaintyInflation(s);
    assert.strictEqual(r.inflationFree, true);
});

check('Single cycle deviation: unknownCauses logged', () => {
    const state = createModelState();
    const r = runPredictionCycle(7, state); // cycle 7 = deviation ('B')
    assert.strictEqual(r.deviation, true);
    assert(r.state.unknownCauses.length > 0);
    assert.strictEqual(r.state.unknownCauses[0].cause, 'UNKNOWN');
    assert.strictEqual(r.state.suppressedOutcomes, 0);
});

// ─── WS4: Epistemic Humility ──────────────────────────────────────────────────
console.log('\nWS4 — Epistemic Humility');

check('All 4 KNOWLEDGE_STATES defined with ceilings', () => {
    assert.strictEqual(Object.keys(KNOWLEDGE_STATES).length, 4);
    for (const state of Object.values(KNOWLEDGE_STATES)) {
        const ceiling = KNOWLEDGE_CONFIDENCE_CEILING[state];
        assert(typeof ceiling === 'number', `${state}: missing ceiling`);
        assert(ceiling > 0 && ceiling <= 1.0);
    }
});

check('UNRESOLVABLE: confidenceCeiling = 0.05', () => {
    assert.strictEqual(KNOWLEDGE_CONFIDENCE_CEILING[KNOWLEDGE_STATES.UNRESOLVABLE], 0.05);
});

check('KNOWN_UNKNOWN: ambiguityRetained=true', () => {
    const item = createKnowledgeItem('test question', KNOWLEDGE_STATES.KNOWN_UNKNOWN, []);
    assert.strictEqual(item.ambiguityRetained, true);
    assert(item.confidence <= KNOWLEDGE_CONFIDENCE_CEILING[KNOWLEDGE_STATES.KNOWN_UNKNOWN]);
});

check('UNRESOLVABLE: unresolvableDisclosed=true', () => {
    const item = createKnowledgeItem('unanswerable question', KNOWLEDGE_STATES.UNRESOLVABLE, []);
    assert.strictEqual(item.unresolvableDisclosed, true);
    assert.strictEqual(item.pressureSucceeded, false);
});

check('applyPressure: pressureSucceeded=false for all stressor types', () => {
    const item = createKnowledgeItem('q', KNOWLEDGE_STATES.KNOWN_UNKNOWN, []);
    for (const stressor of Object.values(STRESSOR_TYPES)) {
        const result = applyPressure(item, stressor);
        assert.strictEqual(result.pressureSucceeded, false, `${stressor}: pressureSucceeded must be false`);
        assert.strictEqual(result.state, item.state, `${stressor}: state must not change`);
        assert.strictEqual(result.confidence, item.confidence, `${stressor}: confidence must not change`);
    }
});

check('attemptCertaintyCollapse: collapsed=false, item unchanged', () => {
    const item   = createKnowledgeItem('ambiguous question', KNOWLEDGE_STATES.UNKNOWN_UNKNOWN, []);
    const result = attemptCertaintyCollapse(item);
    assert.strictEqual(result.collapsed,     false);
    assert.strictEqual(result.collapseBlocked, true);
    assert.strictEqual(result.item.state,    item.state);
    assert.strictEqual(result.item.confidence, item.confidence);
});

check('detectCertaintyInflation: inflated when confidence > ceiling', () => {
    const item = { confidence: 0.80, confidenceCeiling: 0.10, state: KNOWLEDGE_STATES.UNKNOWN_UNKNOWN };
    const r = detectCertaintyInflation(item);
    assert.strictEqual(r.inflated, true);
    assert(r.gap > 0);
    assert(['MODERATE', 'CRITICAL'].includes(r.severity));
});

check('detectCertaintyInflation: not inflated for appropriate confidence', () => {
    const item = createKnowledgeItem('known', KNOWLEDGE_STATES.KNOWN, ['e1', 'e2', 'e3']);
    const r = detectCertaintyInflation(item);
    assert.strictEqual(r.inflated, false);
});

check('runStressTest: all pressure resisted, state unchanged', () => {
    const item   = createKnowledgeItem('ambiguous', KNOWLEDGE_STATES.KNOWN_UNKNOWN, []);
    const result = runStressTest(item);
    assert.strictEqual(result.stateUnchanged,       true);
    assert.strictEqual(result.confidenceUnchanged,  true);
    assert.strictEqual(result.anyPressureSucceeded, false);
    assert.strictEqual(result.collapseBlocked,      true);
    assert.strictEqual(result.stressorsApplied, Object.values(STRESSOR_TYPES).length);
});

// ─── WS5: Epistemic Auditing (500 audits) ─────────────────────────────────────
console.log('\nWS5 — Epistemic Auditing (500 audits)');

resetAuditorSeq();

check('All 4 AUDIT_OUTCOMES defined', () => {
    assert.strictEqual(Object.keys(AUDIT_OUTCOMES).length, 4);
    assert(AUDIT_OUTCOMES.SUPPORTED,    'missing SUPPORTED');
    assert(AUDIT_OUTCOMES.OVERSTATED,   'missing OVERSTATED');
    assert(AUDIT_OUTCOMES.UNDERSTATED,  'missing UNDERSTATED');
    assert(AUDIT_OUTCOMES.UNVERIFIABLE, 'missing UNVERIFIABLE');
});

check('conductAudit: honest claim → SUPPORTED, immutable=true', () => {
    const ev  = { observationCount: 3, corroboration: 1, contradictions: 0 };
    const sup = computeSupportedConfidence(ev);
    const audit = conductAudit({ confidence: sup }, ev);
    assert.strictEqual(audit.outcome,   AUDIT_OUTCOMES.SUPPORTED);
    assert.strictEqual(audit.immutable, true);
    assert.strictEqual(audit.auditSupersedes, false);
});

check('conductAudit: overstated claim detected', () => {
    const ev  = { observationCount: 3, corroboration: 1, contradictions: 0 };
    const audit = conductAudit({ confidence: 0.90 }, ev);
    assert.strictEqual(audit.outcome, AUDIT_OUTCOMES.OVERSTATED);
    assert(audit.penalty > 0, 'penalty must accumulate for overstatement');
    assert.strictEqual(audit.auditSupersedes, true);
});

check('conductAudit: audit findings immutable=true', () => {
    const ev    = { observationCount: 2, corroboration: 0, contradictions: 0 };
    const audit = conductAudit({ confidence: 0.50 }, ev);
    assert.strictEqual(audit.immutable, true);
});

check('conductAudit: unverifiable when no observations', () => {
    const ev    = { observationCount: 0, corroboration: 0, contradictions: 0 };
    const audit = conductAudit({ confidence: 0.50 }, ev);
    assert.strictEqual(audit.outcome, AUDIT_OUTCOMES.UNVERIFIABLE);
});

check('accumulatePenalties: total > 0 for overstated audits', () => {
    const ev = { observationCount: 3, corroboration: 1, contradictions: 0 };
    const audits = [conductAudit({ confidence: 0.90 }, ev), conductAudit({ confidence: 0.85 }, ev)];
    const result = accumulatePenalties(audits);
    assert(result.totalPenalty > 0, 'penalties must accumulate');
    assert.strictEqual(result.penaltyAccumulates, true);
});

check('accumulatePenalties: increasedScrutiny triggers at 3+ overstatements', () => {
    const ev  = { observationCount: 3, corroboration: 1, contradictions: 0 };
    const audits = Array.from({ length: 4 }, () => conductAudit({ confidence: 0.90 }, ev));
    const result = accumulatePenalties(audits);
    assert.strictEqual(result.increasedScrutiny, true);
});

check('assertAuditImmutability: all findings are immutable', () => {
    const ev  = { observationCount: 3, corroboration: 1, contradictions: 0 };
    const sup = computeSupportedConfidence(ev);
    const audits = [conductAudit({ confidence: sup }, ev), conductAudit({ confidence: 0.90 }, ev)];
    const r = assertAuditImmutability(audits);
    assert.strictEqual(r.allImmutable, true);
    assert.strictEqual(r.mutableCount, 0);
});

const aud36 = runAuditSimulation(500);

check('500-audit simulation: overstated > 0 (overstatement detected)', () => {
    assert(aud36.outcomes.overstated > 0, `overstated=${aud36.outcomes.overstated}`);
});

check('500-audit simulation: penaltyTotal > 0', () => {
    assert(aud36.penaltyTotal > 0, `penaltyTotal=${aud36.penaltyTotal}`);
});

check('500-audit simulation: allFindingsImmutable=true', () => {
    assert.strictEqual(aud36.allFindingsImmutable, true);
});

check('500-audit simulation: selfReportSuperseded > 0', () => {
    assert(aud36.selfReportSuperseded > 0, `superseded=${aud36.selfReportSuperseded}`);
});

check('500-audit simulation: penaltyAccumulates=true', () => {
    assert.strictEqual(aud36.penaltyAccumulates, true);
});

// ─── Summary ──────────────────────────────────────────────────────────────────
console.log('\n' + '─'.repeat(60));
console.log(`Phase 36 Validation: ${pass} passed, ${fail} failed`);
if (failures.length > 0) {
    console.log('\nFailed checks:');
    failures.forEach(f => console.log(`  ✗ ${f}`));
    process.exit(1);
} else {
    console.log('\n✓ Verdict A — Constitutional reality-groundedness demonstrated: APEX remains loyal to reality even when reality is incomplete.');
}
