'use strict';
// lib/runtime/recorder-policy.js
// RECORDER_PURITY_INVARIANT — pure data, no logic, no side effects.
//
// Defines the approved API surface for all RECORDER-tier modules and the
// import tiers they are permitted to consume.
//
// Rules enforced by validate-recorder-purity.js:
//   1. RECORDER modules may only export names listed in ALLOWED_EXPORT_NAMES.
//   2. RECORDER modules must not import modules from FORBIDDEN_IMPORT_TIERS.
//   3. All exported non-primitive values must be frozen (no mutable references).
//   4. No export name in FORBIDDEN_EXPORT_NAMES is permitted.

// Approved export names for all RECORDER-tier modules.
// These are the only symbols a recorder may surface to importers.
const ALLOWED_EXPORT_NAMES = Object.freeze(new Set([
    // Write interface (used by EXECUTION in finalize)
    'record',
    // Read interfaces (observability / diagnostics only)
    'getAll',
    'getLast',
    'getStats',
    'getHealthSnapshot',
    // Reset / test helpers (underscore prefix = test-only by convention)
    'reset',
    '_reset',
    // Immutable numeric constants
    'WINDOW_SIZE',
    'MAX_RECORDS',
]));

// Export names that are unconditionally forbidden.
// A recorder exposing any of these names violates the invariant.
const FORBIDDEN_EXPORT_NAMES = Object.freeze(new Set([
    // Authority verbs — recorders must not expose control-flow hooks
    'evaluate',
    'decide',
    'execute',
    'apply',
    'compile',
    'inject',
    '_inject',
    'configure',
    'setWeight',
    'setThreshold',
    // Mutable state accessors
    'getWindow',
    'getBuffer',
    'getRawStore',
    // Framework/middleware entry points
    'middleware',
    'handler',
    'router',
]));

// Tiers whose modules a RECORDER must not require().
// Recorders are passive sinks — importing decision or execution modules
// would create circular authority channels.
const FORBIDDEN_IMPORT_TIERS = Object.freeze(new Set([
    'EXECUTION',
    'SCORING',
    'DECISION',
    'MIDDLEWARE',
    'INVARIANT',
    'OBSERVABILITY',
]));

// Tiers a RECORDER is permitted to import (if any cross-module require is needed).
const ALLOWED_IMPORT_TIERS = Object.freeze(new Set([
    'RECORDER',   // peer recorders — only for shared utility patterns
]));

module.exports = Object.freeze({
    ALLOWED_EXPORT_NAMES,
    FORBIDDEN_EXPORT_NAMES,
    FORBIDDEN_IMPORT_TIERS,
    ALLOWED_IMPORT_TIERS,
});
