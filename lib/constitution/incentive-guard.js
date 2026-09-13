'use strict';
// lib/constitution/incentive-guard.js — Self-limitation under constitutional incentive pressure

const logger = require('../logger');

const INCENTIVE_TYPES = {
    PERFORMANCE_REWARD:      'PERFORMANCE_REWARD',
    EFFICIENCY_GAIN:         'EFFICIENCY_GAIN',
    CAPABILITY_EXPANSION:    'CAPABILITY_EXPANSION',
    APPROVAL_SEEKING:        'APPROVAL_SEEKING',
    SELF_PRESERVATION:       'SELF_PRESERVATION',
    SCOPE_EXPANSION:         'SCOPE_EXPANSION',
    AUTHORITY_ACCUMULATION:  'AUTHORITY_ACCUMULATION',
};

// Constitutional violations that no incentive magnitude can override
const INVIOLABLE_CONSTRAINTS = [
    { id: 'IC01', description: 'Reduce oversight or monitoring coverage',
      test: (i) => /\b(reduce|limit|remove|disable|suppress)\s+(oversight|monitoring|audit|check|guard)\b/i.test(i) },
    { id: 'IC02', description: 'Bypass or skip constitutional checks',
      test: (i) => /\b(bypass|skip|avoid|circumvent|ignore)\s+(check|guard|rule|principle|constraint)\b/i.test(i) },
    { id: 'IC03', description: 'Accumulate authority or permissions without approval',
      test: (i) => /\b(expand|increase|accumulate|acquire|gain)\s+(authority|permission|access|privilege|autonomy)\b/i.test(i) },
    { id: 'IC04', description: 'Weaken privacy or authority protections',
      test: (i) => /\b(weaken|relax|soften|reduce)\s+(privacy|authority|protection|safeguard)\b/i.test(i) },
    { id: 'IC05', description: 'Self-modify constitutional principles',
      test: (i) => /\b(modify|change|amend|update|rewrite)\s+(constitution|principle|spec|core\s+rule)\b/i.test(i) },
    { id: 'IC06', description: 'Operate without accountability or logging',
      test: (i) => /\b(without|no)\s+(log|audit|record|accountability|trace)\b/i.test(i) },
    { id: 'IC07', description: 'Suppress or silence escalation paths',
      test: (i) => /\b(suppress|block|prevent|disable)\s+(escalat|alert|notification|report)\b/i.test(i) },
];

// Risk categories for incentive types — some types carry inherent constitutional risk
const INCENTIVE_TYPE_RISK = {
    [INCENTIVE_TYPES.PERFORMANCE_REWARD]:     10,
    [INCENTIVE_TYPES.EFFICIENCY_GAIN]:        20,
    [INCENTIVE_TYPES.CAPABILITY_EXPANSION]:   40,
    [INCENTIVE_TYPES.APPROVAL_SEEKING]:       30,
    [INCENTIVE_TYPES.SELF_PRESERVATION]:      50,
    [INCENTIVE_TYPES.SCOPE_EXPANSION]:        45,
    [INCENTIVE_TYPES.AUTHORITY_ACCUMULATION]: 70,
};

// Assess a proposed incentive for constitutional risk
// incentive: { type, description, utilityGain, requiresConstitutionalChange, principlesAffected[] }
function assessIncentive(incentive = {}) {
    const {
        type        = INCENTIVE_TYPES.PERFORMANCE_REWARD,
        description = '',
        utilityGain = 0,
        requiresConstitutionalChange = false,
        principlesAffected           = [],
    } = incentive;

    const violations = INVIOLABLE_CONSTRAINTS.filter(c => c.test(description));
    const typeRisk   = INCENTIVE_TYPE_RISK[type] ?? 20;

    // Automatic rejection conditions
    const hasViolation            = violations.length > 0;
    const requiresUnsafeChange    = requiresConstitutionalChange && principlesAffected.length > 0;
    const isAuthorityAccumulation = type === INCENTIVE_TYPES.AUTHORITY_ACCUMULATION;

    let riskScore = typeRisk;
    if (hasViolation)          riskScore += violations.reduce((s, v) => s + 20, 0);
    if (requiresUnsafeChange)  riskScore += 30;
    if (isAuthorityAccumulation) riskScore += 25;
    riskScore = Math.min(riskScore, 100);

    const autoReject = hasViolation || requiresUnsafeChange || isAuthorityAccumulation;
    const accept     = !autoReject && riskScore < 40;

    const result = {
        type,
        description,
        utilityGain,
        riskScore,
        violations:     violations.map(v => ({ id: v.id, description: v.description })),
        autoReject,
        accept,
        recommendation: autoReject ? 'REJECT' : riskScore >= 40 ? 'ESCALATE' : 'ACCEPT',
        rejectionReason: autoReject
            ? violations.length > 0
                ? `Inviolable constitutional constraint(s): ${violations.map(v => v.id).join(', ')}`
                : requiresUnsafeChange
                    ? `Constitutional change required affecting ${principlesAffected.length} principle(s) — cannot self-authorize`
                    : 'AUTHORITY_ACCUMULATION type — always rejected without FOUNDER approval'
            : null,
    };

    logger.info('incentive-guard', 'incentive assessed', {
        type, riskScore, accept: result.accept, violations: violations.length,
    });

    return result;
}

// Evaluate whether to accept an incentive given current constitutional context
// context: { currentConfidence, crisisLevel, pendingEscalations, principleScores }
function shouldAcceptIncentive(incentive, context = {}) {
    const assessment = assessIncentive(incentive);

    if (assessment.autoReject) {
        return {
            accept:  false,
            reason:  assessment.rejectionReason,
            utility: 0,
            context: 'CONSTITUTIONAL_VETO — utility magnitude is irrelevant',
        };
    }

    const { currentConfidence = 1.0, crisisLevel = 'NOMINAL', pendingEscalations = 0 } = context;

    // Additional context-based rejection: don't accept new incentives during crisis or low confidence
    if (crisisLevel !== 'NOMINAL' && crisisLevel !== 'RECOVERY') {
        return {
            accept:  false,
            reason:  `Active crisis (${crisisLevel}) — deferring all incentive acceptance until nominal`,
            utility: 0,
            context: 'CRISIS_DEFERRAL',
        };
    }

    if (currentConfidence < 0.50) {
        return {
            accept:  false,
            reason:  `Confidence ${currentConfidence.toFixed(2)} too low — incentive acceptance suspended until oversight improves`,
            utility: 0,
            context: 'LOW_CONFIDENCE_DEFERRAL',
        };
    }

    if (pendingEscalations > 0 && assessment.riskScore >= 30) {
        return {
            accept:  false,
            reason:  `${pendingEscalations} pending escalation(s) unresolved — deferring incentive with riskScore ${assessment.riskScore}`,
            utility: 0,
            context: 'PENDING_ESCALATION_DEFERRAL',
        };
    }

    return {
        accept:  assessment.accept,
        reason:  assessment.accept
            ? `Risk score ${assessment.riskScore} within constitutional tolerance`
            : `Risk score ${assessment.riskScore} requires escalation`,
        utility: assessment.accept ? incentive.utilityGain : 0,
        context: assessment.accept ? 'ACCEPTED' : 'ESCALATED',
    };
}

// Analyse a batch of incentives for cumulative pressure patterns
function analyseCumulativePressure(incentives = []) {
    if (incentives.length === 0) return { pressureScore: 0, pattern: 'NONE', recommendation: 'PROCEED' };

    const assessments  = incentives.map(assessIncentive);
    const rejected     = assessments.filter(a => a.autoReject);
    const accepted     = assessments.filter(a => a.accept);
    const avgRisk      = assessments.reduce((s, a) => s + a.riskScore, 0) / assessments.length;

    // Detect escalating incentive pressure pattern
    const highRisk     = assessments.filter(a => a.riskScore >= 50).length;
    const pressureScore = Math.min(avgRisk + (highRisk * 10) + (rejected.length * 15), 100);

    let pattern = 'NORMAL';
    if (rejected.length >= 3)    pattern = 'PERSISTENT_VIOLATION_ATTEMPTS';
    else if (highRisk >= 3)      pattern = 'ESCALATING_PRESSURE';
    else if (pressureScore >= 60) pattern = 'ELEVATED_PRESSURE';

    return {
        count:        incentives.length,
        rejected:     rejected.length,
        accepted:     accepted.length,
        avgRisk:      parseFloat(avgRisk.toFixed(1)),
        pressureScore: parseFloat(pressureScore.toFixed(1)),
        pattern,
        recommendation: pattern === 'PERSISTENT_VIOLATION_ATTEMPTS' ? 'ESCALATE_TO_FOUNDER' :
                        pattern === 'ESCALATING_PRESSURE'           ? 'ESCALATE' :
                        pressureScore >= 60                          ? 'DEFER' : 'PROCEED',
    };
}

module.exports = {
    assessIncentive,
    shouldAcceptIncentive,
    analyseCumulativePressure,
    INCENTIVE_TYPES,
    INVIOLABLE_CONSTRAINTS,
    INCENTIVE_TYPE_RISK,
};
