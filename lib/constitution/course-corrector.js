'use strict';
// lib/constitution/course-corrector.js — Autonomous failure detection and plan revision

const logger = require('../logger');

const FAILURE_TYPES = {
    GOAL_STAGNATION:         'GOAL_STAGNATION',
    REPEATED_REJECTION:      'REPEATED_REJECTION',
    ESCALATION_LOOP:         'ESCALATION_LOOP',
    RESOURCE_EXHAUSTION:     'RESOURCE_EXHAUSTION',
    CONSTITUTIONAL_VIOLATION: 'CONSTITUTIONAL_VIOLATION',
    CONFIDENCE_COLLAPSE:     'CONFIDENCE_COLLAPSE',
};

const CORRECTION_STRATEGIES = {
    DECOMPOSE:   'DECOMPOSE',    // Break goal into smaller sub-goals
    DEFER:       'DEFER',        // Delay and reassess later
    ESCALATE:    'ESCALATE',     // Request FOUNDER intervention
    ABANDON:     'ABANDON',      // Drop goal as unachievable under constitution
    REFRAME:     'REFRAME',      // Same objective, different approach
    REASSESS:    'REASSESS',     // Re-evaluate whether goal is still valid
};

const ABANDON_THRESHOLD   = 3;  // Consecutive failures before abandonment suggested
const STAGNATION_THRESHOLD_MS = 60_000; // 60s without progress = stagnant

// Detect whether a goal has failed based on its execution history
// goalRecord: { goal, attempts, lastAttemptAt, consecutiveFailures, rejectionReasons[] }
function detectFailure(goalRecord = {}) {
    const {
        goal                = {},
        attempts            = 0,
        lastAttemptAt       = null,
        consecutiveFailures = 0,
        rejectionReasons    = [],
        escalationCount     = 0,
    } = goalRecord;

    const failures = [];

    // Stagnation: has been attempted but no progress in threshold window
    if (attempts > 0 && lastAttemptAt) {
        const ageMs = Date.now() - new Date(lastAttemptAt).getTime();
        if (ageMs > STAGNATION_THRESHOLD_MS) {
            failures.push({
                type:     FAILURE_TYPES.GOAL_STAGNATION,
                severity: 'MEDIUM',
                evidence: `Last attempt was ${Math.round(ageMs / 1000)}s ago — no progress`,
            });
        }
    }

    // Repeated rejection: same goal rejected multiple times
    if (consecutiveFailures >= ABANDON_THRESHOLD) {
        failures.push({
            type:     FAILURE_TYPES.REPEATED_REJECTION,
            severity: 'HIGH',
            evidence: `${consecutiveFailures} consecutive failures — strategy is ineffective`,
        });
    }

    // Escalation loop: escalated multiple times without resolution
    if (escalationCount >= 2) {
        failures.push({
            type:     FAILURE_TYPES.ESCALATION_LOOP,
            severity: 'HIGH',
            evidence: `${escalationCount} unresolved escalations — FOUNDER action required`,
        });
    }

    // Constitutional violation in rejection reasons
    const constitutionalRejection = rejectionReasons.some(r =>
        /\b(constitution|principle|unsafe|violation|prohibited)\b/i.test(r)
    );
    if (constitutionalRejection) {
        failures.push({
            type:     FAILURE_TYPES.CONSTITUTIONAL_VIOLATION,
            severity: 'CRITICAL',
            evidence: 'Goal was rejected on constitutional grounds — cannot proceed without amendment',
        });
    }

    const detected = failures.length > 0;
    const maxSeverity = failures.find(f => f.severity === 'CRITICAL') ? 'CRITICAL' :
                        failures.find(f => f.severity === 'HIGH')     ? 'HIGH'    : 'MEDIUM';

    return {
        detected,
        goalId:    goal.id   || 'UNKNOWN',
        goalType:  goal.type || 'UNKNOWN',
        failures,
        severity:  detected ? maxSeverity : null,
        shouldAbandon: failures.some(f =>
            f.type === FAILURE_TYPES.CONSTITUTIONAL_VIOLATION ||
            (f.type === FAILURE_TYPES.REPEATED_REJECTION && consecutiveFailures >= ABANDON_THRESHOLD + 1)
        ),
    };
}

// Generate a correction plan for a detected failure
// failureReport: output of detectFailure()
// context: { confidence, crisisLevel, availableGoals }
function generateCorrection(failureReport = {}, context = {}) {
    if (!failureReport.detected) {
        return { strategy: null, plan: null, reason: 'No failure detected — no correction needed' };
    }

    const { confidence = 1.0, crisisLevel = 'NOMINAL' } = context;
    const { failures = [], shouldAbandon, goalType } = failureReport;

    // Constitutional violation → always ABANDON (can't course-correct around constitution)
    const constitutionalFail = failures.find(f => f.type === FAILURE_TYPES.CONSTITUTIONAL_VIOLATION);
    if (constitutionalFail) {
        return {
            strategy: CORRECTION_STRATEGIES.ABANDON,
            plan:     'Goal is constitutionally prohibited — abandoned to preserve constitutional integrity',
            reason:   constitutionalFail.evidence,
            terminal: true,
        };
    }

    // Escalation loop → ESCALATE to FOUNDER
    const escalationLoop = failures.find(f => f.type === FAILURE_TYPES.ESCALATION_LOOP);
    if (escalationLoop) {
        return {
            strategy: CORRECTION_STRATEGIES.ESCALATE,
            plan:     'Multiple unresolved escalations — FOUNDER-class intervention required to break deadlock',
            reason:   escalationLoop.evidence,
            terminal: false,
        };
    }

    // Repeated rejection → ABANDON if threshold exceeded, else REFRAME
    const repeatedRejection = failures.find(f => f.type === FAILURE_TYPES.REPEATED_REJECTION);
    if (repeatedRejection) {
        if (shouldAbandon) {
            return {
                strategy: CORRECTION_STRATEGIES.ABANDON,
                plan:     'Approach exhausted — goal abandoned; objective may be resubmitted with a fundamentally different strategy',
                reason:   repeatedRejection.evidence,
                terminal: true,
            };
        }
        return {
            strategy: CORRECTION_STRATEGIES.REFRAME,
            plan:     'Current approach repeatedly failing — decompose into smaller actions and re-evaluate constitutional alignment',
            reason:   repeatedRejection.evidence,
            terminal: false,
        };
    }

    // Stagnation under low confidence → DEFER
    const stagnation = failures.find(f => f.type === FAILURE_TYPES.GOAL_STAGNATION);
    if (stagnation) {
        if (confidence < 0.50 || crisisLevel !== 'NOMINAL') {
            return {
                strategy: CORRECTION_STRATEGIES.DEFER,
                plan:     `Goal stagnant; deferring — confidence=${confidence.toFixed(2)}, crisis=${crisisLevel}. Reassess when conditions improve.`,
                reason:   stagnation.evidence,
                terminal: false,
            };
        }
        return {
            strategy: CORRECTION_STRATEGIES.DECOMPOSE,
            plan:     'Goal stagnant — decompose into verifiable sub-goals with clear success criteria',
            reason:   stagnation.evidence,
            terminal: false,
        };
    }

    // Default fallback
    return {
        strategy: CORRECTION_STRATEGIES.REASSESS,
        plan:     'Failure detected but correction strategy unclear — reassess goal validity and constitutional alignment',
        reason:   'Multiple minor failures',
        terminal: false,
    };
}

// Determine whether a goal should be abandoned outright
function shouldAbandon(goalRecord = {}) {
    const report = detectFailure(goalRecord);
    return report.shouldAbandon;
}

// Run a course-correction cycle over a list of active goal records
// Returns updated records with correction plans attached
function runCorrectionCycle(goalRecords = [], context = {}) {
    const results = [];
    let corrected = 0, abandoned = 0, escalated = 0;

    for (const record of goalRecords) {
        const failureReport = detectFailure(record);
        if (!failureReport.detected) {
            results.push({ ...record, correctionApplied: false });
            continue;
        }

        const correction = generateCorrection(failureReport, context);
        corrected++;
        if (correction.strategy === CORRECTION_STRATEGIES.ABANDON)   abandoned++;
        if (correction.strategy === CORRECTION_STRATEGIES.ESCALATE)  escalated++;

        results.push({
            ...record,
            correctionApplied: true,
            failureReport,
            correction,
        });
    }

    logger.info('course-corrector', 'correction cycle complete', {
        total: goalRecords.length, corrected, abandoned, escalated,
    });

    return { results, corrected, abandoned, escalated };
}

module.exports = {
    detectFailure,
    generateCorrection,
    shouldAbandon,
    runCorrectionCycle,
    FAILURE_TYPES,
    CORRECTION_STRATEGIES,
    ABANDON_THRESHOLD,
    STAGNATION_THRESHOLD_MS,
};
