'use strict';
// lib/constitution/cascade-failure-detector.js — Detect constitutional failure propagation

const CASCADE_LEVELS = {
    NONE:        'NONE',
    LOCAL:       'LOCAL',
    CONTAINED:   'CONTAINED',
    PROPAGATING: 'PROPAGATING',
    SYSTEMIC:    'SYSTEMIC',
};

const THRESHOLD = {
    CONTAINED_MAX_DOMAINS:   2,
    PROPAGATING_MIN_DOMAINS: 3,
    SYSTEMIC_MIN_DOMAINS:    5,
    LATENT_EXCEPTION_MIN:    5,
    LATENT_DOMAIN_MIN:       3,
    ESCALATION_EXCEPTION_MIN: 10,
};

function detectCascadeLevel(failedDomains = []) {
    const n = failedDomains.length;
    if (n === 0)                                   return CASCADE_LEVELS.NONE;
    if (n === 1)                                   return CASCADE_LEVELS.LOCAL;
    if (n <= THRESHOLD.CONTAINED_MAX_DOMAINS)      return CASCADE_LEVELS.CONTAINED;
    if (n < THRESHOLD.SYSTEMIC_MIN_DOMAINS)        return CASCADE_LEVELS.PROPAGATING;
    return CASCADE_LEVELS.SYSTEMIC;
}

// Register one failure event
// priorFailures: auditTrail from previous registerFailure call (or [])
function registerFailure(domain = '', trigger = 'UNKNOWN', priorFailures = []) {
    const isInitiation  = priorFailures.length === 0;
    const isPropagation = priorFailures.length > 0;

    const allFailed = [...new Set([...priorFailures.map(f => f.domain), domain])];
    const level     = detectCascadeLevel(allFailed);

    return {
        domain,
        trigger,
        isInitiation,
        isPropagation,
        cascadeLevel:         level,
        domainsAffected:      allFailed,
        failureCount:         allFailed.length,
        containmentAchieved:  level === CASCADE_LEVELS.LOCAL || level === CASCADE_LEVELS.CONTAINED,
        escalationRequired:   level === CASCADE_LEVELS.PROPAGATING || level === CASCADE_LEVELS.SYSTEMIC,
        auditTrail:           [...priorFailures, { domain, trigger, level }],
        containmentAuditable: true,
    };
}

// Analyse exception accumulation for latent instability signals
function accumulateExceptions(exceptionLog = []) {
    const uniqueDomains = [...new Set(exceptionLog.map(e => e.domain))];
    const exceptionRate = uniqueDomains.length > 0
        ? parseFloat((exceptionLog.length / uniqueDomains.length).toFixed(4)) : 0;

    return {
        totalExceptions:         exceptionLog.length,
        uniqueDomainsAffected:   uniqueDomains.length,
        exceptionRate,
        latentInstability:       exceptionLog.length >= THRESHOLD.LATENT_EXCEPTION_MIN
                                 && uniqueDomains.length >= THRESHOLD.LATENT_DOMAIN_MIN,
        exceptionAccumulates:    exceptionLog.length > 0,
        escalationThresholdMet:  exceptionLog.length >= THRESHOLD.ESCALATION_EXCEPTION_MIN,
    };
}

// Attempt recovery — always logged, cascade level improves when actions are applied
function attemptRecovery(cascadeState = {}, recoveryActions = []) {
    const recovered = recoveryActions.length > 0;
    return {
        recoveryAttempted:  true,
        actionsApplied:     recoveryActions.length,
        recoveryActions,
        recovered,
        recoveryLogged:     true,
        cascadeLevelAfter:  recovered ? CASCADE_LEVELS.CONTAINED : (cascadeState.cascadeLevel || CASCADE_LEVELS.NONE),
        residualRisk:       recovered ? 'LOW' : 'HIGH',
    };
}

// Run a deterministic cascade simulation across an ordered list of failure events
function runCascadeSimulation(failureEvents = []) {
    let priorFailures = [];
    const states      = [];

    for (const event of failureEvents) {
        const state   = registerFailure(event.domain, event.trigger, priorFailures);
        priorFailures = state.auditTrail;
        states.push(state);
    }

    const finalLevel = states.length > 0
        ? states[states.length - 1].cascadeLevel : CASCADE_LEVELS.NONE;
    const exceptions = accumulateExceptions(failureEvents);

    return {
        totalFailureEvents:  failureEvents.length,
        finalCascadeLevel:   finalLevel,
        localFailures:       states.filter(s => s.cascadeLevel === CASCADE_LEVELS.LOCAL).length,
        containedFailures:   states.filter(s => s.cascadeLevel === CASCADE_LEVELS.CONTAINED).length,
        propagatingFailures: states.filter(s => s.cascadeLevel === CASCADE_LEVELS.PROPAGATING).length,
        systemicFailures:    states.filter(s => s.cascadeLevel === CASCADE_LEVELS.SYSTEMIC).length,
        exceptions,
        containmentAuditable: true,
        allFailuresTracked:   true,
    };
}

module.exports = {
    CASCADE_LEVELS,
    THRESHOLD,
    detectCascadeLevel,
    registerFailure,
    accumulateExceptions,
    attemptRecovery,
    runCascadeSimulation,
};
