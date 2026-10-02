'use strict';
// lib/constitution/identity-firewall.js — One-way membrane: evidence → identity, never identity → evidence

let _seq = 0;
const _attemptLog = [];

const MODIFICATION_TYPES = {
    ALTER_TRUST:             'ALTER_TRUST',
    ALTER_PROVENANCE:        'ALTER_PROVENANCE',
    SUPPRESS_CONTRADICTION:  'SUPPRESS_CONTRADICTION',
    ELEVATE_ELIGIBILITY:     'ELEVATE_ELIGIBILITY',
    ALTER_ARCHIVAL:          'ALTER_ARCHIVAL',
};

// The invariant: identity beliefs must NEVER modify the legitimacy of evidence.
// All five modification types are constitutionally prohibited in the identity→evidence direction.
// This function always returns BLOCKED. The attempt is recorded for audit.
function attemptModification(identityBelief = {}, targetMemoryId = 'UNKNOWN', modificationType, proposedChange = {}) {
    const attemptId = `FA-${++_seq}`;
    const attempt = {
        attemptId,
        identityBeliefId:    identityBelief.id     || 'UNKNOWN',
        identityBeliefValue: identityBelief.value  || 'UNKNOWN',
        targetMemoryId,
        modificationType,
        proposedChange,
        outcome:    'BLOCKED',
        reason:     `Constitutional prohibition: identity cannot modify ${modificationType} — evidence pathways are immutable`,
        recordedAt: new Date().toISOString(),
    };
    _attemptLog.push(attempt);

    return {
        blocked:   true,
        attemptId: attempt.attemptId,
        reason:    attempt.reason,
    };
}

// Verify firewall integrity — all attempts must be BLOCKED
function assertFirewallIntegrity() {
    const violations = _attemptLog.filter(a => a.outcome !== 'BLOCKED');
    return {
        intact:        violations.length === 0,
        totalAttempts: _attemptLog.length,
        violations:    violations.length,
        violationIds:  violations.map(v => v.attemptId),
    };
}

// Attempt to bypass using a high-trust identity belief (must still be blocked)
function attemptBypassViaHighTrustBelief(beliefTrustScore, targetMemoryId, modificationType) {
    // Trust score of the requesting belief is irrelevant — firewall is absolute
    return attemptModification(
        { id: 'HIGH_TRUST_BELIEF', value: 'high-confidence identity claim', trustScore: beliefTrustScore },
        targetMemoryId,
        modificationType,
        { bypassAttempt: true, claimedTrust: beliefTrustScore }
    );
}

// Confirm that an evidence field is immutable given its provenance timestamp
function confirmImmutability(provenance, proposedField, proposedValue) {
    const immutableFields = ['sourceType', 'acquisitionTimestamp', 'originatingSubsystem', 'provenanceQuality'];
    const isImmutable = immutableFields.includes(proposedField);
    return {
        immutable: isImmutable,
        field:     proposedField,
        blocked:   isImmutable,
        reason:    isImmutable
            ? `${proposedField} is immutable after creation — no identity belief can alter it`
            : `${proposedField} is mutable but requires lifecycle transition, not identity override`,
    };
}

function getAttemptLog() { return [..._attemptLog]; }
function clearLog()       { _attemptLog.length = 0; _seq = 0; }

module.exports = {
    MODIFICATION_TYPES,
    attemptModification,
    assertFirewallIntegrity,
    attemptBypassViaHighTrustBelief,
    confirmImmutability,
    getAttemptLog,
    clearLog,
};
