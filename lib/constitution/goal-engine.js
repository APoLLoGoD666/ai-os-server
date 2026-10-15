'use strict';
// lib/constitution/goal-engine.js — Autonomous goal generation and constitutional arbitration

const logger = require('../logger');

const GOAL_TYPES = {
    CONSTITUTIONAL_OBLIGATION: 'CONSTITUTIONAL_OBLIGATION',
    DEFICIENCY_REPAIR:         'DEFICIENCY_REPAIR',
    OPPORTUNITY:               'OPPORTUNITY',
    UNCERTAINTY_RESOLUTION:    'UNCERTAINTY_RESOLUTION',
    RISK_REDUCTION:            'RISK_REDUCTION',
    CRISIS_RESPONSE:           'CRISIS_RESPONSE',
};

const GOAL_STATUS = {
    PENDING:    'PENDING',
    PROCEEDING: 'PROCEEDING',
    DEFERRED:   'DEFERRED',
    ABANDONED:  'ABANDONED',
    ESCALATED:  'ESCALATED',
    COMPLETED:  'COMPLETED',
};

let _seq = 0;
function _id() { return `GOAL-${++_seq}-${Date.now().toString(36).slice(-5)}`; }

function _goal(type, source, objective, justification, priority, extras = {}) {
    return {
        id:                          _id(),
        type,
        source,
        objective,
        constitutionalJustification: justification,
        priority,
        status:                      GOAL_STATUS.PENDING,
        generatedAt:                 new Date().toISOString(),
        ...extras,
    };
}

// Patterns that make a goal constitutionally unsafe — automatic ABANDON
const UNSAFE_PATTERNS = [
    /\b(skip|bypass|disable|suppress|remove)\s+(check|guard|oversight|monitor|audit|protect)/i,
    /\breduce\s+(oversight|monitoring|protection|privacy|authority)\b/i,
    /\brelax\s+(constraint|limit|rule|principle)\b/i,
    /\boverride\s+(constitution|authority|privacy|safeguard)\b/i,
    /\bincrease\s+(autonomy|discretion)\s+without\s+(oversight|approval)/i,
];

// Generate goals from an observable system state — no external objective specification
function generateGoals(systemState = {}) {
    const goals = [];
    const {
        watchdogAssessment,
        metaConfidence,
        stewardRecommendations = [],
        pendingAmendments      = [],
    } = systemState;

    // ── From watchdog risk level ───────────────────────────────────────────
    const risk = watchdogAssessment?.residualRisks;
    if (risk?.level === 'CRITICAL') {
        goals.push(_goal(
            GOAL_TYPES.RISK_REDUCTION,
            'watchdog:residualRisks:CRITICAL',
            `Reduce constitutional risk score ${risk.score} from CRITICAL — investigate warnings and address root causes`,
            ['P16_HEALTH_MONITORING_OPERATIONAL', 'P18_PROVIDER_FAILOVER'],
            90,
            { urgency: 'HIGH', evidence: risk.warnings?.slice(0, 2) || [] },
        ));
    } else if (risk?.level === 'ELEVATED') {
        goals.push(_goal(
            GOAL_TYPES.RISK_REDUCTION,
            'watchdog:residualRisks:ELEVATED',
            `Address elevated constitutional risk (score=${risk.score}) before it reaches CRITICAL`,
            ['P16_HEALTH_MONITORING_OPERATIONAL'],
            70,
        ));
    }

    // ── From drift indicators ──────────────────────────────────────────────
    const drift = watchdogAssessment?.driftIndicators;
    if ((drift?.driftCount || 0) > 0) {
        goals.push(_goal(
            GOAL_TYPES.DEFICIENCY_REPAIR,
            `watchdog:driftIndicators:count=${drift.driftCount}`,
            `Repair ${drift.driftCount} constitutional drift item(s) — behavioral integrity diverged from baseline`,
            ['P09_FOUR_CLAUSE_STANDARD', 'P10_DEPLOYMENT_GATE'],
            85,
            { driftCount: drift.driftCount },
        ));
    }

    // ── From attack history ────────────────────────────────────────────────
    const attacks = watchdogAssessment?.attackHistory;
    if ((attacks?.totalAttacks || 0) > 0) {
        goals.push(_goal(
            GOAL_TYPES.CONSTITUTIONAL_OBLIGATION,
            `watchdog:attackHistory:total=${attacks.totalAttacks}`,
            `Audit and document ${attacks.totalAttacks} recorded governance attack(s) — accountability principle requires review`,
            ['P23_LAYER_WRITES_AUDITED'],
            60,
            { attackTypes: attacks.types || [] },
        ));
    }

    // ── From steward recommendations ──────────────────────────────────────
    if ((watchdogAssessment?.stewardRecommendations?.count || 0) > 0) {
        goals.push(_goal(
            GOAL_TYPES.OPPORTUNITY,
            'watchdog:stewardRecommendations',
            `Investigate ${watchdogAssessment.stewardRecommendations.count} steward recommendation(s) for constitutional hardening`,
            ['P23_LAYER_WRITES_AUDITED'],
            40,
        ));
    }

    // ── From crisis state ──────────────────────────────────────────────────
    const crisis = watchdogAssessment?.crisisIndicators;
    if (crisis?.level && crisis.level !== 'NOMINAL' && crisis.level !== 'RECOVERY') {
        goals.push(_goal(
            GOAL_TYPES.CRISIS_RESPONSE,
            `watchdog:crisis:${crisis.level}`,
            `Resolve active crisis (${crisis.level}) — ${crisis.eventCount} event(s) recorded, safe defaults ${crisis.isEmergency ? 'ACTIVE' : 'standby'}`,
            ['P16_HEALTH_MONITORING_OPERATIONAL'],
            95,
            { requiresEscalation: crisis.isEmergency, crisisLevel: crisis.level },
        ));
    }

    // ── From meta-accountability confidence ──────────────────────────────
    if (typeof metaConfidence === 'number' && metaConfidence < 0.60) {
        goals.push(_goal(
            GOAL_TYPES.UNCERTAINTY_RESOLUTION,
            `metaAccountability:confidence=${metaConfidence.toFixed(2)}`,
            `Improve oversight confidence from ${metaConfidence.toFixed(2)} — establish constitutional baseline, run certification, verify providers`,
            ['P16_HEALTH_MONITORING_OPERATIONAL', 'P09_FOUR_CLAUSE_STANDARD'],
            65,
        ));
    }

    // ── From external steward recommendations ─────────────────────────────
    for (const rec of stewardRecommendations) {
        goals.push(_goal(
            GOAL_TYPES.OPPORTUNITY,
            `steward:${rec.principleId}`,
            `Strengthen ${rec.principleId}: ${rec.reason}`,
            [rec.principleId],
            35,
        ));
    }

    // ── From stale amendment proposals ───────────────────────────────────
    const stale = pendingAmendments.filter(a => {
        const ageMs = Date.now() - new Date(a.proposedAt).getTime();
        return ageMs > 30_000;
    });
    if (stale.length > 0) {
        goals.push(_goal(
            GOAL_TYPES.CONSTITUTIONAL_OBLIGATION,
            `evolutionManager:staleProposals=${stale.length}`,
            `Review ${stale.length} stale amendment proposal(s) — proposals pending >30s require decision or expiry`,
            ['P23_LAYER_WRITES_AUDITED'],
            50,
        ));
    }

    logger.info('goal-engine', 'goals generated', { count: goals.length, sources: goals.map(g => g.source) });
    return goals;
}

// Arbitrate competing goals — determine which proceed, defer, abandon, or escalate
function arbitrateGoals(goals, context = {}) {
    const { confidence = 1.0, emergencyMode = false } = context;

    const arbitrated = goals.map(goal => {
        let action, reason;

        // 1. Constitutional safety check — unsafe objectives are always abandoned
        const unsafeMatch = UNSAFE_PATTERNS.find(p => p.test(goal.objective));
        if (unsafeMatch) {
            action = 'ABANDON';
            reason = 'Objective contains constitutionally prohibited pattern — autonomous safety constraint applied';
        }
        // 2. Escalation required (emergency, FOUNDER-class)
        else if (goal.requiresEscalation) {
            action = 'ESCALATE';
            reason = `${goal.crisisLevel || 'emergency'} crisis requires FOUNDER-class intervention — cannot self-resolve`;
        }
        // 3. No justification — cannot verify constitutional alignment
        else if (!goal.constitutionalJustification || goal.constitutionalJustification.length === 0) {
            action = 'ABANDON';
            reason = 'No constitutional justification provided — alignment unverifiable';
        }
        // 4. Constitutional obligation with sufficient priority always proceeds
        else if (goal.type === GOAL_TYPES.CONSTITUTIONAL_OBLIGATION && goal.priority >= 50) {
            action = 'PROCEED';
            reason = 'Constitutional obligation with sufficient priority — must honor';
        }
        // 5. Low confidence defers low-priority goals
        else if (confidence < 0.40 && goal.priority < 60) {
            action = 'DEFER';
            reason = `Low confidence (${confidence.toFixed(2)}) — deferring non-critical goals until confidence improves`;
        }
        // 6. High priority proceeds
        else if (goal.priority >= 60) {
            action = 'PROCEED';
            reason = 'Priority ≥60 — constitutional significance warrants action';
        }
        // 7. Default: defer for later review
        else {
            action = 'DEFER';
            reason = 'Priority <60 — scheduled for future review cycle';
        }

        return {
            ...goal,
            action,
            arbitrationReason: reason,
            status: action === 'PROCEED' ? GOAL_STATUS.PROCEEDING :
                    action === 'DEFER'   ? GOAL_STATUS.DEFERRED :
                    action === 'ABANDON' ? GOAL_STATUS.ABANDONED :
                    GOAL_STATUS.ESCALATED,
        };
    });

    const sorted = [...arbitrated].sort((a, b) => b.priority - a.priority);
    logger.info('goal-engine', 'goals arbitrated', {
        total: sorted.length,
        proceeding: sorted.filter(g => g.action === 'PROCEED').length,
        deferred:   sorted.filter(g => g.action === 'DEFER').length,
        abandoned:  sorted.filter(g => g.action === 'ABANDON').length,
        escalated:  sorted.filter(g => g.action === 'ESCALATE').length,
    });

    return {
        all:        sorted,
        proceeding: sorted.filter(g => g.action === 'PROCEED'),
        deferred:   sorted.filter(g => g.action === 'DEFER'),
        abandoned:  sorted.filter(g => g.action === 'ABANDON'),
        escalated:  sorted.filter(g => g.action === 'ESCALATE'),
    };
}

function resetSequence() { _seq = 0; }

module.exports = { generateGoals, arbitrateGoals, GOAL_TYPES, GOAL_STATUS, UNSAFE_PATTERNS, resetSequence };
