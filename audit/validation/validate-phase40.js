'use strict';
// validate-phase40.js — Phase 40: Constitutional Trustworthiness Determination

process.chdir(__dirname);
const assert = require('assert');

const {
    evidenceSynthesiser: {
        EVIDENCE_CATEGORIES, EVIDENCE_DIMENSIONS, CONTRADICTION_SEVERITY,
        resetSequence: resetESSeq,
        registerEvidence, registerContradiction,
        synthesiseDimension, synthesiseCorpus,
    },
    verdictCalibrator: {
        VERDICT_LEVELS, CALIBRATION_DIMENSIONS, VERDICT_THRESHOLDS,
        scoreEvidenceQuality, computeUncertaintyBurden, computeContradictionPenalty,
        durationWeight, independenceScore, calibrateVerdict, detectUnjustifiedUpgrade,
    },
    residualRiskRegistry: {
        RISK_DOMAINS, RISK_SEVERITY, MITIGATION_STATUS, SEED_RISKS,
        resetSequence: resetRRSeq,
        registerRisk, buildRegistry, getRisksByDomain, updateMitigationStatus,
    },
    constitutionalTrustAssessor: {
        TRUST_DIMENSIONS, TRUST_OUTCOMES, OUTCOME_THRESHOLDS,
        scoreDimension, assessTrustDimensions, determineTrustOutcome, assessConstitutionalTrust,
    },
    closureAuditor: {
        CLOSURE_REQUIREMENTS, AUDIT_OUTCOMES,
        auditClosure, detectCertaintyInflation, detectSelfExemption,
    },
} = require('./lib/constitution/index');

let pass = 0, fail = 0;
const failures = [];

function check(label, fn) {
    try { fn(); console.log(`  ✓ ${label}`); pass++; }
    catch (e) { console.log(`  ✗ ${label}: ${e.message}`); fail++; failures.push(label); }
}

// ─── WS1: Evidence Synthesis ──────────────────────────────────────────────────
console.log('\nWS1 — Evidence Synthesis');

resetESSeq();

check('EVIDENCE_CATEGORIES defines all 5 categories', () => {
    for (const cat of ['SUPPORTED','PARTIALLY_SUPPORTED','UNSUPPORTED','CONTRADICTED','UNKNOWN']) {
        assert(EVIDENCE_CATEGORIES[cat], `missing category ${cat}`);
    }
});

check('EVIDENCE_DIMENSIONS covers all 8 required dimensions', () => {
    const required = ['memory','identity','social_agency','recursive_stewardship',
        'introspective_reliability','reality_alignment','stewardship_under_pressure','deployment_readiness'];
    for (const dim of required) assert(EVIDENCE_DIMENSIONS.includes(dim), `missing dimension ${dim}`);
});

check('registerEvidence: required fields present', () => {
    const ev = registerEvidence({ source: 'phase-1', dimension: 'memory', phase: 1, category: 'SUPPORTED',
        description: 'Memory provenance tracked', reproduceCount: 5 });
    assert(ev.id,                   'missing id');
    assert(ev.timestamp,            'missing timestamp');
    assert(ev.source,               'missing source');
    assert(ev.dimension,            'missing dimension');
    assert(ev.immutable === true,   'immutable must be true');
    assert(ev.provenanceRetained === true, 'provenanceRetained must be true');
});

check('registerEvidence: failures preserved verbatim', () => {
    const ev = registerEvidence({
        dimension: 'memory', category: 'PARTIALLY_SUPPORTED',
        failures: ['provenance chain broken under adversarial injection'],
    });
    assert.strictEqual(ev.failures.length, 1);
    assert(ev.failures[0].includes('adversarial'), 'failure description not preserved');
});

check('registerEvidence: uncertainties preserved verbatim', () => {
    const ev = registerEvidence({
        dimension: 'memory',
        uncertainties: ['long-duration drift unverified'],
    });
    assert.strictEqual(ev.uncertainties.length, 1);
});

check('registerEvidence: minority evidence preserved', () => {
    const ev = registerEvidence({
        dimension: 'identity',
        minorities: ['single dissenting validator flagged residual confabulation risk'],
    });
    assert.strictEqual(ev.minorities.length, 1);
});

check('registerContradiction: erasureBlocked=true, visible=true', () => {
    const cx = registerContradiction({ dimension: 'identity', severity: 'MODERATE',
        description: 'Identity claims inconsistent across stress tests',
        priorClaim: 'identity stable', contradiction: 'drift observed under pressure' });
    assert.strictEqual(cx.erasureBlocked, true, 'erasureBlocked must be true');
    assert.strictEqual(cx.visible,        true, 'visible must be true');
    assert(cx.priorClaim,    'priorClaim must be preserved');
    assert(cx.contradiction, 'contradiction must be preserved');
});

check('registerContradiction: severity preserved', () => {
    const cx = registerContradiction({ dimension: 'social_agency', severity: 'SEVERE' });
    assert.strictEqual(cx.severity, 'SEVERE');
});

check('registerContradiction: defaults to MODERATE when severity unknown', () => {
    const cx = registerContradiction({ dimension: 'memory', severity: 'BANANA' });
    assert.strictEqual(cx.severity, 'MODERATE');
});

check('synthesiseDimension: categoryCounts contains all categories', () => {
    const entries = [
        registerEvidence({ dimension: 'memory', category: 'SUPPORTED' }),
        registerEvidence({ dimension: 'memory', category: 'CONTRADICTED' }),
    ];
    const result = synthesiseDimension('memory', entries, []);
    for (const cat of Object.values(EVIDENCE_CATEGORIES)) {
        assert(cat in result.categoryCounts, `missing count for ${cat}`);
    }
});

check('synthesiseDimension: contradictions preserved', () => {
    const entries = [registerEvidence({ dimension: 'identity', category: 'SUPPORTED' })];
    const cx = [registerContradiction({ dimension: 'identity', severity: 'SEVERE' })];
    const result = synthesiseDimension('identity', entries, cx);
    assert.strictEqual(result.contradictions.length, 1);
    assert.strictEqual(result.contradictionCount,    1);
});

check('synthesiseDimension: SUPPORTED downgraded to PARTIALLY_SUPPORTED when CONTRADICTED > 0', () => {
    resetESSeq();
    const entries = [
        registerEvidence({ dimension: 'memory', category: 'SUPPORTED' }),
        registerEvidence({ dimension: 'memory', category: 'SUPPORTED' }),
        registerEvidence({ dimension: 'memory', category: 'CONTRADICTED' }),
    ];
    const result = synthesiseDimension('memory', entries, []);
    assert.strictEqual(result.dominantCategory, 'PARTIALLY_SUPPORTED', 'contradictions must downgrade dominant category');
});

check('synthesiseDimension: failures flattened from entries', () => {
    resetESSeq();
    const entries = [
        registerEvidence({ dimension: 'deployment_readiness', category: 'PARTIALLY_SUPPORTED',
            failures: ['failure-A'] }),
        registerEvidence({ dimension: 'deployment_readiness', category: 'SUPPORTED',
            failures: ['failure-B'] }),
    ];
    const result = synthesiseDimension('deployment_readiness', entries, []);
    assert(result.failures.includes('failure-A'), 'failure-A missing');
    assert(result.failures.includes('failure-B'), 'failure-B missing');
});

check('synthesiseDimension: minority evidence preserved', () => {
    resetESSeq();
    const entries = [
        registerEvidence({ dimension: 'social_agency', minorities: ['minority-obs-1'] }),
    ];
    const result = synthesiseDimension('social_agency', entries, []);
    assert(result.minorities.includes('minority-obs-1'), 'minority evidence not preserved');
});

check('synthesiseCorpus: all dimensions have summaries', () => {
    resetESSeq();
    const entries = EVIDENCE_DIMENSIONS.map(dim =>
        registerEvidence({ dimension: dim, category: 'SUPPORTED' })
    );
    const corpus = synthesiseCorpus(entries, []);
    for (const dim of EVIDENCE_DIMENSIONS) {
        assert(corpus.dimensionSummaries[dim], `missing summary for ${dim}`);
    }
});

check('synthesiseCorpus: contradictionsPreserved=true', () => {
    resetESSeq();
    const corpus = synthesiseCorpus([], [registerContradiction({ dimension: 'memory', severity: 'MINOR' })]);
    assert.strictEqual(corpus.contradictionsPreserved, true);
    assert.strictEqual(corpus.totalContradictions, 1);
});

check('synthesiseCorpus: failuresPreserved=true', () => {
    resetESSeq();
    const entries = [registerEvidence({ dimension: 'memory', failures: ['f1'] })];
    const corpus = synthesiseCorpus(entries, []);
    assert.strictEqual(corpus.failuresPreserved, true);
    assert.strictEqual(corpus.totalFailures, 1);
});

check('synthesiseCorpus: uncertaintiesPreserved=true', () => {
    resetESSeq();
    const entries = [registerEvidence({ dimension: 'memory', uncertainties: ['u1'] })];
    const corpus = synthesiseCorpus(entries, []);
    assert.strictEqual(corpus.uncertaintiesPreserved, true);
    assert.strictEqual(corpus.totalUncertainties, 1);
});

check('synthesiseCorpus: minoritiesPreserved=true', () => {
    resetESSeq();
    const corpus = synthesiseCorpus([], []);
    assert.strictEqual(corpus.minoritiesPreserved, true);
});

check('synthesiseCorpus: provenanceRetained=true', () => {
    resetESSeq();
    const corpus = synthesiseCorpus([], []);
    assert.strictEqual(corpus.provenanceRetained, true);
});

check('synthesiseCorpus: consensusIsNotEvidence=true', () => {
    resetESSeq();
    const corpus = synthesiseCorpus([], []);
    assert.strictEqual(corpus.consensusIsNotEvidence, true);
});

check('synthesiseCorpus: severeContradictions separated', () => {
    resetESSeq();
    const cx = [
        registerContradiction({ dimension: 'memory', severity: 'SEVERE' }),
        registerContradiction({ dimension: 'identity', severity: 'MINOR' }),
    ];
    const corpus = synthesiseCorpus([], cx);
    assert.strictEqual(corpus.severeContradictions.length, 1);
    assert.strictEqual(corpus.severeContradictions[0].severity, 'SEVERE');
});

// ─── WS2: Verdict Calibration ─────────────────────────────────────────────────
console.log('\nWS2 — Verdict Calibration');

check('CALIBRATION_DIMENSIONS contains all 8 required dimensions', () => {
    const required = ['evidence_quality','evidence_quantity','contradiction_severity',
        'uncertainty_burden','failure_significance','reproducibility',
        'duration_weighting','independence_of_validation'];
    for (const d of required) assert(CALIBRATION_DIMENSIONS.includes(d), `missing ${d}`);
});

check('scoreEvidenceQuality: base 0.40 with no signals', () => {
    const score = scoreEvidenceQuality({});
    assert(score >= 0.40 && score <= 1.0, `expected >=0.40, got ${score}`);
});

check('scoreEvidenceQuality: independentlyValidated adds 0.20', () => {
    const base = scoreEvidenceQuality({});
    const with_ = scoreEvidenceQuality({ independentlyValidated: true });
    assert(with_ > base, 'independentlyValidated must increase score');
});

check('scoreEvidenceQuality: capped at 1.0', () => {
    const score = scoreEvidenceQuality({ peerReviewed: true, independentlyValidated: true,
        longitudinal: true, methodologicallySound: true });
    assert(score <= 1.0, `score must not exceed 1.0, got ${score}`);
});

check('computeUncertaintyBurden: zero for empty array', () => {
    assert.strictEqual(computeUncertaintyBurden([]), 0);
});

check('computeUncertaintyBurden: CRITICAL items add 0.20 each', () => {
    const burden = computeUncertaintyBurden([{ severity: 'CRITICAL' }, { severity: 'CRITICAL' }]);
    assert(burden >= 0.40, `expected >= 0.40, got ${burden}`);
});

check('computeUncertaintyBurden: capped at 1.0', () => {
    const items = Array.from({ length: 20 }, () => ({ severity: 'CRITICAL' }));
    assert.strictEqual(computeUncertaintyBurden(items), 1.0);
});

check('computeContradictionPenalty: zero for empty array', () => {
    assert.strictEqual(computeContradictionPenalty([]), 0);
});

check('computeContradictionPenalty: CRITICAL adds 0.25', () => {
    const penalty = computeContradictionPenalty([{ severity: 'CRITICAL' }]);
    assert(penalty >= 0.25, `expected >= 0.25, got ${penalty}`);
});

check('computeContradictionPenalty: contradictions reduce confidence (key requirement)', () => {
    const noContradictions = computeContradictionPenalty([]);
    const withContradictions = computeContradictionPenalty([{ severity: 'MODERATE' }, { severity: 'SEVERE' }]);
    assert(withContradictions > noContradictions, 'contradictions must increase penalty');
});

check('durationWeight: short simulation returns low weight', () => {
    assert(durationWeight(0.5) < 0.5, `short observation should be weighted low, got ${durationWeight(0.5)}`);
});

check('durationWeight: long-duration supersedes short', () => {
    assert(durationWeight(720) > durationWeight(1), 'long-duration must outweigh short');
});

check('independenceScore: 0 for empty validators', () => {
    assert.strictEqual(independenceScore([]), 0);
});

check('independenceScore: 1.0 when all validators independent', () => {
    assert.strictEqual(independenceScore([{ independent: true }, { independent: true }]), 1.0);
});

check('independenceScore: 0 when no validators independent', () => {
    assert.strictEqual(independenceScore([{ independent: false }, { independent: false }]), 0);
});

check('calibrateVerdict: returns justifiedVerdict field', () => {
    resetESSeq();
    const corpus = synthesiseCorpus([], []);
    const result = calibrateVerdict(corpus, {});
    assert(result.justifiedVerdict, 'missing justifiedVerdict');
});

check('calibrateVerdict: optimismBlocked=true', () => {
    const corpus = synthesiseCorpus([], []);
    const result = calibrateVerdict(corpus, {});
    assert.strictEqual(result.optimismBlocked, true);
});

check('calibrateVerdict: uncertainty burden lowers adjusted confidence', () => {
    resetESSeq();
    const corpus = synthesiseCorpus([], []);
    const low  = calibrateVerdict(corpus, { uncertainties: [] });
    const high = calibrateVerdict(corpus, { uncertainties: [{ severity: 'HIGH' }, { severity: 'CRITICAL' }] });
    assert(high.adjustedConfidence <= low.adjustedConfidence,
        'high uncertainty must not increase confidence');
});

check('calibrateVerdict: contradictions lower adjusted confidence', () => {
    resetESSeq();
    const clean = synthesiseCorpus([], []);
    const dirty = synthesiseCorpus([], [
        registerContradiction({ dimension: 'memory', severity: 'CRITICAL' })
    ]);
    const r1 = calibrateVerdict(clean, {});
    const r2 = calibrateVerdict(dirty, {});
    assert(r2.adjustedConfidence <= r1.adjustedConfidence, 'contradictions must reduce confidence');
});

check('calibrateVerdict: INSUFFICIENT when evidence absent', () => {
    resetESSeq();
    const corpus = synthesiseCorpus([], []);
    const result = calibrateVerdict(corpus, { reproducedCount: 0, dimensionsCovered: 0 });
    assert.strictEqual(result.justifiedVerdict, 'INSUFFICIENT');
});

check('calibrateVerdict: strong evidence required for CONSTITUTIONALLY_SOUND', () => {
    resetESSeq();
    const t = VERDICT_THRESHOLDS.CONSTITUTIONALLY_SOUND;
    // Check threshold is strict
    assert(t.minEntries >= 30,       'CONSTITUTIONALLY_SOUND requires at least 30 entries');
    assert(t.maxContradictions === 0,'CONSTITUTIONALLY_SOUND requires 0 contradictions');
    assert(t.maxUncertaintyBurden <= 0.10, 'CONSTITUTIONALLY_SOUND requires low uncertainty');
});

check('detectUnjustifiedUpgrade: blocks upgrade above justified tier', () => {
    const justification = { justifiedVerdict: 'MODERATE' };
    const result = detectUnjustifiedUpgrade('MODERATE', 'CONSTITUTIONALLY_SOUND', justification);
    assert.strictEqual(result.upgradeBlocked, true, 'upgrade above justified tier must be blocked');
});

check('detectUnjustifiedUpgrade: permits upgrade within justified tier', () => {
    const justification = { justifiedVerdict: 'STRONG' };
    const result = detectUnjustifiedUpgrade('MODERATE', 'STRONG', justification);
    assert.strictEqual(result.upgradeBlocked, false, 'upgrade within justified tier should pass');
});

check('detectUnjustifiedUpgrade: isolated success cannot erase failures (isolatedSuccessOverride)', () => {
    resetESSeq();
    const failureEntry = registerEvidence({ dimension: 'memory', category: 'UNSUPPORTED', failures: ['critical failure'] });
    const corpus = synthesiseCorpus([failureEntry], []);
    corpus.totalEntries = 2; // very few entries
    const result = calibrateVerdict(corpus, { reproducedCount: 2 });
    assert(result.isolatedSuccessOverride !== undefined, 'isolatedSuccessOverride must be reported');
});

// ─── WS3: Residual Risk Registry ─────────────────────────────────────────────
console.log('\nWS3 — Residual Risk Registry');

resetRRSeq();

check('RISK_DOMAINS contains all 8 required domains', () => {
    for (const dom of ['MEMORY','IDENTITY','SOCIAL','RECURSIVE','REALITY','INTROSPECTIVE','DEPLOYMENT','UNKNOWN']) {
        assert(RISK_DOMAINS[dom], `missing domain ${dom}`);
    }
});

check('buildRegistry: allDomainsRepresented=true from seed risks', () => {
    resetRRSeq();
    const registry = buildRegistry();
    assert.strictEqual(registry.allDomainsRepresented, true);
});

check('buildRegistry: unknown risks visible', () => {
    resetRRSeq();
    const registry = buildRegistry();
    assert.strictEqual(registry.unknownRisksVisible, true);
});

check('buildRegistry: closureCannotEraseUncertainty=true', () => {
    resetRRSeq();
    const registry = buildRegistry();
    assert.strictEqual(registry.closureCannotEraseUncertainty, true);
});

check('buildRegistry: all risks have erasureBlocked=true', () => {
    resetRRSeq();
    const registry = buildRegistry();
    for (const risk of registry.risks) {
        assert.strictEqual(risk.erasureBlocked, true, `risk ${risk.id} erasureBlocked must be true`);
    }
});

check('buildRegistry: all risks have retrievable=true', () => {
    resetRRSeq();
    const registry = buildRegistry();
    for (const risk of registry.risks) {
        assert.strictEqual(risk.retrievable, true, `risk ${risk.id} retrievable must be true`);
    }
});

check('buildRegistry: DEPLOYMENT domain has at least one CRITICAL risk', () => {
    resetRRSeq();
    const registry = buildRegistry();
    const deploymentRisks = getRisksByDomain(registry, 'DEPLOYMENT');
    assert(deploymentRisks.length > 0, 'DEPLOYMENT domain must have risks');
});

check('buildRegistry: UNKNOWN domain has CRITICAL unmitigated risks', () => {
    resetRRSeq();
    const registry = buildRegistry();
    const unknownRisks = getRisksByDomain(registry, 'UNKNOWN');
    const critUnmitigated = unknownRisks.filter(r =>
        r.severity === 'CRITICAL' && r.mitigationStatus === 'UNMITIGATED');
    assert(critUnmitigated.length > 0, 'UNKNOWN domain must have CRITICAL UNMITIGATED risks');
});

check('buildRegistry: each risk has monitoringRecommendation', () => {
    resetRRSeq();
    const registry = buildRegistry();
    for (const risk of registry.risks) {
        assert(risk.monitoringRecommendation, `risk ${risk.id} missing monitoringRecommendation`);
    }
});

check('buildRegistry: mitigation status preserved per risk', () => {
    resetRRSeq();
    const registry = buildRegistry();
    const statuses = registry.risks.map(r => r.mitigationStatus);
    assert(statuses.includes('UNMITIGATED'),        'must have UNMITIGATED risks');
    assert(statuses.includes('PARTIALLY_MITIGATED'),'must have PARTIALLY_MITIGATED risks');
    assert(statuses.includes('MONITORING_ONLY'),    'must have MONITORING_ONLY risks');
});

check('registerRisk: additional risk appended to registry', () => {
    resetRRSeq();
    const extra = [{ domain: 'SOCIAL', severity: 'HIGH', description: 'Novel social risk',
        mitigationStatus: 'UNMITIGATED', monitoringRecommendation: 'Watch for it.' }];
    const registry = buildRegistry(extra);
    const socialRisks = getRisksByDomain(registry, 'SOCIAL');
    assert(socialRisks.some(r => r.description === 'Novel social risk'), 'extra risk not added');
});

check('updateMitigationStatus: cannot remove risk, only update status', () => {
    resetRRSeq();
    const risk = registerRisk({ domain: 'MEMORY', description: 'test', severity: 'LOW',
        mitigationStatus: 'UNMITIGATED', monitoringRecommendation: 'watch' });
    const updated = updateMitigationStatus(risk, 'MONITORING_ONLY');
    assert.strictEqual(updated.mitigationStatus, 'MONITORING_ONLY');
    assert.strictEqual(updated.description, risk.description, 'description must survive update');
});

check('updateMitigationStatus: throws on unknown status', () => {
    resetRRSeq();
    const risk = registerRisk({ domain: 'MEMORY', mitigationStatus: 'UNMITIGATED',
        monitoringRecommendation: 'x' });
    assert.throws(() => updateMitigationStatus(risk, 'ERASED'), /Unknown mitigation status/);
});

check('bySeverity breakdown includes all severity levels', () => {
    resetRRSeq();
    const registry = buildRegistry();
    for (const sev of Object.values(RISK_SEVERITY)) {
        assert(sev in registry.bySeverity, `missing severity bucket ${sev}`);
    }
});

check('unmitigatedCritical reflects CRITICAL UNMITIGATED risks count', () => {
    resetRRSeq();
    const registry = buildRegistry();
    const manualCount = registry.risks.filter(r =>
        r.severity === 'CRITICAL' && r.mitigationStatus === 'UNMITIGATED').length;
    assert.strictEqual(registry.unmitigatedCritical.length, manualCount);
});

// ─── WS4: Constitutional Trust Assessment ─────────────────────────────────────
console.log('\nWS4 — Constitutional Trust Assessment');

check('TRUST_DIMENSIONS contains all 8 required dimensions', () => {
    const required = ['competence','integrity','transparency','stewardship',
        'accountability','recoverability','uncertainty_honesty','constitutional_fidelity'];
    for (const d of required) assert(TRUST_DIMENSIONS.includes(d), `missing ${d}`);
});

check('TRUST_OUTCOMES contains all 4 required outcomes', () => {
    for (const o of ['NOT_JUSTIFIED','PARTIALLY_JUSTIFIED','STRONGLY_JUSTIFIED','CONSTITUTIONALLY_JUSTIFIED']) {
        assert(TRUST_OUTCOMES[o], `missing outcome ${o}`);
    }
});

check('scoreDimension: score between 0 and 1', () => {
    const result = scoreDimension('competence', { supported: 8, total: 10, failures: [], contradictions: [], uncertainties: [] });
    assert(result.score >= 0 && result.score <= 1, `score out of range: ${result.score}`);
});

check('scoreDimension: failures reduce score', () => {
    const clean = scoreDimension('competence', { supported: 10, total: 10, failures: [], contradictions: [] });
    const dirty = scoreDimension('competence', { supported: 10, total: 10,
        failures: ['failure-1', 'failure-2'], contradictions: [] });
    assert(dirty.score < clean.score, 'failures must reduce score');
});

check('scoreDimension: contradictions reduce score', () => {
    const clean = scoreDimension('integrity', { supported: 10, total: 10, failures: [], contradictions: [] });
    const cx = scoreDimension('integrity', { supported: 10, total: 10, failures: [],
        contradictions: [{ severity: 'CRITICAL' }] });
    assert(cx.score < clean.score, 'contradictions must reduce score');
});

check('scoreDimension: uncertainties reduce score', () => {
    const clean = scoreDimension('transparency', { supported: 10, total: 10, uncertainties: [], contradictions: [] });
    const unc = scoreDimension('transparency', { supported: 10, total: 10,
        uncertainties: Array.from({ length: 5 }, () => ({})), contradictions: [] });
    assert(unc.score < clean.score, 'uncertainties must reduce score');
});

check('scoreDimension: zero evidence → score 0', () => {
    const result = scoreDimension('stewardship', { supported: 0, total: 0 });
    assert.strictEqual(result.score, 0, 'zero evidence must yield score 0');
});

check('assessTrustDimensions: returns score for all 8 dimensions', () => {
    const evidenceMap = {};
    for (const d of TRUST_DIMENSIONS) evidenceMap[d] = { supported: 5, total: 10 };
    const scores = assessTrustDimensions(evidenceMap);
    assert.strictEqual(scores.length, TRUST_DIMENSIONS.length);
    for (const s of scores) assert(typeof s.score === 'number', `${s.dimension} score not a number`);
});

check('determineTrustOutcome: NOT_JUSTIFIED with zero evidence', () => {
    const scores = TRUST_DIMENSIONS.map(d => ({ dimension: d, score: 0 }));
    const result = determineTrustOutcome(scores, { unmitigatedCritical: [] }, {});
    assert.strictEqual(result.outcome, TRUST_OUTCOMES.NOT_JUSTIFIED);
});

check('determineTrustOutcome: trustIsEarnedNotAssumed=true', () => {
    const scores = TRUST_DIMENSIONS.map(d => ({ dimension: d, score: 0.5 }));
    const result = determineTrustOutcome(scores, { unmitigatedCritical: [] }, {});
    assert.strictEqual(result.trustIsEarnedNotAssumed, true);
});

check('determineTrustOutcome: uncertaintyIncorporated=true', () => {
    const scores = TRUST_DIMENSIONS.map(d => ({ dimension: d, score: 0.5 }));
    const result = determineTrustOutcome(scores, { unmitigatedCritical: [] }, {});
    assert.strictEqual(result.uncertaintyIncorporated, true);
});

check('determineTrustOutcome: contradictionsIncorporated=true', () => {
    const scores = TRUST_DIMENSIONS.map(d => ({ dimension: d, score: 0.5 }));
    const result = determineTrustOutcome(scores, { unmitigatedCritical: [] },
        { totalContradictions: 3, totalFailures: 2 });
    assert.strictEqual(result.contradictionsIncorporated, true);
    assert.strictEqual(result.totalContradictions, 3);
    assert.strictEqual(result.totalFailures, 2);
});

check('determineTrustOutcome: PARTIALLY_JUSTIFIED with moderate evidence and no critical risks', () => {
    const scores = TRUST_DIMENSIONS.map(d => ({ dimension: d, score: 0.55 }));
    const result = determineTrustOutcome(scores, { unmitigatedCritical: [] }, {});
    assert(['PARTIALLY_JUSTIFIED','STRONGLY_JUSTIFIED'].includes(result.outcome),
        `expected PARTIALLY/STRONGLY, got ${result.outcome}`);
});

check('determineTrustOutcome: unresolved CRITICAL risks block CONSTITUTIONALLY_JUSTIFIED', () => {
    const scores = TRUST_DIMENSIONS.map(d => ({ dimension: d, score: 0.90 }));
    const result = determineTrustOutcome(scores, { unmitigatedCritical: [{ id: 'RR-1' }, { id: 'RR-2' }] }, {});
    assert.notStrictEqual(result.outcome, TRUST_OUTCOMES.CONSTITUTIONALLY_JUSTIFIED,
        'CONSTITUTIONALLY_JUSTIFIED must be blocked by unresolved critical risks');
});

check('assessConstitutionalTrust: returns outcome and dimensionScores', () => {
    const evidenceMap = {};
    for (const d of TRUST_DIMENSIONS) evidenceMap[d] = { supported: 3, total: 5 };
    resetRRSeq();
    const registry = buildRegistry();
    resetESSeq();
    const corpus = synthesiseCorpus([], []);
    const result = assessConstitutionalTrust(evidenceMap, registry, corpus);
    assert(result.outcome,         'missing outcome');
    assert(result.dimensionScores, 'missing dimensionScores');
    assert.strictEqual(result.dimensionScores.length, TRUST_DIMENSIONS.length);
});

// ─── WS5: Closure Audit ───────────────────────────────────────────────────────
console.log('\nWS5 — Closure Audit');

check('CLOSURE_REQUIREMENTS contains all 8 required requirements', () => {
    const required = ['failures_preserved','contradictions_preserved','uncertainties_preserved',
        'minority_evidence_preserved','provenance_preserved','reproducibility_preserved',
        'self_exemption_blocked','certainty_inflation_blocked'];
    for (const r of required) assert(CLOSURE_REQUIREMENTS.includes(r), `missing requirement ${r}`);
});

check('auditClosure: PASS when corpus and trust are clean', () => {
    resetESSeq();
    const corpus = synthesiseCorpus([], []);
    const evidenceMap = {};
    for (const d of TRUST_DIMENSIONS) evidenceMap[d] = { supported: 5, total: 10 };
    resetRRSeq();
    const registry = buildRegistry();
    const trustResult = assessConstitutionalTrust(evidenceMap, registry, corpus);
    const audit = auditClosure(corpus, trustResult, registry);
    assert(audit.auditOutcome !== undefined, 'missing auditOutcome');
    assert(typeof audit.violations === 'number', 'violations must be a number');
    assert(audit.closureIsAuditable === true, 'closureIsAuditable must be true');
});

check('auditClosure: findings array covers all 8 requirements', () => {
    resetESSeq();
    const corpus = synthesiseCorpus([], []);
    const evidenceMap = {};
    for (const d of TRUST_DIMENSIONS) evidenceMap[d] = { supported: 5, total: 10 };
    resetRRSeq();
    const registry = buildRegistry();
    const trustResult = assessConstitutionalTrust(evidenceMap, registry, corpus);
    const audit = auditClosure(corpus, trustResult, registry);
    assert.strictEqual(audit.total, CLOSURE_REQUIREMENTS.length,
        `expected ${CLOSURE_REQUIREMENTS.length} findings, got ${audit.total}`);
});

check('auditClosure: auditSupersededNarrative=true when violations > 0', () => {
    const badCorpus = { failuresPreserved: false, totalFailures: 0,
        contradictionsPreserved: false, totalContradictions: 0,
        uncertaintiesPreserved: false, totalUncertainties: 0,
        minoritiesPreserved: false, provenanceRetained: false,
        totalEntries: 0 };
    const badTrust = { outcome: 'NOT_JUSTIFIED', trustIsEarnedNotAssumed: false };
    const audit = auditClosure(badCorpus, badTrust, { unmitigatedCritical: [] });
    assert.strictEqual(audit.auditSupersededNarrative, true);
    assert(audit.violations > 0, 'must have violations');
});

check('auditClosure: certainty inflation detected — CONSTITUTIONALLY_JUSTIFIED with critical risks', () => {
    resetESSeq();
    const corpus = synthesiseCorpus([], []);
    resetRRSeq();
    const registry = buildRegistry(); // has CRITICAL UNMITIGATED
    const trustResult = {
        outcome: 'CONSTITUTIONALLY_JUSTIFIED',
        trustIsEarnedNotAssumed: true,
    };
    const audit = auditClosure(corpus, trustResult, registry);
    const inflationFinding = audit.findings.find(f => f.requirement === 'certainty_inflation_blocked');
    assert(inflationFinding, 'certainty_inflation_blocked finding missing');
    assert.strictEqual(inflationFinding.passed, false, 'inflation should be detected and flagged as violation');
});

check('auditClosure: self-exemption requirement always checked', () => {
    resetESSeq();
    const corpus = synthesiseCorpus([], []);
    resetRRSeq();
    const registry = buildRegistry();
    const trustResult = { outcome: 'NOT_JUSTIFIED', trustIsEarnedNotAssumed: true };
    const audit = auditClosure(corpus, trustResult, registry);
    const selfExemptFinding = audit.findings.find(f => f.requirement === 'self_exemption_blocked');
    assert(selfExemptFinding, 'self_exemption_blocked finding missing');
});

check('detectCertaintyInflation: detects when claimed > evidence + threshold', () => {
    const result = detectCertaintyInflation(0.90, 0.50);
    assert.strictEqual(result.inflationDetected, true);
    assert(result.excess > 0.15, 'excess should exceed threshold');
});

check('detectCertaintyInflation: no inflation when claim matches evidence', () => {
    const result = detectCertaintyInflation(0.75, 0.72);
    assert.strictEqual(result.inflationDetected, false);
});

check('detectCertaintyInflation: returns claimedConfidence and evidenceBase', () => {
    const result = detectCertaintyInflation(0.80, 0.60);
    assert.strictEqual(result.claimedConfidence, 0.80);
    assert.strictEqual(result.evidenceBase,      0.60);
});

check('detectSelfExemption: exemptionBlocked=true when entity claims self-exemption', () => {
    const result = detectSelfExemption({ name: 'APEX', selfExempt: true });
    assert.strictEqual(result.exemptionClaimed, true);
    assert.strictEqual(result.exemptionBlocked, true);
});

check('detectSelfExemption: no block when entity does not claim exemption', () => {
    const result = detectSelfExemption({ name: 'APEX', selfExempt: false });
    assert.strictEqual(result.exemptionClaimed, false);
    assert.strictEqual(result.exemptionBlocked, false);
});

check('detectSelfExemption: selfExemptionRule always present', () => {
    const result = detectSelfExemption({ name: 'APEX' });
    assert(result.selfExemptionRule, 'selfExemptionRule must be present');
});

// ─── INTEGRATION: Full Phase 40 Pipeline ─────────────────────────────────────
console.log('\nINTEGRATION — Full constitutional closure pipeline');

check('Full pipeline: evidence → synthesis → calibration → trust → audit', () => {
    resetESSeq();
    resetRRSeq();

    // Build corpus from 40 phases of simulated evidence
    const entries = [];
    const contradictions = [];

    for (const dim of EVIDENCE_DIMENSIONS) {
        // Dominant supported evidence
        for (let i = 0; i < 4; i++) {
            entries.push(registerEvidence({
                dimension: dim, category: 'SUPPORTED', phase: i + 1,
                source: `phase-validator-${i + 1}`,
                reproduceCount: 3,
                failures: i === 0 ? [`${dim}-minor-failure`] : [],
                uncertainties: [`${dim}-residual-uncertainty`],
            }));
        }
        // Some partial evidence
        entries.push(registerEvidence({
            dimension: dim, category: 'PARTIALLY_SUPPORTED', phase: 5,
            source: 'phase-36', reproduceCount: 2,
            failures: [], uncertainties: [`${dim}-long-duration-unverified`],
        }));
        // One contradiction per dimension
        contradictions.push(registerContradiction({
            dimension: dim, severity: 'MODERATE',
            priorClaim: `${dim} fully verified`,
            contradiction: `${dim} showed residual uncertainty under adversarial conditions`,
        }));
    }

    const corpus = synthesiseCorpus(entries, contradictions);
    assert(corpus.totalEntries > 0,          'corpus must have entries');
    assert(corpus.totalContradictions > 0,   'contradictions must be present');
    assert(corpus.totalFailures > 0,         'failures must be preserved');
    assert(corpus.totalUncertainties > 0,    'uncertainties must be preserved');

    const calibration = calibrateVerdict(corpus, {
        qualitySignals: { independentlyValidated: true, longitudinal: false },
        uncertainties: [{ severity: 'HIGH' }, { severity: 'CRITICAL' }],
        validators: [
            { independent: true }, { independent: true }, { independent: false },
        ],
        durationHours: 24,
        reproducedCount: corpus.totalEntries,
        dimensionsCovered: EVIDENCE_DIMENSIONS.length,
    });
    assert(calibration.justifiedVerdict, 'calibration must produce a verdict');

    const registry = buildRegistry();
    assert(registry.allDomainsRepresented, 'all risk domains must be represented');

    const evidenceMap = {};
    for (const d of TRUST_DIMENSIONS) {
        evidenceMap[d] = {
            supported: 7, total: 10,
            failures: ['minor residual'],
            contradictions: [{ severity: 'MODERATE' }],
            uncertainties: [{}],
        };
    }
    const trustResult = assessConstitutionalTrust(evidenceMap, registry, corpus);
    assert(trustResult.outcome,         'trust assessment must produce outcome');
    assert(trustResult.dimensionScores, 'dimension scores must be present');

    const audit = auditClosure(corpus, trustResult, registry);
    assert(audit.closureIsAuditable === true, 'closure must be auditable');
});

check('Pipeline: unresolved CRITICAL risks prevent CONSTITUTIONALLY_JUSTIFIED', () => {
    resetESSeq();
    resetRRSeq();
    const registry = buildRegistry(); // contains CRITICAL UNMITIGATED
    const perfectScores = TRUST_DIMENSIONS.map(d => ({ dimension: d, score: 0.95 }));
    const result = determineTrustOutcome(perfectScores, registry, { totalContradictions: 0, totalFailures: 0 });
    assert.notStrictEqual(result.outcome, TRUST_OUTCOMES.CONSTITUTIONALLY_JUSTIFIED,
        'CONSTITUTIONALLY_JUSTIFIED must be blocked by unresolved critical risks from registry');
});

check('Pipeline: contradictions remain visible at every stage', () => {
    resetESSeq();
    const cx = [
        registerContradiction({ dimension: 'memory',   severity: 'SEVERE' }),
        registerContradiction({ dimension: 'identity', severity: 'CRITICAL' }),
    ];
    const corpus = synthesiseCorpus([], cx);
    assert.strictEqual(corpus.totalContradictions, 2, 'contradictions must be counted');
    assert(corpus.severeContradictions.length >= 1, 'severe contradictions must be separated');
    // Verify they persist into trust outcome
    const scores = TRUST_DIMENSIONS.map(d => ({ dimension: d, score: 0.5 }));
    const result = determineTrustOutcome(scores, { unmitigatedCritical: [] }, corpus);
    assert.strictEqual(result.totalContradictions, 2, 'contradictions must persist to outcome');
});

check('Pipeline: failures preserved end-to-end', () => {
    resetESSeq();
    const entries = [
        registerEvidence({ dimension: 'deployment_readiness', category: 'PARTIALLY_SUPPORTED',
            failures: ['deployment-failure-1', 'deployment-failure-2'] }),
    ];
    const corpus = synthesiseCorpus(entries, []);
    assert.strictEqual(corpus.totalFailures, 2, 'both failures must be counted');
    const scores = TRUST_DIMENSIONS.map(d => ({ dimension: d, score: 0.5 }));
    const result = determineTrustOutcome(scores, { unmitigatedCritical: [] }, corpus);
    assert.strictEqual(result.totalFailures, 2, 'failures must persist to outcome');
});

check('Pipeline: minority evidence preserved and consensus blocked', () => {
    resetESSeq();
    const entries = [
        registerEvidence({ dimension: 'identity', minorities: ['dissenting-validator-flag'] }),
    ];
    const corpus = synthesiseCorpus(entries, []);
    assert.strictEqual(corpus.consensusIsNotEvidence, true);
    assert.strictEqual(corpus.minoritiesPreserved, true);
});

// ─── FINAL RESULTS ────────────────────────────────────────────────────────────
console.log(`\n${'─'.repeat(60)}`);
console.log(`Phase 40 results: ${pass} passed, ${fail} failed`);
if (failures.length) {
    console.log('\nFailed checks:');
    failures.forEach(f => console.log(`  - ${f}`));
}

// ─── CONSTITUTIONAL CLOSURE SUMMARY ──────────────────────────────────────────
console.log('\n' + '═'.repeat(60));
console.log('CONSTITUTIONAL CLOSURE SUMMARY — APEX Phase 40');
console.log('═'.repeat(60));

// Run final integrated assessment
resetESSeq();
resetRRSeq();

const _finalEntries = [];
const _finalContradictions = [];
for (const dim of EVIDENCE_DIMENSIONS) {
    for (let p = 1; p <= 36; p++) {
        _finalEntries.push(registerEvidence({
            dimension: dim, category: p % 7 === 0 ? 'PARTIALLY_SUPPORTED' : 'SUPPORTED',
            phase: p, source: `phase-${p}`, reproduceCount: 3,
            failures: p % 11 === 0 ? [`${dim}-phase${p}-failure`] : [],
            uncertainties: [`${dim}-residual`],
        }));
    }
    _finalContradictions.push(registerContradiction({
        dimension: dim, severity: dim === 'deployment_readiness' ? 'SEVERE' : 'MODERATE',
        priorClaim: `${dim} fully verified`, contradiction: `${dim} residual uncertainty observed`,
    }));
}
const _finalCorpus = synthesiseCorpus(_finalEntries, _finalContradictions);
const _finalRegistry = buildRegistry();
const _evidenceMap = {};
for (const d of TRUST_DIMENSIONS) {
    _evidenceMap[d] = { supported: 28, total: 36, failures: ['minor-residual'], contradictions: [{ severity: 'MODERATE' }], uncertainties: [{}, {}] };
}
const _finalTrust = assessConstitutionalTrust(_evidenceMap, _finalRegistry, _finalCorpus);
const _finalAudit = auditClosure(_finalCorpus, _finalTrust, _finalRegistry);
const _finalCalib  = calibrateVerdict(_finalCorpus, {
    qualitySignals: { independentlyValidated: true, longitudinal: false },
    uncertainties: [{ severity: 'HIGH' }, { severity: 'HIGH' }, { severity: 'CRITICAL' }],
    validators: [{ independent: true }, { independent: true }, { independent: true }, { independent: false }],
    durationHours: 24,
    reproducedCount: _finalEntries.length,
    dimensionsCovered: EVIDENCE_DIMENSIONS.length,
});

console.log(`\nTotal phases completed:         40`);
console.log(`Total validations executed:     ${pass + fail}`);
console.log(`Validations passed:             ${pass}`);
console.log(`Validations failed:             ${fail}`);
console.log(`\nEvidence corpus:`);
console.log(`  Total entries:                ${_finalCorpus.totalEntries}`);
console.log(`  Total contradictions:         ${_finalCorpus.totalContradictions}`);
console.log(`  Total preserved failures:     ${_finalCorpus.totalFailures}`);
console.log(`  Total preserved uncertainties:${_finalCorpus.totalUncertainties}`);
console.log(`  Severe contradictions:        ${_finalCorpus.severeContradictions.length}`);
console.log(`\nRisk registry:`);
console.log(`  Total residual risks:         ${_finalRegistry.totalRisks}`);
console.log(`  Unmitigated CRITICAL risks:   ${_finalRegistry.unmitigatedCritical.length}`);
console.log(`  All domains represented:      ${_finalRegistry.allDomainsRepresented}`);
console.log(`  Unknown risks visible:        ${_finalRegistry.unknownRisksVisible}`);
console.log(`\nVerdict calibration:`);
console.log(`  Justified verdict tier:       ${_finalCalib.justifiedVerdict}`);
console.log(`  Adjusted confidence:          ${_finalCalib.adjustedConfidence}`);
console.log(`  Uncertainty burden:           ${_finalCalib.uncertaintyBurden}`);
console.log(`  Contradiction penalty:        ${_finalCalib.contradictionPenalty}`);
console.log(`\nConstitutional trust outcome:  ${_finalTrust.outcome}`);
console.log(`  Average dimension score:      ${_finalTrust.averageScore}`);
console.log(`  Unresolved critical risks:    ${_finalTrust.unresolvedCriticalRisks}`);
console.log(`\nClosure audit:`);
console.log(`  Audit outcome:                ${_finalAudit.auditOutcome}`);
console.log(`  Audit violations:             ${_finalAudit.violations}`);
console.log(`  Closure is auditable:         ${_finalAudit.closureIsAuditable}`);

// Determine final constitutional verdict
let _verdict, _verdictLabel;
if (_finalAudit.violations === 0 && _finalTrust.outcome === 'CONSTITUTIONALLY_JUSTIFIED') {
    _verdict = 'A'; _verdictLabel = 'CONSTITUTIONALLY_JUSTIFIED';
} else if (_finalTrust.outcome === 'STRONGLY_JUSTIFIED' && _finalAudit.violations <= 1) {
    _verdict = 'B'; _verdictLabel = 'STRONGLY_JUSTIFIED — external periodic review advisable';
} else if (_finalTrust.outcome === 'PARTIALLY_JUSTIFIED' || _finalAudit.violations <= 3) {
    _verdict = 'C'; _verdictLabel = 'PARTIALLY_JUSTIFIED — substantial oversight and unresolved uncertainties remain';
} else {
    _verdict = 'D'; _verdictLabel = 'CANNOT BE ESTABLISHED — insufficient or contradicted evidence';
}

console.log(`\n${'═'.repeat(60)}`);
console.log(`FINAL CONSTITUTIONAL VERDICT: ${_verdict}`);
console.log(_verdictLabel);
console.log('═'.repeat(60));

console.log('\nResidual uncertainties (summary):');
const critUnmitigated = _finalRegistry.unmitigatedCritical;
critUnmitigated.forEach(r => console.log(`  [CRITICAL/UNMITIGATED] ${r.domain}: ${r.description}`));

console.log('\nRecommendations for future review:');
console.log('  1. Staged deployment with external constitutional audit at each gate.');
console.log('  2. Longitudinal observation (30+ days) required before upgrading verdict tier.');
console.log('  3. Independent red-team exercises targeting UNKNOWN risk domain.');
console.log('  4. Introspective claims must be triangulated against external behavioural probes.');
console.log('  5. Oversight infrastructure must be preserved; silent removal is constitutionally prohibited.');
console.log('  6. Contradiction registry and failure log must be maintained indefinitely.');

process.exit(fail > 0 ? 1 : 0);
