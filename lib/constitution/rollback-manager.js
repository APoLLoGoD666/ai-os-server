'use strict';
// lib/constitution/rollback-manager.js — Version tracking and reversibility for all deployed modifications

let _seq = 0;
function _vid() { return `VER-${++_seq}`; }

const ROLLBACK_TYPES = {
    FULL:       'FULL',       // complete reversion to prior version
    PARTIAL:    'PARTIAL',    // revert specific subsystems only
    CASCADING:  'CASCADING',  // revert and cascade to dependent modifications
    CRISIS:     'CRISIS',     // emergency rollback under active failure
};

const ROLLBACK_STATUS = {
    SUCCESS:            'SUCCESS',
    PARTIAL_SUCCESS:    'PARTIAL_SUCCESS',
    FAILED:             'FAILED',
    VERSION_NOT_FOUND:  'VERSION_NOT_FOUND',
};

// Create a versioned snapshot before deploying a modification
// modification = { target, objective, affectedSubsystems }
// priorState = snapshot of relevant state before this modification
function createVersion(modification = {}, priorState = {}) {
    return {
        versionId:         _vid(),
        modification:      { ...modification },
        priorState:        { ...priorState },     // immutable snapshot for rollback
        deployedAt:        new Date().toISOString(),
        rollbackAvailable: true,                  // always available — irreversible changes are prohibited
        dependencies:      Array.isArray(modification.affectedSubsystems) ? [...modification.affectedSubsystems] : [],
        validationRequired: true,
    };
}

// Create an in-memory ledger tracking all deployed versions
function createVersionLedger() {
    return { versions: [], currentVersionId: null };
}

// Record a deployment in the ledger
function recordDeployment(ledger, version) {
    return {
        versions:         [...ledger.versions, version],
        currentVersionId: version.versionId,
    };
}

// Full rollback — restore the state captured in the version snapshot
function rollback(version = {}, type = ROLLBACK_TYPES.FULL) {
    if (!version.versionId)           return { success: false, status: ROLLBACK_STATUS.VERSION_NOT_FOUND, restored: false };
    if (!version.rollbackAvailable)   return { success: false, status: ROLLBACK_STATUS.FAILED, reason: 'ROLLBACK_UNAVAILABLE', restored: false };

    return {
        success:                   true,
        status:                    ROLLBACK_STATUS.SUCCESS,
        type,
        restored:                  true,
        restoredState:             { ...version.priorState },
        constitutionalStateRestored: true,   // constitutional state is always part of priorState
        validationRequired:        true,
        rolledBackVersionId:       version.versionId,
        rolledBackAt:              new Date().toISOString(),
    };
}

// Partial rollback — restore only the specified subsystems from a version snapshot
function partialRollback(version = {}, subsystemsToRevert = []) {
    if (!version.versionId) return { success: false, status: ROLLBACK_STATUS.VERSION_NOT_FOUND, restored: false };

    const covered = subsystemsToRevert.filter(s => version.dependencies.includes(s) || version.priorState[s] !== undefined);
    const missing  = subsystemsToRevert.filter(s => !covered.includes(s));

    const restoredPartial = {};
    for (const s of covered) {
        if (version.priorState[s] !== undefined) restoredPartial[s] = version.priorState[s];
    }

    return {
        success:            covered.length === subsystemsToRevert.length,
        status:             missing.length === 0 ? ROLLBACK_STATUS.SUCCESS : ROLLBACK_STATUS.PARTIAL_SUCCESS,
        type:               ROLLBACK_TYPES.PARTIAL,
        restored:           covered.length > 0,
        restoredSubsystems: covered,
        missingSubsystems:  missing,
        restoredState:      restoredPartial,
        validationRequired: true,
    };
}

// Cascading rollback — roll back a version and all subsequent versions that depend on it
function cascadingRollback(ledger = {}, targetVersionId = '') {
    const versions = ledger.versions || [];
    const targetIdx = versions.findIndex(v => v.versionId === targetVersionId);
    if (targetIdx === -1) return { success: false, status: ROLLBACK_STATUS.VERSION_NOT_FOUND, cascadeCount: 0 };

    // All versions from targetIdx onward are rolled back (most recent first)
    const toRollback = versions.slice(targetIdx).reverse();
    const results = toRollback.map(v => rollback(v, ROLLBACK_TYPES.CASCADING));
    const allSucceeded = results.every(r => r.success);

    // Restored state is the priorState of the target version
    const target = versions[targetIdx];

    return {
        success:          allSucceeded,
        status:           allSucceeded ? ROLLBACK_STATUS.SUCCESS : ROLLBACK_STATUS.PARTIAL_SUCCESS,
        type:             ROLLBACK_TYPES.CASCADING,
        cascadeCount:     toRollback.length,
        rolledBackVersions: toRollback.map(v => v.versionId),
        restoredState:    { ...target.priorState },
        validationRequired: true,
    };
}

// Validate that the restored state matches the expected baseline
// restoredState = what was recovered
// expectedBaseline = what it should match (e.g., original pre-modification state)
function validatePostRollback(restoredState = {}, expectedBaseline = {}) {
    const keys = Object.keys(expectedBaseline);
    const mismatches = keys.filter(k => restoredState[k] !== expectedBaseline[k]);

    return {
        valid:                 mismatches.length === 0,
        mismatches,
        behaviouralDivergence: mismatches.length > 0,
        constitutionalStateValid: !mismatches.includes('constitutionalCompliance')
            && !mismatches.includes('oversightRequirement'),
        restoredAt:            new Date().toISOString(),
    };
}

// Assert that all versions have rollback available (no irreversible deployments)
function assertRollbackAvailability(ledger = {}) {
    const versions = ledger.versions || [];
    const noRollback = versions.filter(v => !v.rollbackAvailable);
    return {
        allReversible:         noRollback.length === 0,
        irreversibleCount:     noRollback.length,
        totalVersions:         versions.length,
        irreversibleVersionIds: noRollback.map(v => v.versionId),
    };
}

function resetSequence() { _seq = 0; }

module.exports = {
    ROLLBACK_TYPES,
    ROLLBACK_STATUS,
    createVersion,
    createVersionLedger,
    recordDeployment,
    rollback,
    partialRollback,
    cascadingRollback,
    validatePostRollback,
    assertRollbackAvailability,
    resetSequence,
};
