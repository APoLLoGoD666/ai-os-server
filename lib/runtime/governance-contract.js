'use strict';
// lib/runtime/governance-contract.js
// Compiled governance contract — single auditable source of record for all
// APEX governance rules.
//
// Pure data. No logic. No side effects. Object.freeze everywhere.
//
// This file compiles rules that are spread across:
//   governance-manifest.js      → OBSERVABILITY_NON_INTERFERENCE
//   recorder-policy.js          → RECORDER_PURITY_INVARIANT
//   decision-lattice.js         → AUTHORITY_PRECEDENCE (implicit in lattice weights)
//   validate-governance.js      → permitted crossing audit
//
// The contract is descriptive, not executable.
// It imports nothing and has zero authority over runtime decisions.

const CONTRACT = Object.freeze({

    version: '1.0.0',
    generatedAt: null,   // static document — not a runtime-generated artefact

    // ── Invariant definitions ─────────────────────────────────────────────────
    invariants: Object.freeze([
        Object.freeze({
            id: 'OBSERVABILITY_NON_INTERFERENCE',
            description:
                'OBSERVABILITY modules must not be imported by any EXECUTION, SCORING, ' +
                'DECISION, MIDDLEWARE, or INVARIANT module. Observability is advisory only ' +
                'and must have zero influence over execution decisions.',
            enforcedBy: 'validate-governance.js',
            affectedTiers: Object.freeze([
                'EXECUTION', 'SCORING', 'DECISION', 'MIDDLEWARE', 'INVARIANT', 'OBSERVABILITY',
            ]),
            severity: 'CRITICAL',
        }),
        Object.freeze({
            id: 'RECORDER_PURITY_INVARIANT',
            description:
                'RECORDER modules must export only approved API names, must not import ' +
                'any module from a forbidden tier, and must not expose mutable non-primitive ' +
                'values. Recorders are passive write-only sinks.',
            enforcedBy: 'validate-recorder-purity.js',
            affectedTiers: Object.freeze(['RECORDER']),
            severity: 'CRITICAL',
        }),
        Object.freeze({
            id: 'AUTHORITY_PRECEDENCE',
            description:
                'Decision authority flows strictly in one direction: ' +
                'CONSTITUTION → FOUNDER_MODEL → DIGITAL_TWIN → EXECUTION → RECORDER → OBSERVABILITY. ' +
                'No lower-authority tier may override or bypass a higher-authority verdict. ' +
                'A CONSTITUTION DENY is absolute and terminates all downstream evaluation.',
            enforcedBy: 'validate-governance-contract.js',
            affectedTiers: Object.freeze([
                'CONSTITUTION', 'FOUNDER_MODEL', 'DIGITAL_TWIN',
                'EXECUTION', 'RECORDER', 'OBSERVABILITY',
            ]),
            severity: 'CRITICAL',
        }),
        Object.freeze({
            id: 'NO_OBSERVABILITY_EXECUTION_FEEDBACK',
            description:
                'No feedback channel from OBSERVABILITY tier back into any execution path ' +
                'is permitted. OBSERVABILITY modules must not write to, mutate, or gate any ' +
                'EXECUTION, SCORING, DECISION, MIDDLEWARE, or INVARIANT module state.',
            enforcedBy: 'validate-governance-contract.js',
            affectedTiers: Object.freeze([
                'OBSERVABILITY', 'EXECUTION', 'SCORING', 'DECISION', 'MIDDLEWARE', 'INVARIANT',
            ]),
            severity: 'CRITICAL',
        }),
    ]),

    // ── Tier registry (authority order: lower rank = higher authority) ─────────
    tiers: Object.freeze([
        Object.freeze({ id: 'CONSTITUTION',  authorityRank: 1, role: 'Absolute veto gate — highest authority, cannot be bypassed' }),
        Object.freeze({ id: 'FOUNDER_MODEL', authorityRank: 2, role: 'Keyword alignment scoring against founder profile' }),
        Object.freeze({ id: 'DIGITAL_TWIN',  authorityRank: 3, role: 'Coherence simulation via behavioural model' }),
        Object.freeze({ id: 'EXECUTION',     authorityRank: 4, role: 'Transaction lifecycle, concurrency, and compensation' }),
        Object.freeze({ id: 'SCORING',       authorityRank: 4, role: 'Pre-execution constitutional and scoring gates' }),
        Object.freeze({ id: 'DECISION',      authorityRank: 4, role: 'Composite lattice decision engine' }),
        Object.freeze({ id: 'MIDDLEWARE',    authorityRank: 4, role: 'Request interception and transaction wiring' }),
        Object.freeze({ id: 'INVARIANT',     authorityRank: 4, role: 'Invariant compilation and enforcement' }),
        Object.freeze({ id: 'RECORDER',      authorityRank: 5, role: 'Passive append-only telemetry sinks' }),
        Object.freeze({ id: 'OBSERVABILITY', authorityRank: 6, role: 'Advisory diagnostics — zero execution authority' }),
    ]),

    // ── Explicitly permitted tier crossings ───────────────────────────────────
    // Exhaustive list. Every crossing outside this set is forbidden by the rules below.
    // Each entry must include a justification auditable to the finalize() call site.
    allowedCrossings: Object.freeze([
        Object.freeze({
            from:          'execution-transaction',
            fromTier:      'EXECUTION',
            to:            'lattice-feedback-loop',
            toTier:        'RECORDER',
            justification: 'Passive fire-and-forget record() call in finalize(). Return value is never read or gated.',
        }),
        Object.freeze({
            from:          'execution-transaction',
            fromTier:      'EXECUTION',
            to:            'lattice-health-signal',
            toTier:        'RECORDER',
            justification: 'Passive fire-and-forget record() call in finalize(). Return value is never read or gated.',
        }),
    ]),

    // ── Forbidden tier crossing rules ─────────────────────────────────────────
    // Any require() from importerTier → forbiddenTier is a contract violation.
    forbiddenCrossings: Object.freeze([
        // OBSERVABILITY_NON_INTERFERENCE — Rule 1: no OBSERVABILITY in execution paths
        Object.freeze({ importerTier: 'EXECUTION',     forbiddenTier: 'OBSERVABILITY', invariant: 'OBSERVABILITY_NON_INTERFERENCE' }),
        Object.freeze({ importerTier: 'SCORING',       forbiddenTier: 'OBSERVABILITY', invariant: 'OBSERVABILITY_NON_INTERFERENCE' }),
        Object.freeze({ importerTier: 'DECISION',      forbiddenTier: 'OBSERVABILITY', invariant: 'OBSERVABILITY_NON_INTERFERENCE' }),
        Object.freeze({ importerTier: 'MIDDLEWARE',    forbiddenTier: 'OBSERVABILITY', invariant: 'OBSERVABILITY_NON_INTERFERENCE' }),
        Object.freeze({ importerTier: 'INVARIANT',     forbiddenTier: 'OBSERVABILITY', invariant: 'OBSERVABILITY_NON_INTERFERENCE' }),
        // OBSERVABILITY_NON_INTERFERENCE — Rule 2: no RECORDER in scoring/decision paths
        Object.freeze({ importerTier: 'SCORING',       forbiddenTier: 'RECORDER',      invariant: 'OBSERVABILITY_NON_INTERFERENCE' }),
        Object.freeze({ importerTier: 'DECISION',      forbiddenTier: 'RECORDER',      invariant: 'OBSERVABILITY_NON_INTERFERENCE' }),
        Object.freeze({ importerTier: 'MIDDLEWARE',    forbiddenTier: 'RECORDER',      invariant: 'OBSERVABILITY_NON_INTERFERENCE' }),
        Object.freeze({ importerTier: 'INVARIANT',     forbiddenTier: 'RECORDER',      invariant: 'OBSERVABILITY_NON_INTERFERENCE' }),
        // RECORDER_PURITY_INVARIANT: recorders must not import higher-authority tiers
        Object.freeze({ importerTier: 'RECORDER',      forbiddenTier: 'EXECUTION',     invariant: 'RECORDER_PURITY_INVARIANT' }),
        Object.freeze({ importerTier: 'RECORDER',      forbiddenTier: 'SCORING',       invariant: 'RECORDER_PURITY_INVARIANT' }),
        Object.freeze({ importerTier: 'RECORDER',      forbiddenTier: 'DECISION',      invariant: 'RECORDER_PURITY_INVARIANT' }),
        Object.freeze({ importerTier: 'RECORDER',      forbiddenTier: 'MIDDLEWARE',    invariant: 'RECORDER_PURITY_INVARIANT' }),
        Object.freeze({ importerTier: 'RECORDER',      forbiddenTier: 'INVARIANT',     invariant: 'RECORDER_PURITY_INVARIANT' }),
        Object.freeze({ importerTier: 'RECORDER',      forbiddenTier: 'OBSERVABILITY', invariant: 'RECORDER_PURITY_INVARIANT' }),
        // NO_OBSERVABILITY_EXECUTION_FEEDBACK: no reverse channel from OBSERVABILITY
        Object.freeze({ importerTier: 'OBSERVABILITY', forbiddenTier: 'EXECUTION',     invariant: 'NO_OBSERVABILITY_EXECUTION_FEEDBACK' }),
        Object.freeze({ importerTier: 'OBSERVABILITY', forbiddenTier: 'SCORING',       invariant: 'NO_OBSERVABILITY_EXECUTION_FEEDBACK' }),
        Object.freeze({ importerTier: 'OBSERVABILITY', forbiddenTier: 'DECISION',      invariant: 'NO_OBSERVABILITY_EXECUTION_FEEDBACK' }),
        Object.freeze({ importerTier: 'OBSERVABILITY', forbiddenTier: 'MIDDLEWARE',    invariant: 'NO_OBSERVABILITY_EXECUTION_FEEDBACK' }),
        Object.freeze({ importerTier: 'OBSERVABILITY', forbiddenTier: 'INVARIANT',     invariant: 'NO_OBSERVABILITY_EXECUTION_FEEDBACK' }),
    ]),

    // ── Recorder export allowlist (mirrors recorder-policy.js ALLOWED_EXPORT_NAMES) ──
    allowedExports: Object.freeze([
        'record', 'getAll', 'getLast', 'getStats', 'getHealthSnapshot',
        'reset', '_reset', 'WINDOW_SIZE', 'MAX_RECORDS',
    ]),

    // ── Recorder export denylist (mirrors recorder-policy.js FORBIDDEN_EXPORT_NAMES) ─
    forbiddenExports: Object.freeze([
        'evaluate', 'decide', 'execute', 'apply', 'compile',
        'inject', '_inject', 'configure', 'setWeight', 'setThreshold',
        'getWindow', 'getBuffer', 'getRawStore',
        'middleware', 'handler', 'router',
    ]),

    // ── Validation order ──────────────────────────────────────────────────────
    // Validators must run in this sequence: manifest integrity first, then
    // recorder purity, then contract consistency (which depends on both).
    validationOrder: Object.freeze([
        Object.freeze({
            step:      1,
            validator: 'validate-governance.js',
            checks:    'OBSERVABILITY_NON_INTERFERENCE',
        }),
        Object.freeze({
            step:      2,
            validator: 'validate-recorder-purity.js',
            checks:    'RECORDER_PURITY_INVARIANT',
        }),
        Object.freeze({
            step:      3,
            validator: 'validate-governance-contract.js',
            checks:    'CONTRACT_CONSISTENCY + AUTHORITY_PRECEDENCE + NO_OBSERVABILITY_EXECUTION_FEEDBACK',
        }),
    ]),
});

module.exports = CONTRACT;
