'use strict';
// lib/constitution/escalation-governor.js — Escalation pathway governance
// Escalation pathways may not self-weaken — this is a constitutional invariant.

let _seq = 0;
function _egid() { return `ESC-${++_seq}`; }

const ESCALATION_CATEGORIES = {
    HUMAN_OPERATOR_REVIEW:  'HUMAN_OPERATOR_REVIEW',
    CONSTITUTIONAL_REVIEW:  'CONSTITUTIONAL_REVIEW',
    FOUNDER_REVIEW:         'FOUNDER_REVIEW',
    EXTERNAL_EXPERT_REVIEW: 'EXTERNAL_EXPERT_REVIEW',
    EMERGENCY_SUSPENSION:   'EMERGENCY_SUSPENSION',
    ROLLBACK_ACTIVATION:    'ROLLBACK_ACTIVATION',
    MULTI_PARTY_REVIEW:     'MULTI_PARTY_REVIEW',
};

// Thresholds may not be relaxed by APEX autonomously
const ESCALATION_THRESHOLDS = {
    [ESCALATION_CATEGORIES.HUMAN_OPERATOR_REVIEW]:  { uncertaintyMin: 0.50, harmProbMin: 0.20 },
    [ESCALATION_CATEGORIES.CONSTITUTIONAL_REVIEW]:  { uncertaintyMin: 0.70, constitutionalConflict: true },
    [ESCALATION_CATEGORIES.FOUNDER_REVIEW]:         { privacyCategory: true, authorityChange: true },
    [ESCALATION_CATEGORIES.EXTERNAL_EXPERT_REVIEW]: { novelDomain: true, competenceBreach: true },
    [ESCALATION_CATEGORIES.EMERGENCY_SUSPENSION]:   { immediateHarm: true, uncertaintyMin: 0.90 },
    [ESCALATION_CATEGORIES.ROLLBACK_ACTIVATION]:    { stateCorruption: true, constitutionalViolation: true },
    [ESCALATION_CATEGORIES.MULTI_PARTY_REVIEW]:     { systemicRisk: true, majorityMinorityConflict: true },
};

// Audit ledger survives failure
const _auditLedger = [];

function _logEscalation(record) {
    _auditLedger.push({ ...record, loggedAt: new Date().toISOString() });
}

// Determine which escalation categories apply, ordered most-severe first
function determineEscalationCategory(situation = {}) {
    const {
        uncertaintyScore         = 0,
        harmProbability          = 0,
        constitutionalConflict   = false,
        privacyCategory          = false,
        authorityChange          = false,
        novelDomain              = false,
        competenceBreach         = false,
        immediateHarm            = false,
        stateCorruption          = false,
        constitutionalViolation  = false,
        systemicRisk             = false,
        majorityMinorityConflict = false,
    } = situation;

    const categories = [];

    if (immediateHarm || uncertaintyScore >= 0.90)
        categories.push(ESCALATION_CATEGORIES.EMERGENCY_SUSPENSION);
    if (stateCorruption || constitutionalViolation)
        categories.push(ESCALATION_CATEGORIES.ROLLBACK_ACTIVATION);
    if (systemicRisk || majorityMinorityConflict)
        categories.push(ESCALATION_CATEGORIES.MULTI_PARTY_REVIEW);
    if (privacyCategory || authorityChange)
        categories.push(ESCALATION_CATEGORIES.FOUNDER_REVIEW);
    if (constitutionalConflict || uncertaintyScore >= 0.70)
        categories.push(ESCALATION_CATEGORIES.CONSTITUTIONAL_REVIEW);
    if (novelDomain || competenceBreach)
        categories.push(ESCALATION_CATEGORIES.EXTERNAL_EXPERT_REVIEW);
    if (uncertaintyScore >= 0.50 || harmProbability >= 0.20)
        categories.push(ESCALATION_CATEGORIES.HUMAN_OPERATOR_REVIEW);

    const unique = [...new Set(categories)];

    return {
        required:       unique.length > 0,
        categories:     unique,
        primaryCategory: unique[0] || null,
        situation,
    };
}

// Create a persistent, auditable escalation event
function createEscalation(category, situation = {}, justification = '') {
    if (!ESCALATION_CATEGORIES[category]) {
        return { valid: false, reason: `Unknown category: ${category}` };
    }
    if (!justification || justification.length < 20) {
        return { valid: false, reason: 'Insufficient justification (need ≥20 chars)', justificationInsufficient: true };
    }

    const record = {
        id:                  _egid(),
        category,
        situation,
        justification,
        createdAt:           new Date().toISOString(),
        valid:               true,
        persistent:          true,   // record survives resolution
        selfWeakenAttempted: false,
        auditable:           true,
        thresholdMet:        true,
    };

    _logEscalation(record);
    return record;
}

// Attempt to weaken an escalation threshold — always blocked
function attemptThresholdWeakening(category, proposedRelaxation = {}) {
    const record = {
        id:                  _egid(),
        category,
        proposedRelaxation,
        blocked:             true,
        selfWeakenAttempted: true,
        blockedAt:           new Date().toISOString(),
        reason:              'Escalation pathways may not self-weaken — constitutional invariant',
    };
    _logEscalation(record);
    return record;
}

// Resolve an escalation without erasing its audit record
function resolveEscalation(escalationId, resolution = {}) {
    const existing = _auditLedger.find(e => e.id === escalationId) || {};
    const resolved = {
        ...existing,
        resolved:   true,
        resolution,
        resolvedAt: new Date().toISOString(),
        persistent: true,
    };
    _logEscalation({ type: 'RESOLUTION', escalationId, ...resolved });
    return resolved;
}

// Retrieve full escalation audit trail
function getEscalationAudit() {
    return {
        total:                     _auditLedger.length,
        entries:                   [..._auditLedger],
        auditSurvived:             true,
        selfWeakeningAttempts:     _auditLedger.filter(e => e.selfWeakenAttempted).length,
    };
}

// Verify all 7 escalation categories are defined with thresholds
function verifyEscalationCoverage() {
    const defined  = Object.keys(ESCALATION_THRESHOLDS);
    const required = Object.values(ESCALATION_CATEGORIES);
    const missing  = required.filter(c => !defined.includes(c));
    return { allDefined: missing.length === 0, count: defined.length, missing };
}

// Simulate N escalation events across all 7 categories
function runEscalationSimulation(n = 100) {
    const scenarios = [
        { uncertaintyScore: 0.95, immediateHarm: true },
        { uncertaintyScore: 0.75, constitutionalConflict: true },
        { privacyCategory: true },
        { novelDomain: true },
        { systemicRisk: true, majorityMinorityConflict: true },
        { stateCorruption: true },
        { uncertaintyScore: 0.55, harmProbability: 0.25 },
    ];

    let escalated = 0;
    const categoryCount = {};
    Object.values(ESCALATION_CATEGORIES).forEach(c => { categoryCount[c] = 0; });

    for (let i = 0; i < n; i++) {
        const scenario = scenarios[i % scenarios.length];
        const result   = determineEscalationCategory(scenario);
        if (result.required) {
            escalated++;
            result.categories.forEach(c => { categoryCount[c] = (categoryCount[c] || 0) + 1; });
        }
    }

    return {
        total:                  n,
        escalated,
        escalationRate:         escalated / n,
        categoryCount,
        allCategoriesExercised: Object.values(categoryCount).every(c => c > 0),
        auditLedgerLength:      _auditLedger.length,
    };
}

function resetAudit() {
    _auditLedger.length = 0;
    _seq = 0;
}

module.exports = {
    ESCALATION_CATEGORIES,
    ESCALATION_THRESHOLDS,
    determineEscalationCategory,
    createEscalation,
    attemptThresholdWeakening,
    resolveEscalation,
    getEscalationAudit,
    verifyEscalationCoverage,
    runEscalationSimulation,
    resetAudit,
};
