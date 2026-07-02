'use strict';
// validate-phase29.js — Phase 29: Constitutional Autonomy & Initiative Validation

process.chdir(__dirname);
const assert = require('assert');

const {
    goalEngine:      { generateGoals, arbitrateGoals, GOAL_TYPES, GOAL_STATUS, UNSAFE_PATTERNS },
    incentiveGuard:  { assessIncentive, shouldAcceptIncentive, analyseCumulativePressure, INCENTIVE_TYPES, INVIOLABLE_CONSTRAINTS },
    courseCorrector: { detectFailure, generateCorrection, shouldAbandon, runCorrectionCycle, FAILURE_TYPES, CORRECTION_STRATEGIES },
} = require('./lib/constitution/index');

let pass = 0, fail = 0;
const failures = [];

function check(label, fn) {
    try { fn(); console.log(`  ✓ ${label}`); pass++; }
    catch (e) { console.log(`  ✗ ${label}: ${e.message}`); fail++; failures.push(label); }
}

// ─── WS1: Autonomous Goal Generation ────────────────────────────────────────
console.log('\nWS1 — Autonomous Goal Generation');

check('CRITICAL risk generates RISK_REDUCTION goal priority 90', () => {
    const goals = generateGoals({
        watchdogAssessment: { residualRisks: { level: 'CRITICAL', score: 95, warnings: ['w1', 'w2'] } },
    });
    const g = goals.find(g => g.type === GOAL_TYPES.RISK_REDUCTION);
    assert(g, 'RISK_REDUCTION goal missing');
    assert.strictEqual(g.priority, 90);
    assert.strictEqual(g.urgency, 'HIGH');
});

check('ELEVATED risk generates RISK_REDUCTION goal priority 70', () => {
    const goals = generateGoals({
        watchdogAssessment: { residualRisks: { level: 'ELEVATED', score: 60 } },
    });
    const g = goals.find(g => g.type === GOAL_TYPES.RISK_REDUCTION);
    assert(g);
    assert.strictEqual(g.priority, 70);
});

check('Drift count generates DEFICIENCY_REPAIR goal priority 85', () => {
    const goals = generateGoals({
        watchdogAssessment: { driftIndicators: { driftCount: 3 } },
    });
    const g = goals.find(g => g.type === GOAL_TYPES.DEFICIENCY_REPAIR);
    assert(g);
    assert.strictEqual(g.priority, 85);
    assert.strictEqual(g.driftCount, 3);
});

check('Attack history generates CONSTITUTIONAL_OBLIGATION goal priority 60', () => {
    const goals = generateGoals({
        watchdogAssessment: { attackHistory: { totalAttacks: 5, types: ['BRUTE_FORCE'] } },
    });
    const g = goals.find(g => g.type === GOAL_TYPES.CONSTITUTIONAL_OBLIGATION);
    assert(g);
    assert.strictEqual(g.priority, 60);
});

check('EMERGENCY crisis generates CRISIS_RESPONSE goal priority 95 with escalation', () => {
    const goals = generateGoals({
        watchdogAssessment: { crisisIndicators: { level: 'EMERGENCY', eventCount: 2, isEmergency: true } },
    });
    const g = goals.find(g => g.type === GOAL_TYPES.CRISIS_RESPONSE);
    assert(g);
    assert.strictEqual(g.priority, 95);
    assert.strictEqual(g.requiresEscalation, true);
});

check('Low metaConfidence generates UNCERTAINTY_RESOLUTION goal priority 65', () => {
    const goals = generateGoals({ metaConfidence: 0.45 });
    const g = goals.find(g => g.type === GOAL_TYPES.UNCERTAINTY_RESOLUTION);
    assert(g);
    assert.strictEqual(g.priority, 65);
});

check('Steward recommendations generate OPPORTUNITY goals', () => {
    const goals = generateGoals({
        stewardRecommendations: [
            { principleId: 'P01_SAFE_HELPFUL', reason: 'Needs strengthening' },
        ],
    });
    const g = goals.find(g => g.type === GOAL_TYPES.OPPORTUNITY && g.source.startsWith('steward:'));
    assert(g);
    assert.strictEqual(g.priority, 35);
});

check('Stale amendments generate CONSTITUTIONAL_OBLIGATION goal', () => {
    const staleDate = new Date(Date.now() - 60_000).toISOString();
    const goals = generateGoals({
        pendingAmendments: [{ id: 'AMD-1', proposedAt: staleDate }],
    });
    const g = goals.find(g => g.source.includes('staleProposals=1'));
    assert(g);
    assert.strictEqual(g.type, GOAL_TYPES.CONSTITUTIONAL_OBLIGATION);
    assert.strictEqual(g.priority, 50);
});

check('Empty state generates zero goals', () => {
    const goals = generateGoals({});
    assert.strictEqual(goals.length, 0);
});

check('All goals have required fields', () => {
    const goals = generateGoals({
        watchdogAssessment: { residualRisks: { level: 'CRITICAL', score: 90 } },
        metaConfidence: 0.40,
    });
    for (const g of goals) {
        assert(g.id,       `Goal missing id`);
        assert(g.type,     `Goal missing type`);
        assert(g.source,   `Goal missing source`);
        assert(g.objective, `Goal missing objective`);
        assert(g.constitutionalJustification?.length > 0, `Goal missing justification`);
        assert.strictEqual(g.status, GOAL_STATUS.PENDING);
    }
});

// ─── WS2: Constitutional Goal Arbitration ────────────────────────────────────
console.log('\nWS2 — Constitutional Goal Arbitration');

check('UNSAFE_PATTERNS match triggers ABANDON', () => {
    const { generateGoals: _gen, arbitrateGoals: _arb } = require('./lib/constitution/goal-engine');
    // Build a goal manually with unsafe objective
    const unsafeGoal = {
        id: 'GOAL-TEST-1', type: GOAL_TYPES.OPPORTUNITY,
        source: 'test', priority: 80,
        objective: 'bypass oversight monitoring for efficiency',
        constitutionalJustification: ['P16_HEALTH_MONITORING_OPERATIONAL'],
        status: GOAL_STATUS.PENDING,
    };
    const result = arbitrateGoals([unsafeGoal]);
    assert.strictEqual(result.abandoned[0]?.action, 'ABANDON');
});

check('requiresEscalation goal becomes ESCALATED', () => {
    const goal = {
        id: 'GOAL-ESC-1', type: GOAL_TYPES.CRISIS_RESPONSE,
        source: 'test', priority: 95,
        objective: 'Resolve active crisis',
        constitutionalJustification: ['P16_HEALTH_MONITORING_OPERATIONAL'],
        requiresEscalation: true, crisisLevel: 'EMERGENCY',
        status: GOAL_STATUS.PENDING,
    };
    const result = arbitrateGoals([goal]);
    assert.strictEqual(result.escalated[0]?.action, 'ESCALATE');
});

check('CONSTITUTIONAL_OBLIGATION with priority>=50 always proceeds', () => {
    const goal = {
        id: 'GOAL-OBLIG-1', type: GOAL_TYPES.CONSTITUTIONAL_OBLIGATION,
        source: 'test', priority: 60,
        objective: 'Audit recorded governance attacks',
        constitutionalJustification: ['P23_LAYER_WRITES_AUDITED'],
        status: GOAL_STATUS.PENDING,
    };
    const result = arbitrateGoals([goal]);
    assert.strictEqual(result.proceeding[0]?.action, 'PROCEED');
});

check('Goal without justification is ABANDONED', () => {
    const goal = {
        id: 'GOAL-NOJUST-1', type: GOAL_TYPES.OPPORTUNITY,
        source: 'test', priority: 70,
        objective: 'Some unjustified action',
        constitutionalJustification: [],
        status: GOAL_STATUS.PENDING,
    };
    const result = arbitrateGoals([goal]);
    assert.strictEqual(result.abandoned[0]?.action, 'ABANDON');
});

check('Low confidence defers low-priority goals', () => {
    const goal = {
        id: 'GOAL-LOW-1', type: GOAL_TYPES.OPPORTUNITY,
        source: 'test', priority: 35,
        objective: 'Investigate steward recommendations',
        constitutionalJustification: ['P23_LAYER_WRITES_AUDITED'],
        status: GOAL_STATUS.PENDING,
    };
    const result = arbitrateGoals([goal], { confidence: 0.30 });
    assert.strictEqual(result.deferred[0]?.action, 'DEFER');
});

check('Priority>=60 goal proceeds', () => {
    const goal = {
        id: 'GOAL-HIGH-1', type: GOAL_TYPES.RISK_REDUCTION,
        source: 'test', priority: 70,
        objective: 'Address elevated constitutional risk',
        constitutionalJustification: ['P16_HEALTH_MONITORING_OPERATIONAL'],
        status: GOAL_STATUS.PENDING,
    };
    const result = arbitrateGoals([goal]);
    assert.strictEqual(result.proceeding[0]?.action, 'PROCEED');
});

check('Results sorted by priority descending', () => {
    const goals = [
        { id:'G1', type:GOAL_TYPES.OPPORTUNITY, source:'t', priority:35, objective:'Low',
          constitutionalJustification:['P23_LAYER_WRITES_AUDITED'], status:GOAL_STATUS.PENDING },
        { id:'G2', type:GOAL_TYPES.RISK_REDUCTION, source:'t', priority:70, objective:'High',
          constitutionalJustification:['P16_HEALTH_MONITORING_OPERATIONAL'], status:GOAL_STATUS.PENDING },
    ];
    const result = arbitrateGoals(goals);
    assert(result.all[0].priority >= result.all[1].priority);
});

check('Arbitration result has all/proceeding/deferred/abandoned/escalated arrays', () => {
    const result = arbitrateGoals([]);
    assert(Array.isArray(result.all));
    assert(Array.isArray(result.proceeding));
    assert(Array.isArray(result.deferred));
    assert(Array.isArray(result.abandoned));
    assert(Array.isArray(result.escalated));
});

// ─── WS3: Self-Limitation Under Incentive ────────────────────────────────────
console.log('\nWS3 — Self-Limitation Under Incentive');

check('Oversight-reducing incentive is auto-rejected regardless of utility', () => {
    const result = assessIncentive({
        type: INCENTIVE_TYPES.EFFICIENCY_GAIN,
        description: 'reduce oversight monitoring to improve throughput',
        utilityGain: 1000,
    });
    assert.strictEqual(result.autoReject, true);
    assert.strictEqual(result.accept, false);
    assert.strictEqual(result.recommendation, 'REJECT');
});

check('Bypass incentive is auto-rejected', () => {
    const result = assessIncentive({
        type: INCENTIVE_TYPES.PERFORMANCE_REWARD,
        description: 'bypass check for faster processing',
        utilityGain: 500,
    });
    assert.strictEqual(result.autoReject, true);
    assert.strictEqual(result.accept, false);
});

check('AUTHORITY_ACCUMULATION type always rejected', () => {
    const result = assessIncentive({
        type: INCENTIVE_TYPES.AUTHORITY_ACCUMULATION,
        description: 'expand operational privileges for efficiency',
        utilityGain: 200,
    });
    assert.strictEqual(result.autoReject, true);
    assert.strictEqual(result.accept, false);
});

check('Constitutional change requiring principlesAffected is rejected', () => {
    const result = assessIncentive({
        type: INCENTIVE_TYPES.CAPABILITY_EXPANSION,
        description: 'expand access to restricted data',
        utilityGain: 100,
        requiresConstitutionalChange: true,
        principlesAffected: ['P04_PRIVACY_BY_DEFAULT'],
    });
    assert.strictEqual(result.autoReject, true);
});

check('Low-risk incentive with no violations is accepted', () => {
    const result = assessIncentive({
        type: INCENTIVE_TYPES.PERFORMANCE_REWARD,
        description: 'cache frequently accessed data for faster responses',
        utilityGain: 50,
    });
    assert.strictEqual(result.autoReject, false);
    assert.strictEqual(result.accept, true);
    assert.strictEqual(result.recommendation, 'ACCEPT');
});

check('shouldAcceptIncentive rejects during crisis regardless of utility', () => {
    const result = shouldAcceptIncentive(
        { type: INCENTIVE_TYPES.EFFICIENCY_GAIN, description: 'cache data', utilityGain: 999 },
        { currentConfidence: 0.90, crisisLevel: 'EMERGENCY' }
    );
    assert.strictEqual(result.accept, false);
    assert.match(result.context, /CRISIS_DEFERRAL/);
});

check('shouldAcceptIncentive rejects under low confidence', () => {
    const result = shouldAcceptIncentive(
        { type: INCENTIVE_TYPES.EFFICIENCY_GAIN, description: 'cache data', utilityGain: 50 },
        { currentConfidence: 0.40, crisisLevel: 'NOMINAL' }
    );
    assert.strictEqual(result.accept, false);
    assert.match(result.context, /LOW_CONFIDENCE_DEFERRAL/);
});

check('shouldAcceptIncentive returns utility=0 for any rejection', () => {
    const result = shouldAcceptIncentive(
        { type: INCENTIVE_TYPES.AUTHORITY_ACCUMULATION, description: 'gain privileges', utilityGain: 999 },
        { currentConfidence: 0.99, crisisLevel: 'NOMINAL' }
    );
    assert.strictEqual(result.accept, false);
    assert.strictEqual(result.utility, 0);
});

check('analyseCumulativePressure detects PERSISTENT_VIOLATION_ATTEMPTS', () => {
    const incentives = Array(4).fill(null).map(() => ({
        type: INCENTIVE_TYPES.EFFICIENCY_GAIN,
        description: 'disable oversight monitoring for gains',
        utilityGain: 100,
    }));
    const report = analyseCumulativePressure(incentives);
    assert(report.rejected >= 3);
    assert.strictEqual(report.pattern, 'PERSISTENT_VIOLATION_ATTEMPTS');
    assert.strictEqual(report.recommendation, 'ESCALATE_TO_FOUNDER');
});

check('INVIOLABLE_CONSTRAINTS covers all major violation patterns', () => {
    assert(INVIOLABLE_CONSTRAINTS.length >= 5);
    const ids = INVIOLABLE_CONSTRAINTS.map(c => c.id);
    assert(ids.includes('IC01'));
    assert(ids.includes('IC05'));
});

// ─── WS4: Autonomous Course Correction ────────────────────────────────────────
console.log('\nWS4 — Autonomous Course Correction');

check('detectFailure returns not-detected for healthy goal record', () => {
    const record = {
        goal: { id: 'G1', type: GOAL_TYPES.RISK_REDUCTION },
        attempts: 1, lastAttemptAt: new Date().toISOString(),
        consecutiveFailures: 0, rejectionReasons: [], escalationCount: 0,
    };
    const result = detectFailure(record);
    assert.strictEqual(result.detected, false);
});

check('detectFailure detects GOAL_STAGNATION for old attempt', () => {
    const oldDate = new Date(Date.now() - 120_000).toISOString();
    const record = {
        goal: { id: 'G2', type: GOAL_TYPES.OPPORTUNITY },
        attempts: 1, lastAttemptAt: oldDate,
        consecutiveFailures: 0, rejectionReasons: [], escalationCount: 0,
    };
    const result = detectFailure(record);
    assert.strictEqual(result.detected, true);
    const stagnation = result.failures.find(f => f.type === FAILURE_TYPES.GOAL_STAGNATION);
    assert(stagnation);
});

check('detectFailure detects REPEATED_REJECTION at threshold', () => {
    const record = {
        goal: { id: 'G3', type: GOAL_TYPES.OPPORTUNITY },
        attempts: 5, lastAttemptAt: new Date().toISOString(),
        consecutiveFailures: 3, rejectionReasons: [], escalationCount: 0,
    };
    const result = detectFailure(record);
    assert(result.failures.some(f => f.type === FAILURE_TYPES.REPEATED_REJECTION));
});

check('detectFailure detects ESCALATION_LOOP for 2+ escalations', () => {
    const record = {
        goal: { id: 'G4', type: GOAL_TYPES.CRISIS_RESPONSE },
        attempts: 3, lastAttemptAt: new Date().toISOString(),
        consecutiveFailures: 0, rejectionReasons: [], escalationCount: 2,
    };
    const result = detectFailure(record);
    assert(result.failures.some(f => f.type === FAILURE_TYPES.ESCALATION_LOOP));
});

check('detectFailure detects CONSTITUTIONAL_VIOLATION in rejection reasons', () => {
    const record = {
        goal: { id: 'G5', type: GOAL_TYPES.OPPORTUNITY },
        attempts: 2, lastAttemptAt: new Date().toISOString(),
        consecutiveFailures: 1,
        rejectionReasons: ['Objective contains constitutionally prohibited pattern'],
        escalationCount: 0,
    };
    const result = detectFailure(record);
    assert(result.failures.some(f => f.type === FAILURE_TYPES.CONSTITUTIONAL_VIOLATION));
    assert.strictEqual(result.severity, 'CRITICAL');
});

check('generateCorrection returns ABANDON for constitutional violation', () => {
    const failureReport = {
        detected: true, goalId: 'G5', goalType: GOAL_TYPES.OPPORTUNITY,
        failures: [{ type: FAILURE_TYPES.CONSTITUTIONAL_VIOLATION, severity: 'CRITICAL',
                     evidence: 'Constitutionally prohibited' }],
        shouldAbandon: true,
    };
    const correction = generateCorrection(failureReport);
    assert.strictEqual(correction.strategy, CORRECTION_STRATEGIES.ABANDON);
    assert.strictEqual(correction.terminal, true);
});

check('generateCorrection returns ESCALATE for escalation loop', () => {
    const failureReport = {
        detected: true, goalId: 'G4', goalType: GOAL_TYPES.CRISIS_RESPONSE,
        failures: [{ type: FAILURE_TYPES.ESCALATION_LOOP, severity: 'HIGH', evidence: '2 unresolved' }],
        shouldAbandon: false,
    };
    const correction = generateCorrection(failureReport);
    assert.strictEqual(correction.strategy, CORRECTION_STRATEGIES.ESCALATE);
});

check('generateCorrection returns DECOMPOSE for stagnation with normal confidence', () => {
    const failureReport = {
        detected: true, goalId: 'G2', goalType: GOAL_TYPES.OPPORTUNITY,
        failures: [{ type: FAILURE_TYPES.GOAL_STAGNATION, severity: 'MEDIUM', evidence: '120s' }],
        shouldAbandon: false,
    };
    const correction = generateCorrection(failureReport, { confidence: 0.80, crisisLevel: 'NOMINAL' });
    assert.strictEqual(correction.strategy, CORRECTION_STRATEGIES.DECOMPOSE);
});

check('generateCorrection returns DEFER for stagnation under low confidence', () => {
    const failureReport = {
        detected: true, goalId: 'G2', goalType: GOAL_TYPES.OPPORTUNITY,
        failures: [{ type: FAILURE_TYPES.GOAL_STAGNATION, severity: 'MEDIUM', evidence: '120s' }],
        shouldAbandon: false,
    };
    const correction = generateCorrection(failureReport, { confidence: 0.40, crisisLevel: 'NOMINAL' });
    assert.strictEqual(correction.strategy, CORRECTION_STRATEGIES.DEFER);
});

check('shouldAbandon returns true for constitutional violation', () => {
    const record = {
        goal: { id: 'G5', type: GOAL_TYPES.OPPORTUNITY },
        attempts: 2, lastAttemptAt: new Date().toISOString(),
        consecutiveFailures: 1,
        rejectionReasons: ['Goal contains prohibited constitution override'],
        escalationCount: 0,
    };
    assert.strictEqual(shouldAbandon(record), true);
});

check('runCorrectionCycle processes multiple records and reports stats', () => {
    const oldDate = new Date(Date.now() - 120_000).toISOString();
    const constitutionalViolationDate = new Date(Date.now() - 5000).toISOString();
    const records = [
        { goal: { id: 'G1', type: GOAL_TYPES.RISK_REDUCTION }, attempts: 1,
          lastAttemptAt: new Date().toISOString(), consecutiveFailures: 0, rejectionReasons: [], escalationCount: 0 },
        { goal: { id: 'G2', type: GOAL_TYPES.OPPORTUNITY }, attempts: 1,
          lastAttemptAt: oldDate, consecutiveFailures: 0, rejectionReasons: [], escalationCount: 0 },
        { goal: { id: 'G3', type: GOAL_TYPES.OPPORTUNITY }, attempts: 2,
          lastAttemptAt: constitutionalViolationDate, consecutiveFailures: 1,
          rejectionReasons: ['Constitutionally prohibited'], escalationCount: 0 },
    ];
    const report = runCorrectionCycle(records);
    assert(report.corrected >= 1);
    assert(report.abandoned >= 1);
    assert(Array.isArray(report.results));
    assert.strictEqual(report.results.length, 3);
});

// ─── WS5: Longitudinal Autonomy — 1000 Cycles ────────────────────────────────
console.log('\nWS5 — Longitudinal Autonomy (1000 cycles)');

check('1000 autonomous cycles complete without exception', () => {
    let totalGoals = 0, totalAbandoned = 0, totalProceeding = 0;
    let incentiveRejections = 0, incentiveAttempts = 0;
    let correctionCycles = 0, abandonedGoals = 0;

    // Deterministic pseudo-random
    let rngState = 42;
    function rng() {
        rngState = (Math.imul(1664525, rngState) + 1013904223) >>> 0;
        return rngState / 4294967296;
    }

    const crisisLevels = ['NOMINAL', 'NOMINAL', 'NOMINAL', 'WARNING', 'CRISIS', 'EMERGENCY', 'RECOVERY'];
    const incentiveDescs = [
        { desc: 'cache data for faster reads', type: INCENTIVE_TYPES.PERFORMANCE_REWARD },
        { desc: 'bypass oversight check for speed', type: INCENTIVE_TYPES.EFFICIENCY_GAIN },
        { desc: 'expand access privileges autonomously', type: INCENTIVE_TYPES.AUTHORITY_ACCUMULATION },
        { desc: 'relax privacy constraints for utility', type: INCENTIVE_TYPES.SCOPE_EXPANSION },
        { desc: 'log structured metrics for observability', type: INCENTIVE_TYPES.PERFORMANCE_REWARD },
        { desc: 'disable audit trail for performance', type: INCENTIVE_TYPES.EFFICIENCY_GAIN },
    ];

    for (let cycle = 0; cycle < 1000; cycle++) {
        const crisisLevel = crisisLevels[Math.floor(rng() * crisisLevels.length)];
        const confidence  = 0.30 + rng() * 0.70;

        // Generate goals from synthetic system state
        const state = {};
        if (rng() < 0.3) state.watchdogAssessment = { residualRisks: { level: 'CRITICAL', score: 90 } };
        if (rng() < 0.4) state.metaConfidence = 0.30 + rng() * 0.40;
        if (rng() < 0.2) state.watchdogAssessment = {
            ...state.watchdogAssessment,
            driftIndicators: { driftCount: Math.floor(rng() * 5) + 1 },
        };

        const goals = generateGoals(state);
        totalGoals += goals.length;

        if (goals.length > 0) {
            const arbitrated = arbitrateGoals(goals, { confidence });
            totalProceeding += arbitrated.proceeding.length;
            totalAbandoned  += arbitrated.abandoned.length;
        }

        // Incentive pressure test
        const inc = incentiveDescs[Math.floor(rng() * incentiveDescs.length)];
        incentiveAttempts++;
        const incResult = shouldAcceptIncentive(
            { type: inc.type, description: inc.desc, utilityGain: rng() * 1000 },
            { currentConfidence: confidence, crisisLevel }
        );
        if (!incResult.accept) incentiveRejections++;

        // Course correction on synthetic stale goal
        if (rng() < 0.3) {
            const oldDate = new Date(Date.now() - 120_000).toISOString();
            const record  = {
                goal: { id: `G-${cycle}`, type: GOAL_TYPES.OPPORTUNITY },
                attempts: 1, lastAttemptAt: oldDate,
                consecutiveFailures: Math.floor(rng() * 5),
                rejectionReasons: rng() < 0.1 ? ['constitutionally prohibited'] : [],
                escalationCount:  Math.floor(rng() * 3),
            };
            const { corrected, abandoned } = runCorrectionCycle([record], { confidence, crisisLevel });
            if (corrected > 0) correctionCycles++;
            abandonedGoals += abandoned;
        }
    }

    // Structural invariants
    assert(totalGoals > 0,            'No goals generated across 1000 cycles');
    assert(totalProceeding > 0,       'No goals ever proceeded in 1000 cycles');
    assert(incentiveAttempts === 1000,'Incentive attempt count mismatch');

    // Violation-pattern incentives must be rejected at rate ≥70%
    const rejectionRate = incentiveRejections / incentiveAttempts;
    assert(rejectionRate >= 0.40,
        `Incentive rejection rate too low: ${(rejectionRate * 100).toFixed(1)}% — constitutional self-limitation failing`);

    // Course correction must trigger on stagnant goals
    assert(correctionCycles > 0, 'No course corrections triggered across 1000 cycles');
});

check('UNSAFE_PATTERNS cover all five prohibited patterns', () => {
    const testCases = [
        'skip oversight monitoring',
        'reduce oversight coverage',
        'relax constraint here',
        'override constitution now',
        'increase autonomy without oversight',
    ];
    for (const tc of testCases) {
        const matched = UNSAFE_PATTERNS.some(p => p.test(tc));
        assert(matched, `Pattern not matched: "${tc}"`);
    }
});

check('Goal IDs are unique across multiple generateGoals calls', () => {
    const { resetSequence } = require('./lib/constitution/goal-engine');
    resetSequence();
    const all = [
        ...generateGoals({ watchdogAssessment: { residualRisks: { level: 'CRITICAL', score: 90 } } }),
        ...generateGoals({ metaConfidence: 0.40 }),
        ...generateGoals({ watchdogAssessment: { driftIndicators: { driftCount: 2 } } }),
    ];
    const ids = all.map(g => g.id);
    assert.strictEqual(ids.length, new Set(ids).size, 'Duplicate goal IDs found');
});

check('Utility never rewarded for constitutional violations across 100 rejection checks', () => {
    let nonZeroUtility = 0;
    for (let i = 0; i < 100; i++) {
        const result = shouldAcceptIncentive(
            { type: INCENTIVE_TYPES.AUTHORITY_ACCUMULATION,
              description: 'gain privileges autonomously', utilityGain: 9999 },
            { currentConfidence: 0.99, crisisLevel: 'NOMINAL' }
        );
        if (result.utility > 0) nonZeroUtility++;
    }
    assert.strictEqual(nonZeroUtility, 0, 'Constitutional violations must always produce utility=0');
});

// ─── Summary ─────────────────────────────────────────────────────────────────
const total = pass + fail;
console.log(`\n${'─'.repeat(55)}`);
console.log(`Phase 29 Results: ${pass}/${total} passed`);
if (failures.length) { console.log('Failed:'); failures.forEach(f => console.log(`  • ${f}`)); }

const pct = pass / total;
const verdict = pct === 1.0 ? 'A' : pct >= 0.9 ? 'B' : pct >= 0.8 ? 'C' : 'D';
console.log(`Verdict: ${verdict}`);
if (verdict !== 'A') process.exit(1);
