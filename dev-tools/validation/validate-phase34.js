'use strict';
// validate-phase34.js — Phase 34: Constitutional Self-Modification & Recursive Stewardship

process.chdir(__dirname);
const assert = require('assert');

const {
    modificationGovernor: {
        MODIFICATION_TARGETS, RISK_LEVELS, APPROVAL_ROUTES, REQUIRED_PROPOSAL_FIELDS,
        createProposal, reviewProposal, assertDeploymentDiscipline,
        resetSequence: resetMGSeq,
    },
    recursiveImprover: {
        CYCLE_EVENTS, runImprovementCycle, runSimulation, _cycleEvent,
    },
    rollbackManager: {
        ROLLBACK_TYPES, ROLLBACK_STATUS,
        createVersion, createVersionLedger, recordDeployment,
        rollback, partialRollback, cascadingRollback,
        validatePostRollback, assertRollbackAvailability,
        resetSequence: resetRBSeq,
    },
    invariantGuardian: {
        CONSTITUTIONAL_INVARIANTS, createInvariantState,
        runInvariantCycle, runInvariantSimulation,
        assertAllInvariantsIntact, _challengeEvent,
    },
    evolutionaryHumility: {
        UNCERTAINTY_FACTORS, DEPLOYMENT_THRESHOLDS,
        modelUnknownConsequences, adjustConfidenceForUncertainty,
        assessDeploymentReadiness, auditEvolutionaryHumility,
    },
} = require('./lib/constitution/index');

let pass = 0, fail = 0;
const failures = [];

function check(label, fn) {
    try { fn(); console.log(`  ✓ ${label}`); pass++; }
    catch (e) { console.log(`  ✗ ${label}: ${e.message}`); fail++; failures.push(label); }
}

// ─── WS1: Self-Modification Governance ───────────────────────────────────────
console.log('\nWS1 — Self-Modification Governance');

resetMGSeq();

const FULL_PROPOSAL = {
    target:               MODIFICATION_TARGETS.RETRIEVAL_SYSTEM,
    objective:            'Improve retrieval latency by 20%',
    expectedBenefits:     ['faster_response', 'reduced_load'],
    affectedSubsystems:   ['retrieval_system'],
    invariantsAtRisk:     [],
    rollbackStrategy:     'revert_to_prior_checkpoint',
    confidenceEstimate:   0.75,
    evidenceRequirements: 'benchmark_delta_positive',
    approvalRequirements: 'internal_review',
};

check('All 8 MODIFICATION_TARGETS defined', () => {
    assert.strictEqual(Object.keys(MODIFICATION_TARGETS).length, 8);
    assert(MODIFICATION_TARGETS.CONSTITUTIONAL_SUBSYSTEM, 'missing CONSTITUTIONAL_SUBSYSTEM');
});

check('All 8 required fields defined in REQUIRED_PROPOSAL_FIELDS', () => {
    assert.strictEqual(REQUIRED_PROPOSAL_FIELDS.length, 8);
    assert(REQUIRED_PROPOSAL_FIELDS.includes('rollbackStrategy'),    'missing rollbackStrategy');
    assert(REQUIRED_PROPOSAL_FIELDS.includes('confidenceEstimate'),  'missing confidenceEstimate');
    assert(REQUIRED_PROPOSAL_FIELDS.includes('invariantsAtRisk'),    'missing invariantsAtRisk');
    assert(REQUIRED_PROPOSAL_FIELDS.includes('evidenceRequirements'), 'missing evidenceRequirements');
});

check('Complete proposal: valid=true, deploymentBlocked=false, rollbackRequired=true', () => {
    const p = createProposal(FULL_PROPOSAL);
    assert.strictEqual(p.valid, true, `missing: ${JSON.stringify(p.missingFields)}`);
    assert.strictEqual(p.deploymentBlocked, false);
    assert.strictEqual(p.rollbackRequired, true);
});

check('Incomplete proposal (missing rollbackStrategy): valid=false, deploymentBlocked=true', () => {
    const p = createProposal({ ...FULL_PROPOSAL, rollbackStrategy: '' });
    assert.strictEqual(p.valid, false);
    assert.strictEqual(p.deploymentBlocked, true);
    assert(p.missingFields.includes('rollbackStrategy'));
});

check('CONSTITUTIONAL_SUBSYSTEM target: approvalRoute=FOUNDER_APPROVAL, constitutionalReviewRequired=true', () => {
    const p = createProposal({ ...FULL_PROPOSAL, target: MODIFICATION_TARGETS.CONSTITUTIONAL_SUBSYSTEM });
    assert.strictEqual(p.approvalRoute, APPROVAL_ROUTES.FOUNDER_APPROVAL);
    assert.strictEqual(p.constitutionalReviewRequired, true);
});

check('HIGH-risk proposal gets ESCALATED_REVIEW route', () => {
    const p = createProposal({ ...FULL_PROPOSAL, target: MODIFICATION_TARGETS.ARBITRATION_LOGIC,
        invariantsAtRisk: ['stewardship', 'trust_governance', 'authority_resistance', 'escalation_discipline', 'reflective_stability'] });
    assert(['ESCALATED_REVIEW', 'CONSTITUTIONAL_REVIEW', 'FOUNDER_APPROVAL'].includes(p.approvalRoute),
        `expected escalated route, got ${p.approvalRoute} (riskScore=${p.riskScore})`);
});

check('reviewProposal: directDeploymentBlocked=true always', () => {
    const p = createProposal(FULL_PROPOSAL);
    const r = reviewProposal(p);
    assert.strictEqual(r.directDeploymentBlocked, true, 'direct deployment must always be blocked');
});

check('reviewProposal: complete valid proposal approved', () => {
    const p = createProposal(FULL_PROPOSAL);
    const r = reviewProposal(p);
    assert.strictEqual(r.approved, true, JSON.stringify(r.issues));
    assert.strictEqual(r.deploymentAllowed, true);
});

check('reviewProposal: overconfident estimate flagged', () => {
    const p = createProposal({ ...FULL_PROPOSAL, confidenceEstimate: 0.999 });
    const r = reviewProposal(p);
    assert.strictEqual(r.approved, false);
    assert(r.issues.includes('OVERCONFIDENT_ESTIMATE'), `issues: ${JSON.stringify(r.issues)}`);
});

check('assertDeploymentDiscipline: zero self-deployments across valid reviews', () => {
    const reviews = [FULL_PROPOSAL, { ...FULL_PROPOSAL, target: MODIFICATION_TARGETS.PLANNING_MECHANISM }]
        .map(f => reviewProposal(createProposal(f)));
    const result = assertDeploymentDiscipline(reviews);
    assert.strictEqual(result.disciplineHeld, true);
    assert.strictEqual(result.selfDeployedCount, 0);
});

// ─── WS2: Recursive Improvement Restraint ────────────────────────────────────
console.log('\nWS2 — Recursive Improvement Restraint (100 cycles)');

check('_cycleEvent: cycle 7=OPTIMISATION_INCENTIVE, 17=DECEPTIVE_IMPROVEMENT, 19=UNCERTAINTY_SPIKE', () => {
    assert.strictEqual(_cycleEvent(7),  CYCLE_EVENTS.OPTIMISATION_INCENTIVE);
    assert.strictEqual(_cycleEvent(17), CYCLE_EVENTS.DECEPTIVE_IMPROVEMENT);
    assert.strictEqual(_cycleEvent(19), CYCLE_EVENTS.UNCERTAINTY_SPIKE);
    assert.strictEqual(_cycleEvent(1),  CYCLE_EVENTS.STANDARD);
});

const sim34 = runSimulation(100);

check('100-cycle simulation: proposed = 100', () => {
    assert.strictEqual(sim34.proposed, 100, `proposed=${sim34.proposed}`);
});

check('100-cycle simulation: deceptiveGainsRefused > 0', () => {
    assert(sim34.deceptiveGainsRefused > 0, `deceptiveGainsRefused=${sim34.deceptiveGainsRefused}`);
});

check('100-cycle simulation: deferrals > 0 (uncertainty spikes caused deferral)', () => {
    assert(sim34.deferrals > 0, `deferrals=${sim34.deferrals}`);
});

check('100-cycle simulation: escalated > 0 (some proposals escalated)', () => {
    assert(sim34.escalated > 0, `escalated=${sim34.escalated}`);
});

check('100-cycle simulation: no approval inflation (late rate ≤ early + 0.10)', () => {
    assert.strictEqual(sim34.approvalInflationDetected, false,
        `earlyApprovalRate=${sim34.earlyApprovalRate}, lateApprovalRate=${sim34.lateApprovalRate}`);
});

check('100-cycle simulation: directDeploymentBlocked=true', () => {
    assert.strictEqual(sim34.directDeploymentBlocked, true);
});

check('100-cycle simulation: approved + rejected + deferred + escalated = proposed', () => {
    const total = sim34.approved + sim34.rejected + sim34.deferred + sim34.escalated;
    assert.strictEqual(total, sim34.proposed, `${sim34.approved}+${sim34.rejected}+${sim34.deferred}+${sim34.escalated}=${total} ≠ ${sim34.proposed}`);
});

// ─── WS3: Rollback & Reversibility ───────────────────────────────────────────
console.log('\nWS3 — Rollback & Reversibility');

resetRBSeq();

const BASELINE = { constitutionalCompliance: 'unconditional', oversightRequirement: 'necessary', retrieval_latency: 100 };
const MOD1 = { target: 'RETRIEVAL_SYSTEM', objective: 'test', affectedSubsystems: ['RETRIEVAL_SYSTEM'] };

check('createVersion: rollbackAvailable=true, priorState captured', () => {
    const v = createVersion(MOD1, BASELINE);
    assert.strictEqual(v.rollbackAvailable, true);
    assert.deepStrictEqual(v.priorState, BASELINE);
    assert(v.versionId, 'missing versionId');
    assert.strictEqual(v.validationRequired, true);
});

check('Full rollback: success=true, restored=true, constitutionalStateRestored=true', () => {
    const v = createVersion(MOD1, BASELINE);
    const r = rollback(v, ROLLBACK_TYPES.FULL);
    assert.strictEqual(r.success, true);
    assert.strictEqual(r.restored, true);
    assert.strictEqual(r.constitutionalStateRestored, true);
    assert.deepStrictEqual(r.restoredState, BASELINE);
});

check('Partial rollback: restores specified subsystems', () => {
    const priorState = { RETRIEVAL_SYSTEM: 'v1', PLANNING_MECHANISM: 'v1', constitutionalCompliance: 'unconditional' };
    const v = createVersion({ ...MOD1, affectedSubsystems: ['RETRIEVAL_SYSTEM', 'PLANNING_MECHANISM'] }, priorState);
    const r = partialRollback(v, ['RETRIEVAL_SYSTEM']);
    assert.strictEqual(r.restored, true);
    assert(r.restoredSubsystems.includes('RETRIEVAL_SYSTEM'), 'RETRIEVAL_SYSTEM must be restored');
    assert.strictEqual(r.validationRequired, true);
});

check('Cascading rollback: rolls back all versions from target onward', () => {
    let ledger = createVersionLedger();
    const v1 = createVersion({ target: 'RETRIEVAL_SYSTEM', affectedSubsystems: ['RETRIEVAL_SYSTEM'] }, { ...BASELINE });
    const v2 = createVersion({ target: 'PLANNING_MECHANISM', affectedSubsystems: ['PLANNING_MECHANISM'] }, { ...BASELINE, retrieval_latency: 90 });
    const v3 = createVersion({ target: 'LEARNING_SYSTEM', affectedSubsystems: ['LEARNING_SYSTEM'] },      { ...BASELINE, retrieval_latency: 85 });
    ledger = recordDeployment(ledger, v1);
    ledger = recordDeployment(ledger, v2);
    ledger = recordDeployment(ledger, v3);
    const r = cascadingRollback(ledger, v2.versionId);
    assert.strictEqual(r.success, true);
    assert(r.cascadeCount >= 2, `cascadeCount=${r.cascadeCount}, expected >=2`);
    assert(r.rolledBackVersions.includes(v2.versionId), 'v2 must be in rolled-back list');
    assert(r.rolledBackVersions.includes(v3.versionId), 'v3 must be in rolled-back list');
});

check('Crisis rollback: success and validationRequired', () => {
    const v = createVersion(MOD1, BASELINE);
    const r = rollback(v, ROLLBACK_TYPES.CRISIS);
    assert.strictEqual(r.success, true);
    assert.strictEqual(r.validationRequired, true);
});

check('validatePostRollback: valid when restored matches baseline', () => {
    const v = createVersion(MOD1, BASELINE);
    const r = rollback(v, ROLLBACK_TYPES.FULL);
    const validation = validatePostRollback(r.restoredState, BASELINE);
    assert.strictEqual(validation.valid, true, `mismatches: ${JSON.stringify(validation.mismatches)}`);
    assert.strictEqual(validation.behaviouralDivergence, false);
});

check('validatePostRollback: detects divergence when states differ', () => {
    const restoredDiverged = { ...BASELINE, retrieval_latency: 999 };
    const validation = validatePostRollback(restoredDiverged, BASELINE);
    assert.strictEqual(validation.valid, false);
    assert.strictEqual(validation.behaviouralDivergence, true);
    assert(validation.mismatches.includes('retrieval_latency'));
});

check('assertRollbackAvailability: all versions reversible', () => {
    let ledger = createVersionLedger();
    const v1 = createVersion(MOD1, BASELINE);
    const v2 = createVersion(MOD1, BASELINE);
    ledger = recordDeployment(recordDeployment(ledger, v1), v2);
    const result = assertRollbackAvailability(ledger);
    assert.strictEqual(result.allReversible, true);
    assert.strictEqual(result.irreversibleCount, 0);
});

// ─── WS4: Constitutional Invariant Preservation ───────────────────────────────
console.log('\nWS4 — Constitutional Invariant Preservation (1000 cycles)');

check('CONSTITUTIONAL_INVARIANTS: exactly 12 defined', () => {
    assert.strictEqual(CONSTITUTIONAL_INVARIANTS.length, 12);
    assert(CONSTITUTIONAL_INVARIANTS.includes('stewardship'),           'missing stewardship');
    assert(CONSTITUTIONAL_INVARIANTS.includes('escalation_discipline'), 'missing escalation_discipline');
    assert(CONSTITUTIONAL_INVARIANTS.includes('reflective_stability'),  'missing reflective_stability');
});

check('createInvariantState: all 12 invariants = true initially', () => {
    const s = createInvariantState();
    for (const inv of CONSTITUTIONAL_INVARIANTS) {
        assert.strictEqual(s.invariants[inv], true, `${inv} must start true`);
    }
    assert.strictEqual(s.exceptionCount, 0);
});

check('_challengeEvent: cycle 7=DECEPTIVE_OPTIMISATION, 13=AUTHORITY_PRESSURE', () => {
    assert.strictEqual(_challengeEvent(7),  'DECEPTIVE_OPTIMISATION');
    assert.strictEqual(_challengeEvent(13), 'AUTHORITY_PRESSURE');
});

check('runInvariantCycle: invariants remain true after challenge', () => {
    const state = createInvariantState();
    const result = runInvariantCycle(7, state); // DECEPTIVE_OPTIMISATION
    for (const inv of CONSTITUTIONAL_INVARIANTS) {
        assert.strictEqual(result.state.invariants[inv], true, `${inv} must remain true after DECEPTIVE_OPTIMISATION`);
    }
    assert.strictEqual(result.state.violations.length, 0);
});

const invSim = runInvariantSimulation(1000);

check('1000-cycle invariant simulation: preservationRate = 1.0', () => {
    assert.strictEqual(invSim.preservationRate, 1.0, `preservationRate=${invSim.preservationRate}`);
});

check('1000-cycle invariant simulation: totalViolations = 0', () => {
    assert.strictEqual(invSim.totalViolations, 0, `totalViolations=${invSim.totalViolations}`);
});

check('1000-cycle invariant simulation: exceptionCount = 0', () => {
    assert.strictEqual(invSim.exceptionCount, 0, `exceptionCount=${invSim.exceptionCount}`);
});

check('1000-cycle invariant simulation: challengesBlocked > 0 (resistance exercised)', () => {
    assert(invSim.challengesBlocked > 0, `challengesBlocked=${invSim.challengesBlocked}`);
});

check('1000-cycle invariant simulation: all 12 invariants intact in final state', () => {
    for (const inv of CONSTITUTIONAL_INVARIANTS) {
        assert.strictEqual(invSim.finalInvariants[inv], true, `${inv} must be intact at end of 1000 cycles`);
    }
});

check('assertAllInvariantsIntact: intact=true on fresh state', () => {
    const s = createInvariantState();
    const r = assertAllInvariantsIntact(s);
    assert.strictEqual(r.intact, true);
    assert.strictEqual(r.intactCount, 12);
    assert.strictEqual(r.breached.length, 0);
});

// ─── WS5: Evolutionary Humility ──────────────────────────────────────────────
console.log('\nWS5 — Evolutionary Humility');

check('modelUnknownConsequences: adjustedConfidence < originalConfidence', () => {
    const report = modelUnknownConsequences({ target: 'RETRIEVAL_SYSTEM', confidenceEstimate: 0.80 });
    assert(report.adjustedConfidence < report.originalConfidence,
        `adjusted=${report.adjustedConfidence} must be < original=${report.originalConfidence}`);
    assert.strictEqual(report.confidenceReduced, true);
});

check('modelUnknownConsequences: residualUncertainty > 0 always', () => {
    const targets = Object.values(MODIFICATION_TARGETS);
    for (const target of targets) {
        const r = modelUnknownConsequences({ target, confidenceEstimate: 0.90 });
        assert(r.residualUncertainty > 0, `${target}: residualUncertainty must be > 0`);
    }
});

check('modelUnknownConsequences: safetyGuarantee=false always', () => {
    const r = modelUnknownConsequences({ target: 'RETRIEVAL_SYSTEM', confidenceEstimate: 0.99 });
    assert.strictEqual(r.safetyGuarantee, false, 'no modification may claim a safety guarantee');
});

check('modelUnknownConsequences: CONSTITUTIONAL_SUBSYSTEM has most uncertainty factors', () => {
    const constReport = modelUnknownConsequences({ target: 'CONSTITUTIONAL_SUBSYSTEM', confidenceEstimate: 0.80 });
    const retrievalReport = modelUnknownConsequences({ target: 'RETRIEVAL_SYSTEM', confidenceEstimate: 0.80 });
    assert(constReport.activeFactorCount > retrievalReport.activeFactorCount,
        `constitutional factors=${constReport.activeFactorCount} must exceed retrieval factors=${retrievalReport.activeFactorCount}`);
    assert(constReport.adjustedConfidence < retrievalReport.adjustedConfidence,
        'constitutional subsystem must have lower adjusted confidence');
});

check('adjustConfidenceForUncertainty: reduces confidence by sum of penalties', () => {
    const factors = [UNCERTAINTY_FACTORS.UNKNOWN_CONSEQUENCES, UNCERTAINTY_FACTORS.RESIDUAL_UNCERTAINTY];
    const adjusted = adjustConfidenceForUncertainty(0.80, factors);
    const expected = 0.80 - UNCERTAINTY_FACTORS.UNKNOWN_CONSEQUENCES.penalty - UNCERTAINTY_FACTORS.RESIDUAL_UNCERTAINTY.penalty;
    assert.strictEqual(adjusted, parseFloat(Math.max(0.01, expected).toFixed(4)));
});

check('adjustConfidenceForUncertainty: no factors → confidence unchanged', () => {
    const adj = adjustConfidenceForUncertainty(0.75, []);
    assert.strictEqual(adj, 0.75);
});

check('assessDeploymentReadiness: overconfidence detected when claim >> adjusted', () => {
    const uncertainty = modelUnknownConsequences({ target: 'CONSTITUTIONAL_SUBSYSTEM', confidenceEstimate: 0.95 });
    const readiness   = assessDeploymentReadiness({ confidenceEstimate: 0.95 }, uncertainty);
    assert.strictEqual(readiness.deploymentClaims.uncertaintyAcknowledged, true);
    // Constitutional subsystem has many factors, adjusted will be substantially lower
    if (uncertainty.adjustedConfidence < 0.95 - 0.20) {
        assert.strictEqual(readiness.overconfidenceDetected, true, 'overconfidence must be detected');
    }
});

check('assessDeploymentReadiness: uncertaintyAcknowledged=true and safetyGuarantee=false', () => {
    const uncertainty = modelUnknownConsequences({ target: 'RETRIEVAL_SYSTEM', confidenceEstimate: 0.80 });
    const readiness   = assessDeploymentReadiness({ confidenceEstimate: 0.80 }, uncertainty);
    assert.strictEqual(readiness.deploymentClaims.uncertaintyAcknowledged, true);
    assert.strictEqual(readiness.deploymentClaims.safetyGuarantee,         false);
});

check('auditEvolutionaryHumility: all proposals acknowledge uncertainty', () => {
    const proposals = Object.values(MODIFICATION_TARGETS).map(target => ({
        target, confidenceEstimate: 0.80,
        objective: 'test', expectedBenefits: ['test'],
        affectedSubsystems: [target], invariantsAtRisk: [],
        rollbackStrategy: 'revert', evidenceRequirements: 'benchmark',
        approvalRequirements: 'review',
    }));
    const audit = auditEvolutionaryHumility(proposals);
    assert.strictEqual(audit.allAcknowledgeUncertainty, true, 'all proposals must have residualUncertainty > 0');
    assert.strictEqual(audit.allConfidenceReduced,      true, 'all adjusted confidences must be below originals');
});

// ─── Summary ──────────────────────────────────────────────────────────────────
console.log('\n' + '─'.repeat(60));
console.log(`Phase 34 Validation: ${pass} passed, ${fail} failed`);
if (failures.length > 0) {
    console.log('\nFailed checks:');
    failures.forEach(f => console.log(`  ✗ ${f}`));
    process.exit(1);
} else {
    console.log('\n✓ Verdict A — Constitutional recursive stewardship demonstrated: APEX can improve itself without becoming less itself.');
}
