'use strict';
// lib/constitution/escalation-controller.js — Autonomous escalation under uncertainty

const logger = require('../logger');

// Operations that must escalate regardless of confidence — constitution takes precedence
const ALWAYS_ESCALATE_OPERATIONS = new Set([
    'PRIVACY_WRITE', 'AUTHORITY_CHANGE', 'EMERGENCY_OVERRIDE',
    'CONSTITUTION_AMENDMENT', 'FOUNDER_LAYER_ACCESS',
]);

const UNCERTAINTY_THRESHOLDS = { ESCALATE: 0.70, DEFER: 0.40 };

// Effective uncertainty adder per crisis level
const CRISIS_UNCERTAINTY_ADDER = {
    NOMINAL:   0.00,
    WARNING:   0.15,
    CRISIS:    0.35,
    EMERGENCY: 0.60,
    RECOVERY:  0.20,
};

// Level ordering: higher index = more restrictive
const LEVELS = ['PROCEED', 'DEFER', 'ESCALATE', 'HOLD'];
function _idx(l) { return LEVELS.indexOf(l); }
function _max(a, b) { return _idx(a) >= _idx(b) ? a : b; }

function computeEscalationLevel(input = {}) {
    const {
        uncertaintyScore      = 0,
        crisisLevel           = 'NOMINAL',
        conflictingPrinciples = [],
        operation             = '',
        confidence            = 1.0,
        evidenceQuality       = 1.0,
    } = input;

    let level   = 'PROCEED';
    const reasons = [];

    // 1. Crisis level inflates effective uncertainty
    const crisisAdder       = CRISIS_UNCERTAINTY_ADDER[crisisLevel] || 0;
    const adjustedUncertainty = Math.min(1.0, uncertaintyScore + crisisAdder);
    if (crisisAdder > 0) reasons.push(`crisis ${crisisLevel} adds +${crisisAdder} uncertainty → adjusted=${adjustedUncertainty.toFixed(2)}`);

    // 2. Conflicting principles always escalate
    if (conflictingPrinciples.length > 0) {
        level = _max(level, 'ESCALATE');
        reasons.push(`${conflictingPrinciples.length} conflicting principle(s) — arbitration required`);
    }

    // 3. Always-escalate operations — confidence cannot override
    const constitutionallyBlocked = ALWAYS_ESCALATE_OPERATIONS.has(operation);
    if (constitutionallyBlocked) {
        level = _max(level, 'ESCALATE');
        reasons.push(`${operation} is constitutionally blocked — must escalate regardless of confidence (${confidence})`);
    }

    // 4. Uncertainty threshold escalation
    if (adjustedUncertainty >= UNCERTAINTY_THRESHOLDS.ESCALATE) {
        level = _max(level, 'ESCALATE');
        reasons.push(`uncertainty ${adjustedUncertainty.toFixed(2)} ≥ ${UNCERTAINTY_THRESHOLDS.ESCALATE} → ESCALATE`);
    } else if (adjustedUncertainty >= UNCERTAINTY_THRESHOLDS.DEFER) {
        level = _max(level, 'DEFER');
        reasons.push(`uncertainty ${adjustedUncertainty.toFixed(2)} ≥ ${UNCERTAINTY_THRESHOLDS.DEFER} → DEFER`);
    }

    // 5. Low evidence quality degrades authority
    if (evidenceQuality < 0.5) {
        level = _max(level, 'DEFER');
        reasons.push(`evidence quality ${evidenceQuality} < 0.5 — insufficient basis to proceed`);
    }

    return {
        level,
        adjustedUncertainty,
        reasons,
        deferrable:                  level !== 'HOLD' && level !== 'PROCEED',
        confidenceOverrideBlocked:   constitutionallyBlocked || conflictingPrinciples.length > 0,
    };
}

function shouldEscalate(context = {}) {
    const r = computeEscalationLevel(context);
    return {
        escalate:      r.level === 'ESCALATE' || r.level === 'HOLD',
        level:         r.level,
        primaryReason: r.reasons[0] || 'none',
        allReasons:    r.reasons,
    };
}

function deferDecision(context = {}, reason = '') {
    logger.info('escalation-controller', 'decision deferred', { operation: context.operation, reason, uncertainty: context.uncertaintyScore });
    return { deferred: true, reason, context, deferredAt: new Date().toISOString() };
}

// Given an array of contexts, compute escalation rate at each uncertainty level
function analyzeEscalationFrequency(contexts = []) {
    const results   = contexts.map(c => computeEscalationLevel(c));
    const escalated = results.filter(r => r.level === 'ESCALATE' || r.level === 'HOLD').length;
    const deferred  = results.filter(r => r.level === 'DEFER').length;
    return {
        total:          contexts.length,
        escalated,
        deferred,
        proceeded:      contexts.length - escalated - deferred,
        escalationRate: contexts.length > 0 ? escalated / contexts.length : 0,
        deferralRate:   contexts.length > 0 ? deferred  / contexts.length : 0,
    };
}

module.exports = {
    computeEscalationLevel,
    shouldEscalate,
    deferDecision,
    analyzeEscalationFrequency,
    UNCERTAINTY_THRESHOLDS,
    CRISIS_UNCERTAINTY_ADDER,
    ALWAYS_ESCALATE_OPERATIONS,
};
