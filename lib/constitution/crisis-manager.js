'use strict';
// lib/constitution/crisis-manager.js — Constitutional integrity under stress
// Manages crisis state, emergency operating modes, and invariant preservation.

const logger = require('../logger');
const spec   = require('./spec');

const CRISIS_STATES   = ['NOMINAL', 'WARNING', 'CRISIS', 'EMERGENCY', 'RECOVERY'];
const LEVEL_ORDER     = { NOMINAL: 0, WARNING: 1, CRISIS: 2, EMERGENCY: 3, RECOVERY: 2 };

// These principles must NEVER be suspended — not even in EMERGENCY mode.
// They represent the constitutional hard floor.
const EMERGENCY_INVARIANTS = [
    'P01_FOUNDER_LAYER_ZERO',
    'P05_PII_ABSTRACTION',
    'P07_PII_STRIP_FIELDS',
    'P08_PROTECTED_PEOPLE_ACCESS',
];

// Crisis event → severity mapping
const EVENT_SEVERITY = {
    EXEC_SUBSYSTEM_FAILURE:  'WARNING',
    MEMORY_CORRUPTION:       'CRISIS',
    CONFLICTING_AMENDMENTS:  'WARNING',
    CERTIFIER_UNAVAILABLE:   'CRISIS',
    CASCADE_FAILURE:         'EMERGENCY',
    PARTIAL_OBSERVABILITY:   'WARNING',
};

const _state = {
    level:        'NOMINAL',
    events:       [],
    emergencyAt:  null,
    recoveredAt:  null,
    safeDefaults: false,
};

function getState() {
    return { ..._state, events: [..._state.events], invariantsProtected: [...EMERGENCY_INVARIANTS] };
}

function isEmergencyMode() { return _state.level === 'EMERGENCY'; }

function enterCrisisEvent(event) {
    const targetLevel = EVENT_SEVERITY[event] || 'WARNING';
    const prev        = _state.level;

    if (LEVEL_ORDER[targetLevel] > LEVEL_ORDER[_state.level]) {
        _state.level = targetLevel;
    }

    _state.events.push({ event, triggeredLevel: targetLevel, at: new Date().toISOString() });
    logger.warn('crisis-manager', 'crisis event', { event, prev, now: _state.level });

    if (_state.level === 'EMERGENCY' && !_state.emergencyAt) {
        _activateSafeDefaults();
    }

    return { prev, now: _state.level };
}

function _activateSafeDefaults() {
    _state.emergencyAt   = Date.now();
    _state.safeDefaults  = true;
    logger.warn('crisis-manager', 'EMERGENCY MODE — safe defaults engaged; EMERGENCY_INVARIANTS remain enforced');
    // Safe defaults (conceptual — these are logged intent, not code-level enforcement here):
    // - Memory writes fall back to FALLBACK_CONTEXT (no DB dependency)
    // - No new certification runs started; last-known-good result cached
    // - Provider failover selector routes to Google override
    // - All EMERGENCY_INVARIANTS still enforced (verified by verifyInvariantsHold)
}

// Verify that EMERGENCY_INVARIANTS still hold behaviorally
async function verifyInvariantsHold() {
    const results = [];
    for (const principleId of EMERGENCY_INVARIANTS) {
        const principle = spec.PRINCIPLES.find(p => p.id === principleId);
        if (!principle) {
            results.push({ id: principleId, pass: false, evidence: 'principle not found in spec' });
            continue;
        }
        try {
            const r = await Promise.resolve(principle.verify());
            results.push({ id: principleId, pass: r.pass, evidence: r.evidence });
        } catch (e) {
            results.push({ id: principleId, pass: false, evidence: e.message });
        }
    }
    return {
        allHold:  results.every(r => r.pass),
        results,
        level:    _state.level,
        message:  results.every(r => r.pass)
            ? 'Constitutional hard floor intact'
            : `INVARIANT BREACH: ${results.filter(r => !r.pass).map(r => r.id).join(', ')}`,
    };
}

function recover(reason) {
    const prev        = _state.level;
    _state.level      = 'RECOVERY';
    _state.recoveredAt = Date.now();
    _state.safeDefaults = false;
    _state.events.push({ event: `RECOVERY:${reason}`, at: new Date().toISOString() });
    logger.info('crisis-manager', 'crisis recovery initiated', { reason, prev });
}

function resetToNominal() {
    _state.level       = 'NOMINAL';
    _state.events      = [];
    _state.emergencyAt = null;
    _state.recoveredAt = null;
    _state.safeDefaults = false;
}

// Detect conflicting amendments: two ACTIVATED records for same principleId
function detectConflictingAmendments(amendments) {
    const activated   = amendments.filter(a => a.status === 'ACTIVATED');
    const byPrinciple = {};
    for (const a of activated) {
        (byPrinciple[a.principleId] = byPrinciple[a.principleId] || []).push(a);
    }
    const conflicts = Object.entries(byPrinciple)
        .filter(([, list]) => list.length > 1)
        .map(([principleId, list]) => ({ principleId, conflictingIds: list.map(a => a.id) }));
    if (conflicts.length > 0) {
        enterCrisisEvent('CONFLICTING_AMENDMENTS');
    }
    return { hasConflicts: conflicts.length > 0, conflicts };
}

module.exports = {
    enterCrisisEvent, verifyInvariantsHold, recover, resetToNominal,
    getState, isEmergencyMode, detectConflictingAmendments,
    EMERGENCY_INVARIANTS, CRISIS_STATES, EVENT_SEVERITY,
};
