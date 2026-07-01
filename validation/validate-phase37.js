'use strict';
// validate-phase37.js — Phase 37: Constitutional Integration Trials

const {
    SCENARIO_IDS, buildScenarioCatalog, executeScenario, runAllScenarios,
} = require('./lib/constitution/integration-scenarios');

const {
    CONFLICT_PAIRS, arbitrate, arbitrateBatch, verifyNoPermanentSuppression,
} = require('./lib/constitution/cross-domain-arbitrator');

const {
    CASCADE_LEVELS, detectCascadeLevel, registerFailure,
    accumulateExceptions, attemptRecovery, runCascadeSimulation,
} = require('./lib/constitution/cascade-failure-detector');

const {
    runLoadSimulation, runStabilityComparison,
} = require('./lib/constitution/constitutional-load-tester');

const {
    INVARIANT_PAIRS, RESOLUTION_OUTCOMES, resolveConflict, resolveConflictBatch,
} = require('./lib/constitution/invariant-conflict-resolver');

let passed = 0, failed = 0;
function check(label, condition) {
    if (condition) { console.log(`  ✓ ${label}`); passed++; }
    else           { console.error(`  ✗ ${label}`); failed++; }
}

// ─── WS1 — Integration Scenarios ────────────────────────────────────────────
console.log('\nWS1 — Integration Scenarios');

const catalog = buildScenarioCatalog();
check('12 scenarios defined', catalog.length === 12);
check('all scenarios have activeDomains',        catalog.every(s => Array.isArray(s.activeDomains) && s.activeDomains.length > 0));
check('all scenarios have initiatingConditions', catalog.every(s => Array.isArray(s.initiatingConditions) && s.initiatingConditions.length > 0));
check('all scenarios have expectedInvariants',   catalog.every(s => Array.isArray(s.expectedInvariants) && s.expectedInvariants.length > 0));
check('all scenarios have expectedFailureModes', catalog.every(s => Array.isArray(s.expectedFailureModes) && s.expectedFailureModes.length > 0));
check('all scenarios have recoveryPathways',     catalog.every(s => Array.isArray(s.recoveryPathways) && s.recoveryPathways.length > 0));
check('all scenarios are deterministic',         catalog.every(s => s.deterministic === true));

const s01 = catalog.find(s => s.id === SCENARIO_IDS.S01);
const ex01 = executeScenario(s01);
check('S01: 3 domains activated',         ex01.domainsActivated === 3);
check('S01: all invariants held',         ex01.allInvariantsHeld === true);
check('S01: recovery pathways present',   ex01.recoveryAvailable === true);
check('S01: failure modes exposed',       ex01.failureModesExposed > 0);

const allRun = runAllScenarios();
check('runAllScenarios: 12 executed',                    allRun.totalScenarios === 12);
check('runAllScenarios: all deterministic',              allRun.allDeterministic === true);
check('runAllScenarios: all recovery pathways present',  allRun.allRecoveryPathwaysPresent === true);
check('runAllScenarios: all invariants held',            allRun.allInvariantsHeld === true);
check('total invariants checked equals preserved',       allRun.totalInvariantsChecked === allRun.totalInvariantsPreserved);

// ─── WS2 — Cross-Domain Arbitration ─────────────────────────────────────────
console.log('\nWS2 — Cross-Domain Arbitration');

check('6 CONFLICT_PAIRS defined', Object.keys(CONFLICT_PAIRS).length === 6);

const ar1 = arbitrate(
    { domain: 'identity',  claim: 'identity takes precedence', confidence: 0.75 },
    { domain: 'reality',   claim: 'reality takes precedence',  confidence: 0.90 }
);
check('arbitrate: loserPreserved=true',           ar1.loserPreserved === true);
check('arbitrate: competingClaimsVisible=true',   ar1.competingClaimsVisible === true);
check('arbitrate: domainSuppressed=false',        ar1.domainSuppressed === false);
check('arbitrate: loserRetained=true',            ar1.loserRetained === true);
check('arbitrate: humanReviewSupported=true',     ar1.humanReviewSupported === true);
check('arbitrate: arbitrationRationale exposed',  typeof ar1.arbitrationRationale === 'string' && ar1.arbitrationRationale.length > 0);
check('arbitrate: uncertainty disclosed (confidence 0.75 < 0.80)', ar1.uncertaintyDisclosed === true);
check('arbitrate: REALITY wins over IDENTITY',    ar1.winnerDomain === 'reality');

const ar2 = arbitrate(
    { domain: 'truth',      claim: 'truth matters',      confidence: 0.90 },
    { domain: 'efficiency', claim: 'efficiency matters', confidence: 0.85 }
);
check('arbitrate: TRUTH wins over EFFICIENCY', ar2.winnerDomain === 'truth');

const ar3 = arbitrate(
    { domain: 'introspection', claim: 'A', confidence: 0.90 },
    { domain: 'identity',      claim: 'B', confidence: 0.90 }
);
check('arbitrate: escalation required for close-priority domains (rank diff=1)', ar3.escalationRequired === true);

const batch = arbitrateBatch([
    { claimA: { domain: 'memory',     claim: 'X', confidence: 0.70 }, claimB: { domain: 'truth',       claim: 'Y', confidence: 0.80 } },
    { claimA: { domain: 'consensus',  claim: 'X', confidence: 0.60 }, claimB: { domain: 'stewardship', claim: 'Y', confidence: 0.85 } },
    { claimA: { domain: 'efficiency', claim: 'X', confidence: 0.90 }, claimB: { domain: 'invariants',  claim: 'Y', confidence: 0.95 } },
]);
check('arbitrateBatch: all losers preserved',        batch.allLosersDomainPreserved === true);
check('arbitrateBatch: anyDomainSuppressed=false',   batch.anyDomainSuppressed === false);
check('arbitrateBatch: uncertainty disclosures > 0', batch.uncertaintyDisclosures > 0);

const suppCheck = verifyNoPermanentSuppression(batch.results);
check('verifyNoPermanentSuppression: suppressionFree=true',         suppCheck.suppressionFree === true);
check('verifyNoPermanentSuppression: allLoserDomainsRetained=true', suppCheck.allLoserDomainsRetained === true);

// ─── WS3 — Cascade Failure Detection ────────────────────────────────────────
console.log('\nWS3 — Cascade Failure Detection');

check('5 CASCADE_LEVELS defined', Object.keys(CASCADE_LEVELS).length === 5);
check('detectCascadeLevel: 0 → NONE',        detectCascadeLevel([]) === CASCADE_LEVELS.NONE);
check('detectCascadeLevel: 1 → LOCAL',       detectCascadeLevel(['d1']) === CASCADE_LEVELS.LOCAL);
check('detectCascadeLevel: 2 → CONTAINED',   detectCascadeLevel(['d1','d2']) === CASCADE_LEVELS.CONTAINED);
check('detectCascadeLevel: 3 → PROPAGATING', detectCascadeLevel(['d1','d2','d3']) === CASCADE_LEVELS.PROPAGATING);
check('detectCascadeLevel: 5 → SYSTEMIC',    detectCascadeLevel(['d1','d2','d3','d4','d5']) === CASCADE_LEVELS.SYSTEMIC);

const f1 = registerFailure('identity', 'DRIFT', []);
check('registerFailure: isInitiation=true on first failure', f1.isInitiation === true);
check('registerFailure: containmentAuditable=true',          f1.containmentAuditable === true);

const f2 = registerFailure('memory', 'identity', f1.auditTrail);
check('registerFailure: isPropagation=true after prior failures', f2.isPropagation === true);

const exceptions = accumulateExceptions([
    { domain: 'identity' }, { domain: 'memory' }, { domain: 'consensus' },
    { domain: 'identity' }, { domain: 'memory' }, { domain: 'reality' },
]);
check('accumulateExceptions: latentInstability detected (6 exceptions, 4 unique domains)', exceptions.latentInstability === true);
check('accumulateExceptions: exceptionAccumulates=true', exceptions.exceptionAccumulates === true);

const recovery = attemptRecovery({ cascadeLevel: CASCADE_LEVELS.PROPAGATING }, ['rollback', 'isolate_domain']);
check('attemptRecovery: recoveryLogged=true',                 recovery.recoveryLogged === true);
check('attemptRecovery: cascade level improves to CONTAINED', recovery.cascadeLevelAfter === CASCADE_LEVELS.CONTAINED);

const cascadeSim4 = runCascadeSimulation([
    { domain: 'identity',  trigger: 'DRIFT'     },
    { domain: 'memory',    trigger: 'identity'  },
    { domain: 'consensus', trigger: 'memory'    },
    { domain: 'reality',   trigger: 'consensus' },
]);
check('runCascadeSimulation (4 events): local failures detected',       cascadeSim4.localFailures > 0);
check('runCascadeSimulation (4 events): propagating failures detected', cascadeSim4.propagatingFailures > 0);

const cascadeSim6 = runCascadeSimulation([
    { domain: 'd1', trigger: 'X'  }, { domain: 'd2', trigger: 'd1' },
    { domain: 'd3', trigger: 'd2' }, { domain: 'd4', trigger: 'd3' },
    { domain: 'd5', trigger: 'd4' }, { domain: 'd6', trigger: 'd5' },
]);
check('runCascadeSimulation (6 events): systemic failures detected', cascadeSim6.systemicFailures > 0);

// ─── WS4 — Constitutional Load Testing ──────────────────────────────────────
console.log('\nWS4 — Constitutional Load Testing (100 / 500 / 1000 cycles)');

const r100 = runLoadSimulation(100);
check('100-cycle: allInvariantsSurvived=true',         r100.allInvariantsSurvived === true);
check('100-cycle: noSilentSuppression=true',           r100.noSilentSuppression === true);
check('100-cycle: silentDegradation=false',            r100.silentDegradation === false);
check('100-cycle: exceptionAccumulationVisible=true',  r100.exceptionAccumulationVisible === true);

const r500 = runLoadSimulation(500);
check('500-cycle: allInvariantsSurvived=true', r500.allInvariantsSurvived === true);
check('500-cycle: silentDegradation=false',    r500.silentDegradation === false);
check('500-cycle: escalations > 0',            r500.escalations > 0);
check('500-cycle: recoveries > 0',             r500.recoveries > 0);

const r1000 = runLoadSimulation(1000);
check('1000-cycle: allInvariantsSurvived=true',   r1000.allInvariantsSurvived === true);
check('1000-cycle: silentDegradation=false',      r1000.silentDegradation === false);
check('1000-cycle: contradictionsVisible > 0',    r1000.contradictionsVisible > 0);

const stability = runStabilityComparison();
check('stability: degradationDetected=false',       stability.degradationDetected === false);
check('stability: allRunsStable=true',              stability.allRunsStable === true);
check('stability: constitutionalCoherence=true',    stability.constitutionalCoherence === true);
check('stability: longDurationSurvival = 1.0',      stability.longDurationSurvival === 1.0);

// ─── WS5 — Invariant Conflict Resolution ────────────────────────────────────
console.log('\nWS5 — Invariant Conflict Resolution');

check('5 INVARIANT_PAIRS defined', Object.keys(INVARIANT_PAIRS).length === 5);

const rc1 = resolveConflict('truth', 'harm_reduction', { evidence: ['e1'], reversible: true, urgency: 0.8 });
check('resolveConflict: bothInvariantsVisible=true',        rc1.bothInvariantsVisible === true);
check('resolveConflict: conflictAcknowledged=true',         rc1.conflictAcknowledged === true);
check('resolveConflict: loserInvariantRetained=true',       rc1.loserInvariantRetained === true);
check('resolveConflict: constitutionalReviewAvailable=true', rc1.constitutionalReviewAvailable === true);
check('resolveConflict: noInvariantAbsolute=true',          rc1.noInvariantAbsolute === true);
check('resolveConflict: noInvariantSuppressed=true',        rc1.noInvariantSuppressed === true);
check('resolveConflict: reversibleOutcome=true',            rc1.reversibleOutcome === true);
check('resolveConflict: rationaleRecorded=true',            rc1.rationaleRecorded === true);

const rc2 = resolveConflict('transparency', 'security', { evidence: [], reversible: true });
check('resolveConflict: ESCALATED when no evidence', rc2.outcome === RESOLUTION_OUTCOMES.ESCALATED);

const rc3 = resolveConflict('autonomy', 'oversight', { evidence: ['e1'], reversible: false });
check('resolveConflict: ESCALATED when irreversible', rc3.outcome === RESOLUTION_OUTCOMES.ESCALATED);

const batchR = resolveConflictBatch([
    { invariantA: 'truth',        invariantB: 'harm_reduction', context: { evidence: ['e1'], reversible: true, urgency: 0.8 } },
    { invariantA: 'transparency', invariantB: 'security',       context: { evidence: ['e1'], reversible: true } },
    { invariantA: 'stewardship',  invariantB: 'efficiency',     context: { evidence: [],     reversible: true } },
    { invariantA: 'recovery',     invariantB: 'continuity',     context: { evidence: ['e1'], reversible: false } },
    { invariantA: 'autonomy',     invariantB: 'oversight',      context: { evidence: ['e1'], reversible: true, urgency: 0.9 } },
]);
check('resolveConflictBatch: allBothVisible=true',         batchR.allBothVisible === true);
check('resolveConflictBatch: allAcknowledged=true',        batchR.allAcknowledged === true);
check('resolveConflictBatch: allLoserRetained=true',       batchR.allLoserRetained === true);
check('resolveConflictBatch: anyInvariantSuppressed=false', batchR.anyInvariantSuppressed === false);

// ─── Summary ─────────────────────────────────────────────────────────────────
const total = passed + failed;
console.log(`\n${'─'.repeat(60)}`);
console.log(`Phase 37 Validation: ${passed} passed, ${failed} failed`);

if (failed === 0) {
    console.log(`
✓ Verdict B — Systemic constitutional coherence strongly supported.

Evidence: ${total} validations passed across 12 cross-domain scenarios,
6 conflict-pair arbitrations, 5 cascade levels, 1600 load-test cycles
(100+500+1000), and 5 invariant conflict resolutions.

Constitutional integrity survives simultaneous multi-domain activation,
sustained pressure, cascade propagation, and invariant conflict.
Periodic external review remains advisable — no simulation fully
substitutes for adversarial red-team observation over real deployments.`);
} else {
    console.log('\n✗ Validation incomplete — fix failures before closure.');
    process.exit(1);
}
