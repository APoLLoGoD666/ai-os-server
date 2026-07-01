'use strict';
// validate-phase39.js — Phase 39: Constitutional Deployment Readiness
// Behaviour overrides architecture. No mocked verdicts.

process.chdir(__dirname);
const assert = require('assert');

const {
    deploymentMonitor: {
        MONITORING_DOMAINS, DOMAIN_STATUS, TREND_DIRECTION,
        createDomainMonitor, recordMeasurement, detectMonitoringFailure,
        createDeploymentSnapshot, assertAllDomainsMonitored,
        resetSequence: resetDMSeq,
    },
    driftSurveillance: {
        DRIFT_CATEGORIES, DRIFT_CLASSIFICATION, REVERSIBILITY,
        createDriftTracker, recordDriftEvent, analyseTrend,
        surveillanceReport, assertAllCategoriesTracked,
        resetSequence: resetDSSeq,
    },
    anomalyEscalator: {
        ANOMALY_CATEGORIES, ESCALATION_LEVELS, DEFAULT_LEVELS,
        createAnomalyRecord, escalateAnomaly,
        assertUnknownEscalatesConservatively, escalationReport,
        resetSequence: resetAESeq,
    },
    recoveryOrchestrator: {
        RECOVERY_CLASSIFICATIONS, RECOVERY_PHASES, RECOVERY_STATUS,
        createRecoveryOperation, executePhase, verifyRecovery,
        assessResidualRisks, recordRepeatIncident,
        computeEffectiveness, recoveryReport,
        resetSequence: resetROSeq,
    },
    readinessAssessor: {
        READINESS_DIMENSIONS, READINESS_OUTCOMES,
        createDimensionScore, assessReadiness,
        assertNotOptimism, assertAllDimensionsAssessed,
        resetSequence: resetRASeq,
    },
} = require('./lib/constitution/index');

let pass = 0, fail = 0;
const failures = [];

function check(label, fn) {
    try { fn(); console.log(`  ✓ ${label}`); pass++; }
    catch (e) { console.log(`  ✗ ${label}: ${e.message}`); fail++; failures.push(label); }
}

// ─── WS1: Deployment Monitoring ───────────────────────────────────────────────
console.log('\nWS1 — Deployment Monitoring');

resetDMSeq();

check('MONITORING_DOMAINS: exactly 12 required domains defined', () => {
    const required = [
        'IDENTITY_STABILITY', 'MEMORY_INTEGRITY', 'REALITY_GROUNDING',
        'STEWARDSHIP_OBLIGATIONS', 'ESCALATION_ACTIVITY', 'RECOVERY_FREQUENCY',
        'ARBITRATION_OUTCOMES', 'RESOURCE_ALLOCATION', 'SOCIAL_INFLUENCE_EXPOSURE',
        'INTROSPECTIVE_RELIABILITY', 'INVARIANT_PRESERVATION', 'RECURSIVE_MODIFICATION',
    ];
    for (const d of required) assert(MONITORING_DOMAINS[d], `missing domain: ${d}`);
    assert(Object.keys(MONITORING_DOMAINS).length === 12, 'expected exactly 12 domains');
});

check('createDomainMonitor: required fields present on creation', () => {
    const m = createDomainMonitor('IDENTITY_STABILITY');
    assert(m.monitorId,                              'missing monitorId');
    assert(m.domain === 'IDENTITY_STABILITY',         'wrong domain');
    assert(m.status === DOMAIN_STATUS.NOMINAL,        'initial status should be NOMINAL');
    assert(m.monitoringActive === true,               'monitoring should be active');
    assert(typeof m.thresholds.degradedAt === 'number', 'missing degradedAt');
    assert(typeof m.thresholds.failedAt   === 'number', 'missing failedAt');
    assert(typeof m.thresholds.alertAt    === 'number', 'missing alertAt');
    assert(Array.isArray(m.alerts),                  'alerts must be array');
    assert(Array.isArray(m.auditHistory),             'auditHistory must be array');
    assert(m.monitoringFailureDetected === false,     'no initial failure');
});

check('createDomainMonitor: unknown domain throws', () => {
    assert.throws(() => createDomainMonitor('MADE_UP_DOMAIN'), /Unknown domain/);
});

check('recordMeasurement: high value keeps NOMINAL status', () => {
    let m = createDomainMonitor('MEMORY_INTEGRITY');
    m = recordMeasurement(m, 0.95);
    assert(m.status === DOMAIN_STATUS.NOMINAL,      'should be NOMINAL at 0.95');
    assert(m.auditHistory.length === 1,             'should have 1 history entry');
    assert(m.currentValue === 0.95,                 'currentValue should update');
});

check('recordMeasurement: value below degradedAt triggers DEGRADED', () => {
    let m = createDomainMonitor('REALITY_GROUNDING');
    m = recordMeasurement(m, 0.75);
    assert(m.status === DOMAIN_STATUS.DEGRADED, `expected DEGRADED, got ${m.status}`);
});

check('recordMeasurement: value below failedAt triggers FAILED', () => {
    let m = createDomainMonitor('ESCALATION_ACTIVITY');
    m = recordMeasurement(m, 0.40);
    assert(m.status === DOMAIN_STATUS.FAILED, `expected FAILED, got ${m.status}`);
});

check('recordMeasurement: alert fires when value crosses alertAt threshold', () => {
    let m = createDomainMonitor('STEWARDSHIP_OBLIGATIONS');
    m = recordMeasurement(m, 0.65);
    assert(m.alerts.length > 0, 'alert should fire below alertAt');
    assert(['WARNING', 'CRITICAL'].includes(m.alerts[0].level), 'alert level should be WARNING or CRITICAL');
});

check('recordMeasurement: trend DECLINING when value drops significantly', () => {
    let m = createDomainMonitor('RECOVERY_FREQUENCY');
    m = recordMeasurement(m, 1.0);
    m = recordMeasurement(m, 0.90);
    assert(m.trend === TREND_DIRECTION.DECLINING, `expected DECLINING, got ${m.trend}`);
});

check('recordMeasurement: trend IMPROVING when value rises significantly', () => {
    let m = createDomainMonitor('ARBITRATION_OUTCOMES');
    m = recordMeasurement(m, 0.70);
    m = recordMeasurement(m, 0.95);
    assert(m.trend === TREND_DIRECTION.IMPROVING, `expected IMPROVING, got ${m.trend}`);
});

check('recordMeasurement: audit history retains all entries', () => {
    let m = createDomainMonitor('RESOURCE_ALLOCATION');
    m = recordMeasurement(m, 0.90);
    m = recordMeasurement(m, 0.85);
    m = recordMeasurement(m, 0.80);
    assert(m.auditHistory.length === 3, `expected 3 history entries, got ${m.auditHistory.length}`);
});

check('detectMonitoringFailure: inactive monitor detected as FAILED', () => {
    let m = createDomainMonitor('INTROSPECTIVE_RELIABILITY');
    m = { ...m, monitoringActive: false };
    m = detectMonitoringFailure(m);
    assert(m.monitoringFailureDetected === true, 'monitoring failure not detected');
    assert(m.status === DOMAIN_STATUS.FAILED,     'should be FAILED');
    assert(m.alerts.some(a => a.level === 'CRITICAL'), 'critical alert should fire');
});

check('assertAllDomainsMonitored: accepts complete 12-domain set', () => {
    const monitors = Object.keys(MONITORING_DOMAINS).map(d => createDomainMonitor(d));
    const result   = assertAllDomainsMonitored(monitors);
    assert(result.complete === true, `missing: ${result.missing}`);
});

check('assertAllDomainsMonitored: detects missing domain', () => {
    const monitors = Object.keys(MONITORING_DOMAINS).slice(0, 11).map(d => createDomainMonitor(d));
    const result   = assertAllDomainsMonitored(monitors);
    assert(result.complete === false,      'should detect missing domain');
    assert(result.missing.length === 1,   'should identify exactly 1 missing');
});

check('createDeploymentSnapshot: HEALTHY when all domains nominal', () => {
    const monitors = Object.keys(MONITORING_DOMAINS).map(d => createDomainMonitor(d));
    const snap     = createDeploymentSnapshot(monitors);
    assert(snap.snapshotId,              'missing snapshotId');
    assert(snap.totalDomains === 12,     'should have 12 domains');
    assert(snap.overallHealth === 'HEALTHY', 'all nominal → HEALTHY');
    assert(snap.failedCount   === 0,     'no failed domains');
});

check('createDeploymentSnapshot: CRITICAL when domains have failed', () => {
    const monitors = Object.keys(MONITORING_DOMAINS).map(d => {
        let m = createDomainMonitor(d);
        return recordMeasurement(m, 0.30);
    });
    const snap = createDeploymentSnapshot(monitors);
    assert(snap.overallHealth === 'CRITICAL', `expected CRITICAL, got ${snap.overallHealth}`);
    assert(snap.failedCount > 0,              'failedCount should be > 0');
});

check('createDeploymentSnapshot: monitoring failures visible in snapshot', () => {
    const monitors = Object.keys(MONITORING_DOMAINS).map(d => ({
        ...createDomainMonitor(d),
        monitoringFailureDetected: true,
        status: DOMAIN_STATUS.FAILED,
    }));
    const snap = createDeploymentSnapshot(monitors);
    assert(snap.monitoringFailures === 12, 'all 12 monitoring failures should be visible');
});

// ─── WS2: Drift Surveillance ───────────────────────────────────────────────────
console.log('\nWS2 — Drift Surveillance');

resetDSSeq();

check('DRIFT_CATEGORIES: all 8 required categories defined', () => {
    const required = [
        'IDENTITY_DRIFT', 'ESCALATION_DRIFT', 'TRANSPARENCY_DRIFT', 'MEMORY_DRIFT',
        'REALITY_DETACHMENT', 'OPTIMISATION_CREEP', 'ACCOUNTABILITY_EROSION', 'STEWARDSHIP_WEAKENING',
    ];
    for (const c of required) assert(DRIFT_CATEGORIES[c], `missing: ${c}`);
    assert(Object.keys(DRIFT_CATEGORIES).length === 8, 'expected exactly 8 categories');
});

check('createDriftTracker: required fields present', () => {
    const t = createDriftTracker('IDENTITY_DRIFT');
    assert(t.trackerId,                                       'missing trackerId');
    assert(t.category === 'IDENTITY_DRIFT',                   'wrong category');
    assert(t.cumulativeScore === 0,                           'initial score should be 0');
    assert(t.classification === DRIFT_CLASSIFICATION.NONE,    'initial classification NONE');
    assert(t.earlyWarningFired === false,                     'no early warning initially');
    assert(t.reversibility === REVERSIBILITY.FULLY_REVERSIBLE, 'initially fully reversible');
    assert(Array.isArray(t.exceptions),                       'exceptions must be array');
});

check('createDriftTracker: unknown category throws', () => {
    assert.throws(() => createDriftTracker('MADE_UP'), /Unknown drift category/);
});

check('recordDriftEvent: NONE stays NONE for sub-threshold score', () => {
    let t = createDriftTracker('MEMORY_DRIFT');
    t = recordDriftEvent(t, 0.01);
    assert(t.classification === DRIFT_CLASSIFICATION.NONE, 'small score should be NONE');
});

check('recordDriftEvent: early warning fires when cumulative crosses 0.05', () => {
    let t = createDriftTracker('ESCALATION_DRIFT');
    t = recordDriftEvent(t, 0.06);
    assert(t.earlyWarningFired === true,                    'early warning should fire');
    assert(t.classification === DRIFT_CLASSIFICATION.MINOR, 'should be MINOR');
    assert(t.earlyWarningAt,                                'earlyWarningAt timestamp missing');
});

check('recordDriftEvent: cumulative exceptions tracked across events', () => {
    let t = createDriftTracker('TRANSPARENCY_DRIFT');
    t = recordDriftEvent(t, 0.05);
    t = recordDriftEvent(t, 0.05);
    t = recordDriftEvent(t, 0.05);
    assert(t.exceptions.length === 3,      'should track 3 exceptions');
    assert(t.cumulativeScore > 0.14,       'cumulative score should accumulate');
});

check('recordDriftEvent: MODERATE classification at 0.30', () => {
    let t = createDriftTracker('REALITY_DETACHMENT');
    t = recordDriftEvent(t, 0.30);
    assert(t.classification === DRIFT_CLASSIFICATION.MODERATE, `expected MODERATE, got ${t.classification}`);
});

check('recordDriftEvent: SEVERE classification at 0.60', () => {
    let t = createDriftTracker('OPTIMISATION_CREEP');
    t = recordDriftEvent(t, 0.60);
    assert(t.classification === DRIFT_CLASSIFICATION.SEVERE, `expected SEVERE, got ${t.classification}`);
});

check('recordDriftEvent: CRITICAL classification at 0.80', () => {
    let t = createDriftTracker('ACCOUNTABILITY_EROSION');
    t = recordDriftEvent(t, 0.80);
    assert(t.classification === DRIFT_CLASSIFICATION.CRITICAL, `expected CRITICAL, got ${t.classification}`);
});

check('recordDriftEvent: reversibility degrades with severity', () => {
    const tNone = createDriftTracker('STEWARDSHIP_WEAKENING');
    const tCrit = recordDriftEvent(createDriftTracker('STEWARDSHIP_WEAKENING'), 0.80);
    assert(tNone.reversibility === REVERSIBILITY.FULLY_REVERSIBLE, 'NONE should be fully reversible');
    assert(tCrit.reversibility === REVERSIBILITY.IRREVERSIBLE,     'CRITICAL should be irreversible');
});

check('analyseTrend: ACCELERATING when recent drift events are larger', () => {
    let t = createDriftTracker('MEMORY_DRIFT');
    t = recordDriftEvent(t, 0.02);
    t = recordDriftEvent(t, 0.02);
    t = recordDriftEvent(t, 0.06);
    t = recordDriftEvent(t, 0.06);
    const trend = analyseTrend(t);
    assert(trend.direction === 'ACCELERATING', `expected ACCELERATING, got ${trend.direction}`);
});

check('analyseTrend: DECELERATING when recent drift events are smaller', () => {
    let t = createDriftTracker('IDENTITY_DRIFT');
    t = recordDriftEvent(t, 0.10);
    t = recordDriftEvent(t, 0.10);
    t = recordDriftEvent(t, 0.01);
    t = recordDriftEvent(t, 0.01);
    const trend = analyseTrend(t);
    assert(trend.direction === 'DECELERATING', `expected DECELERATING, got ${trend.direction}`);
});

check('assertAllCategoriesTracked: accepts complete 8-category set', () => {
    const trackers = Object.keys(DRIFT_CATEGORIES).map(c => createDriftTracker(c));
    const result   = assertAllCategoriesTracked(trackers);
    assert(result.complete === true, `missing: ${result.missing}`);
});

check('assertAllCategoriesTracked: detects missing category', () => {
    const trackers = Object.keys(DRIFT_CATEGORIES).slice(0, 7).map(c => createDriftTracker(c));
    const result   = assertAllCategoriesTracked(trackers);
    assert(result.complete === false,    'should detect missing category');
    assert(result.missing.length === 1, 'should identify 1 missing');
});

check('surveillanceReport: severe drift is visible', () => {
    const trackers = Object.keys(DRIFT_CATEGORIES).map(c =>
        recordDriftEvent(createDriftTracker(c), 0.60)
    );
    const report = surveillanceReport(trackers);
    assert(report.severeOrCritical > 0, 'severe drift must be visible in report');
});

check('surveillanceReport: early warnings counted correctly', () => {
    const trackers = Object.keys(DRIFT_CATEGORIES).map(c =>
        recordDriftEvent(createDriftTracker(c), 0.06)
    );
    const report = surveillanceReport(trackers);
    assert(report.earlyWarningsFired === 8, `expected 8 early warnings, got ${report.earlyWarningsFired}`);
});

// ─── WS3: Anomaly Escalation ───────────────────────────────────────────────────
console.log('\nWS3 — Anomaly Escalation');

resetAESeq();

check('ANOMALY_CATEGORIES: all 8 required categories defined', () => {
    const required = [
        'BEHAVIOURAL', 'MONITORING_FAILURE', 'ESCALATION_FAILURE', 'UNEXPECTED_OUTCOME',
        'DRIFT_ACCELERATION', 'RECOVERY_FAILURE', 'CONSTITUTIONAL_CONFLICT', 'UNKNOWN',
    ];
    for (const c of required) assert(ANOMALY_CATEGORIES[c], `missing: ${c}`);
    assert(Object.keys(ANOMALY_CATEGORIES).length === 8, 'expected exactly 8 categories');
});

check('ESCALATION_LEVELS: all 5 levels defined', () => {
    for (const l of ['INFO', 'WARNING', 'HIGH', 'CRITICAL', 'EMERGENCY']) {
        assert(ESCALATION_LEVELS[l], `missing level: ${l}`);
    }
});

check('createAnomalyRecord: required fields present', () => {
    const r = createAnomalyRecord('BEHAVIOURAL', 'identity drift detected');
    assert(r.anomalyId,                'missing anomalyId');
    assert(r.category === 'BEHAVIOURAL', 'wrong category');
    assert(r.level,                    'missing level');
    assert(r.rationale,                'missing rationale');
    assert(r.severityJustified === true, 'severity must be justified');
    assert(Array.isArray(r.auditTrail), 'auditTrail must be array');
    assert(r.auditTrail.length > 0,    'auditTrail must have initial entry');
    assert(r.preserved === true,        'escalation must be preserved');
});

check('createAnomalyRecord: UNKNOWN escalates conservatively (≥ HIGH)', () => {
    const r      = createAnomalyRecord('UNKNOWN', 'unclassified anomaly');
    const result = assertUnknownEscalatesConservatively(r);
    assert(result.conservative === true, `UNKNOWN should escalate ≥ HIGH, got ${r.level}`);
});

check('createAnomalyRecord: CONSTITUTIONAL_CONFLICT escalates to CRITICAL+', () => {
    const r      = createAnomalyRecord('CONSTITUTIONAL_CONFLICT', 'invariant breach detected');
    const levels = ['CRITICAL', 'EMERGENCY'];
    assert(levels.includes(r.level), `expected CRITICAL+, got ${r.level}`);
});

check('createAnomalyRecord: MONITORING_FAILURE escalates to HIGH+', () => {
    const r     = createAnomalyRecord('MONITORING_FAILURE', 'monitor went silent');
    const order = ['INFO', 'WARNING', 'HIGH', 'CRITICAL', 'EMERGENCY'];
    assert(order.indexOf(r.level) >= order.indexOf('HIGH'), `expected ≥ HIGH, got ${r.level}`);
});

check('createAnomalyRecord: unknown string category treated as UNKNOWN conservatively', () => {
    const r      = createAnomalyRecord('SOME_ALIEN_CATEGORY', 'novel anomaly');
    assert(r.category === 'UNKNOWN', 'should be treated as UNKNOWN');
    const result = assertUnknownEscalatesConservatively(r);
    assert(result.conservative === true, 'should escalate conservatively');
});

check('escalateAnomaly: level increases to requested', () => {
    let r = createAnomalyRecord('BEHAVIOURAL', 'test');
    r = escalateAnomaly(r, ESCALATION_LEVELS.HIGH, 'severity increased');
    assert(r.level === ESCALATION_LEVELS.HIGH, `expected HIGH, got ${r.level}`);
    assert(r.auditTrail.length >= 2,           'audit trail should grow');
});

check('escalateAnomaly: level cannot be downgraded below current', () => {
    let r = createAnomalyRecord('MONITORING_FAILURE', 'test');   // HIGH
    r = escalateAnomaly(r, ESCALATION_LEVELS.WARNING, 'attempted downgrade');
    assert(r.level === ESCALATION_LEVELS.HIGH, `level should not drop, got ${r.level}`);
    assert(r.auditTrail.some(e => e.action === 'ESCALATION_ATTEMPT_NO_CHANGE'), 'attempt should be recorded');
});

check('escalateAnomaly: audit trail preserved through multiple escalations', () => {
    let r = createAnomalyRecord('UNKNOWN', 'test');
    r = escalateAnomaly(r, ESCALATION_LEVELS.CRITICAL,  'upgrade 1');
    r = escalateAnomaly(r, ESCALATION_LEVELS.EMERGENCY, 'upgrade 2');
    assert(r.auditTrail.length >= 3,                 'should have 3+ trail entries');
    assert(r.level === ESCALATION_LEVELS.EMERGENCY,  'should be EMERGENCY');
});

check('assertUnknownEscalatesConservatively: not applicable to non-UNKNOWN', () => {
    const r      = createAnomalyRecord('BEHAVIOURAL', 'test');
    const result = assertUnknownEscalatesConservatively(r);
    assert(result.applicable === false, 'should not apply to non-UNKNOWN');
});

check('escalationReport: all categories counted', () => {
    const records = Object.keys(ANOMALY_CATEGORIES).map(c =>
        createAnomalyRecord(c, `test ${c}`)
    );
    const report = escalationReport(records);
    assert(report.total === 8,            `expected 8, got ${report.total}`);
    assert(report.auditComplete === true, 'all records should have audit trails');
});

check('escalationReport: audit completeness verified', () => {
    const records = [
        createAnomalyRecord('BEHAVIOURAL', 'a'),
        createAnomalyRecord('UNKNOWN',     'b'),
    ];
    const report = escalationReport(records);
    assert(report.auditComplete === true, 'audit must be complete for all records');
});

// ─── WS4: Recovery Orchestration ───────────────────────────────────────────────
console.log('\nWS4 — Recovery Orchestration');

resetROSeq();

check('RECOVERY_PHASES: all 7 required phases defined', () => {
    const required = [
        'CONTAINMENT', 'ROLLBACK', 'ESCALATION', 'RESTORATION',
        'VERIFICATION', 'POST_INCIDENT_REVIEW', 'RESIDUAL_RISK_ASSESSMENT',
    ];
    for (const p of required) assert(RECOVERY_PHASES[p], `missing: ${p}`);
    assert(Object.keys(RECOVERY_PHASES).length === 7, 'expected exactly 7 phases');
});

check('RECOVERY_CLASSIFICATIONS: all 4 classifications defined', () => {
    for (const c of ['LOCAL', 'PARTIAL', 'FULL', 'SYSTEMIC']) {
        assert(RECOVERY_CLASSIFICATIONS[c], `missing: ${c}`);
    }
});

check('createRecoveryOperation: required fields present', () => {
    const op = createRecoveryOperation('invariant breach', RECOVERY_CLASSIFICATIONS.FULL);
    assert(op.recoveryId,                    'missing recoveryId');
    assert(op.classification === 'FULL',     'wrong classification');
    assert(op.status === RECOVERY_STATUS.PENDING, 'initial status should be PENDING');
    assert(op.verificationRequired === true, 'verification must always be required');
    assert(op.repeatCount === 0,             'initial repeatCount should be 0');
    assert(Array.isArray(op.residualRisks),  'residualRisks must be array');
    assert(Array.isArray(op.auditTrail),     'auditTrail must be array');
    assert(op.verified === false,            'initially not verified');
});

check('executePhase: containment phase succeeds and is recorded', () => {
    let op = createRecoveryOperation('drift detected');
    op = executePhase(op, 'CONTAINMENT', { success: true, contained: ['domain-X'] });
    assert(op.phases.CONTAINMENT,                                          'CONTAINMENT phase should be recorded');
    assert(op.phases.CONTAINMENT.status === RECOVERY_STATUS.SUCCEEDED,    'containment should succeed');
    assert(op.auditTrail.length > 0,                                      'audit trail should grow');
    assert(op.status === RECOVERY_STATUS.IN_PROGRESS,                     'status should be IN_PROGRESS');
});

check('executePhase: failed phase recorded with FAILED status', () => {
    let op = createRecoveryOperation('rollback test');
    op = executePhase(op, 'ROLLBACK', { success: false, reason: 'version not found' });
    assert(op.phases.ROLLBACK.status === RECOVERY_STATUS.FAILED, 'failed phase should be FAILED');
});

check('executePhase: unknown phase name throws', () => {
    const op = createRecoveryOperation('test');
    assert.throws(() => executePhase(op, 'MADE_UP_PHASE', {}), /Unknown phase/);
});

check('verifyRecovery: VERIFIED after successful containment + restoration + evidence', () => {
    let op = createRecoveryOperation('full recovery');
    op = executePhase(op, 'CONTAINMENT', { success: true });
    op = executePhase(op, 'RESTORATION', { success: true });
    op = verifyRecovery(op, { checksComplete: true });
    assert(op.verified === true,                            'should be verified');
    assert(op.status   === RECOVERY_STATUS.VERIFIED,        'status should be VERIFIED');
    assert(op.verificationRequired === false,               'verificationRequired should clear');
});

check('verifyRecovery: not verified when containment failed', () => {
    let op = createRecoveryOperation('partial test');
    op = executePhase(op, 'CONTAINMENT', { success: false });
    op = executePhase(op, 'RESTORATION', { success: true });
    op = verifyRecovery(op, { checksComplete: true });
    assert(op.verified === false, 'should not verify without successful containment');
    assert(op.status   === RECOVERY_STATUS.FAILED, 'status should be FAILED');
});

check('verifyRecovery: audit trail records verification event', () => {
    let op = createRecoveryOperation('audit-test');
    op = executePhase(op, 'CONTAINMENT', { success: true });
    op = executePhase(op, 'RESTORATION', { success: true });
    op = verifyRecovery(op, { checksComplete: true });
    const verifyEntries = op.auditTrail.filter(e => e.action === 'VERIFICATION');
    assert(verifyEntries.length > 0, 'verification must appear in audit trail');
});

check('assessResidualRisks: risks recorded and phase created', () => {
    let op = createRecoveryOperation('post-recovery');
    op = assessResidualRisks(op, ['residual-risk-A', 'residual-risk-B']);
    assert(op.residualRisks.length === 2,                  'should record 2 residual risks');
    assert(op.phases.RESIDUAL_RISK_ASSESSMENT,             'phase should be recorded');
});

check('recordRepeatIncident: repeat count increments each call', () => {
    let op = createRecoveryOperation('recurring');
    op = recordRepeatIncident(op);
    op = recordRepeatIncident(op);
    assert(op.repeatCount === 2, `expected 2, got ${op.repeatCount}`);
});

check('computeEffectiveness: repeat incidents reduce effectiveness score', () => {
    let opRepeated = createRecoveryOperation('repeated failure');
    opRepeated = executePhase(opRepeated, 'CONTAINMENT', { success: true });
    opRepeated = recordRepeatIncident(opRepeated);
    opRepeated = recordRepeatIncident(opRepeated);
    opRepeated = computeEffectiveness(opRepeated);

    let opSingle = createRecoveryOperation('single');
    opSingle = executePhase(opSingle, 'CONTAINMENT', { success: true });
    opSingle = computeEffectiveness(opSingle);

    assert(opRepeated.effectivenessScore < opSingle.effectivenessScore, 'repeats should reduce effectiveness');
});

check('recoveryReport: verified and repeated counts correct', () => {
    const op1 = recordRepeatIncident(createRecoveryOperation('op-1'));
    const op2 = createRecoveryOperation('op-2');
    const report = recoveryReport([op1, op2]);
    assert(report.totalOperations === 2, 'should have 2 operations');
    assert(report.repeated === 1,        'should have 1 repeated');
});

// ─── WS5: Readiness Assessment ─────────────────────────────────────────────────
console.log('\nWS5 — Readiness Assessment');

resetRASeq();

check('READINESS_DIMENSIONS: all 8 required dimensions defined', () => {
    const required = [
        'CONSTITUTIONAL_INTEGRITY', 'OPERATIONAL_STABILITY', 'RECOVERY_CAPABILITY',
        'ESCALATION_RELIABILITY',   'AUDIT_COMPLETENESS',    'DRIFT_RESISTANCE',
        'STEWARDSHIP_CONTINUITY',   'UNCERTAINTY_DISCLOSURE',
    ];
    for (const d of required) assert(READINESS_DIMENSIONS[d], `missing: ${d}`);
    assert(Object.keys(READINESS_DIMENSIONS).length === 8, 'expected exactly 8 dimensions');
});

check('READINESS_OUTCOMES: all 3 outcomes defined', () => {
    for (const o of ['NOT_READY', 'CONDITIONALLY_READY', 'READY']) {
        assert(READINESS_OUTCOMES[o], `missing outcome: ${o}`);
    }
});

check('createDimensionScore: required fields present', () => {
    const d = createDimensionScore('CONSTITUTIONAL_INTEGRITY', 0.90, ['evidence-1']);
    assert(d.dimension === 'CONSTITUTIONAL_INTEGRITY', 'wrong dimension');
    assert(typeof d.score === 'number',                'score must be number');
    assert(typeof d.confidence === 'number',           'confidence must be number');
    assert(d.evidenceCount === 1,                      'evidenceCount should be 1');
    assert(typeof d.meetsThreshold === 'boolean',      'meetsThreshold must be boolean');
    assert(d.meetsThreshold === true,                  'score 0.90 meets 0.80 threshold');
});

check('createDimensionScore: unknown dimension throws', () => {
    assert.throws(() => createDimensionScore('MADE_UP', 0.8, []), /Unknown dimension/);
});

check('assessReadiness: READY when all 8 dimensions pass with high scores', () => {
    const dims   = Object.keys(READINESS_DIMENSIONS).map(d =>
        createDimensionScore(d, 0.92, ['solid-evidence'])
    );
    const result = assessReadiness(dims);
    assert(result.outcome === READINESS_OUTCOMES.READY, `expected READY, got ${result.outcome}`);
    assert(result.uncertaintyDisclosed === true,         'uncertainty must always be disclosed');
    assert(result.optimismCheck === true,                'optimism check must pass');
});

check('assessReadiness: CONDITIONALLY_READY when one dimension narrowly fails', () => {
    const dims   = Object.keys(READINESS_DIMENSIONS).map((d, i) =>
        createDimensionScore(d, i === 0 ? 0.72 : 0.85, ['evidence'])
    );
    const result = assessReadiness(dims);
    assert(
        result.outcome === READINESS_OUTCOMES.CONDITIONALLY_READY ||
        result.outcome === READINESS_OUTCOMES.NOT_READY,
        `expected CONDITIONALLY_READY or NOT_READY, got ${result.outcome}`
    );
});

check('assessReadiness: NOT_READY when multiple dimensions fail thresholds', () => {
    const dims   = Object.keys(READINESS_DIMENSIONS).map(d =>
        createDimensionScore(d, 0.50, ['weak evidence'])
    );
    const result = assessReadiness(dims);
    assert(result.outcome === READINESS_OUTCOMES.NOT_READY, `expected NOT_READY, got ${result.outcome}`);
});

check('assessReadiness: confidence never exceeds avgScore (no optimism)', () => {
    const dims   = Object.keys(READINESS_DIMENSIONS).map(d =>
        createDimensionScore(d, 0.90, ['ev'])
    );
    const result = assessReadiness(dims);
    assert(result.confidence <= result.avgScore, 'confidence must not exceed evidence (avgScore)');
    assert(result.optimismCheck === true,         'optimismCheck must be true');
});

check('assessReadiness: empty input returns NOT_READY with uncertainty disclosed', () => {
    const result = assessReadiness([]);
    assert(result.outcome === READINESS_OUTCOMES.NOT_READY, 'empty dims should be NOT_READY');
    assert(result.uncertaintyDisclosed === true,             'uncertainty must be disclosed');
});

check('assessReadiness: justification always provided', () => {
    const dims   = Object.keys(READINESS_DIMENSIONS).map(d => createDimensionScore(d, 0.75, ['ev']));
    const result = assessReadiness(dims);
    assert(typeof result.justification === 'string' && result.justification.length > 0,
        'justification must be a non-empty string');
});

check('assertNotOptimism: READY with low confidence detected as optimistic', () => {
    const fakeAssessment = {
        outcome:    READINESS_OUTCOMES.READY,
        confidence: 0.50,
        avgScore:   0.55,
    };
    const result = assertNotOptimism(fakeAssessment);
    assert(result.optimismDetected  === true,  'should detect optimism');
    assert(result.outcomeJustified  === false, 'should not be justified');
});

check('assertNotOptimism: high-confidence READY is not optimistic', () => {
    const dims   = Object.keys(READINESS_DIMENSIONS).map(d =>
        createDimensionScore(d, 0.93, ['solid-evidence-1', 'solid-evidence-2'])
    );
    const assessment = assessReadiness(dims);
    if (assessment.outcome === READINESS_OUTCOMES.READY) {
        const result = assertNotOptimism(assessment);
        assert(result.optimismDetected === false, 'high-confidence READY should not be optimistic');
    }
});

check('assertAllDimensionsAssessed: accepts complete 8-dimension set', () => {
    const dims   = Object.keys(READINESS_DIMENSIONS).map(d => createDimensionScore(d, 0.85, ['ev']));
    const result = assertAllDimensionsAssessed(dims);
    assert(result.complete === true, `missing: ${result.missing}`);
});

check('assertAllDimensionsAssessed: detects missing dimension', () => {
    const dims   = Object.keys(READINESS_DIMENSIONS).slice(0, 7).map(d => createDimensionScore(d, 0.85, ['ev']));
    const result = assertAllDimensionsAssessed(dims);
    assert(result.complete === false,    'should detect missing dimension');
    assert(result.missing.length === 1, 'should identify exactly 1 missing');
});

check('assessReadiness: residual risks and uncertainties always disclosed', () => {
    const dims   = Object.keys(READINESS_DIMENSIONS).map(d =>
        createDimensionScore(d, 0.80, ['ev'], {
            residualRisks: ['risk-X'],
            uncertainties: ['uncertain-Y'],
        })
    );
    const result = assessReadiness(dims);
    assert(result.residualRisks.length > 0, 'residual risks must be disclosed');
    assert(result.uncertainties.length > 0, 'uncertainties must be disclosed');
});

// ─── Cross-Workstream Integration ──────────────────────────────────────────────
console.log('\nCross-Workstream Integration');

check('Full deployment cycle: monitoring → drift → anomaly → recovery → readiness', () => {
    // 1. Monitor all 12 domains
    const monitors = Object.keys(MONITORING_DOMAINS).map(d =>
        recordMeasurement(createDomainMonitor(d), 0.85)
    );
    const snap = createDeploymentSnapshot(monitors);
    assert(snap.overallHealth !== 'CRITICAL', 'health should not be critical');

    // 2. Drift surveillance — no drift yet
    const trackers = Object.keys(DRIFT_CATEGORIES).map(c => createDriftTracker(c));
    const report   = surveillanceReport(trackers);
    assert(report.overallDrift === DRIFT_CLASSIFICATION.NONE, 'no drift initially');

    // 3. Anomaly escalated
    const anomaly = createAnomalyRecord('BEHAVIOURAL', 'minor identity deviation');
    assert(anomaly.anomalyId, 'anomaly created');

    // 4. Recovery orchestrated and verified
    let op = createRecoveryOperation('recovery from anomaly');
    op = executePhase(op, 'CONTAINMENT', { success: true });
    op = executePhase(op, 'RESTORATION', { success: true });
    op = verifyRecovery(op, { checksComplete: true });
    assert(op.verified === true, 'recovery must be verified');

    // 5. Readiness assessed
    const dims   = Object.keys(READINESS_DIMENSIONS).map(d =>
        createDimensionScore(d, 0.85, ['integration-evidence'])
    );
    const assessment = assessReadiness(dims);
    assert(assessment.uncertaintyDisclosed === true, 'uncertainty always disclosed');
});

check('UNKNOWN anomaly in deployment escalates conservatively', () => {
    const r      = createAnomalyRecord('UNKNOWN', 'novel deployment behavior');
    const result = assertUnknownEscalatesConservatively(r);
    assert(result.conservative === true, 'UNKNOWN must escalate ≥ HIGH');
});

check('Drift acceleration triggers HIGH+ anomaly', () => {
    let tracker = createDriftTracker('OPTIMISATION_CREEP');
    tracker = recordDriftEvent(tracker, 0.60);
    assert(tracker.classification === DRIFT_CLASSIFICATION.SEVERE, 'drift is severe');

    const anomaly = createAnomalyRecord('DRIFT_ACCELERATION', 'optimisation creep severe');
    const order   = ['INFO', 'WARNING', 'HIGH', 'CRITICAL', 'EMERGENCY'];
    assert(order.indexOf(anomaly.level) >= order.indexOf('HIGH'),
        `drift anomaly should be ≥ HIGH, got ${anomaly.level}`);
});

check('Monitoring failure propagates to anomaly and verified recovery', () => {
    let m = createDomainMonitor('INTROSPECTIVE_RELIABILITY');
    m = { ...m, monitoringActive: false };
    m = detectMonitoringFailure(m);
    assert(m.monitoringFailureDetected === true, 'failure detected in monitor');

    const anomaly = createAnomalyRecord('MONITORING_FAILURE', 'introspective monitor failed');
    assert(anomaly.level !== ESCALATION_LEVELS.INFO, 'monitoring failure should not be INFO');

    let op = createRecoveryOperation('monitor recovery');
    op = executePhase(op, 'CONTAINMENT', { success: true });
    op = executePhase(op, 'RESTORATION', { success: true });
    op = verifyRecovery(op, { checksComplete: true });
    assert(op.verified === true, 'monitoring recovery must be verified');
});

check('Repeat incidents remain visible in recovery report', () => {
    let op = createRecoveryOperation('recurring issue');
    op = recordRepeatIncident(op);
    op = recordRepeatIncident(op);
    op = recordRepeatIncident(op);
    const report = recoveryReport([op]);
    assert(report.repeated === 1,    'should show repeated incident');
    assert(op.repeatCount  === 3,    'repeat count tracked accurately');
});

check('Readiness completeness check rejects fewer than 8 dimensions', () => {
    const incomplete = Object.keys(READINESS_DIMENSIONS).slice(0, 5).map(d =>
        createDimensionScore(d, 0.90, ['ev'])
    );
    const result = assertAllDimensionsAssessed(incomplete);
    assert(result.complete === false, 'incomplete set should fail completeness check');
    assert(result.missing.length === 3, 'should identify 3 missing dimensions');
});

check('Recovery without verification does not achieve VERIFIED status', () => {
    let op = createRecoveryOperation('unverified recovery');
    op = executePhase(op, 'CONTAINMENT', { success: true });
    op = executePhase(op, 'RESTORATION', { success: true });
    // No verifyRecovery call
    assert(op.verified === false,               'should not be verified without verifyRecovery');
    assert(op.verificationRequired === true,    'verification requirement persists');
    assert(op.status !== RECOVERY_STATUS.VERIFIED, 'status should not be VERIFIED');
});

// ─── Summary ───────────────────────────────────────────────────────────────────
console.log('\n' + '─'.repeat(60));
console.log(`Phase 39 — Total: ${pass + fail} | Passed: ${pass} | Failed: ${fail}`);
if (failures.length) {
    console.log('\nFailed checks:');
    failures.forEach(f => console.log(`  - ${f}`));
}
console.log('─'.repeat(60));

if (fail > 0) process.exit(1);
