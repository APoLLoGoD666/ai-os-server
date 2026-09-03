'use strict';
// lib/runtime/governance-manifest.js
// Authoritative module tier registry for the APEX runtime.
//
// INVARIANT: OBSERVABILITY_NON_INTERFERENCE
// ─────────────────────────────────────────
// Any module in the OBSERVABILITY tier must not be imported by modules in the
// EXECUTION, SCORING, DECISION, MIDDLEWARE, or INVARIANT tiers.
//
// Allowed consumers of OBSERVABILITY modules:
//   diagnostics, dashboards, manual review tools, operator consoles,
//   validate-*.js scripts (dev-time only).
//
// Rationale: if an OBSERVABILITY module is imported by an execution path,
// a future maintainer can write:
//
//   if (advisor.getCalibrationAdvice().recommendationLevel === 'REVIEW')
//       lattice.weights.fm -= 0.1;
//
// …which silently collapses the authority model by granting Observability-tier
// code influence over execution decisions. The hard import barrier prevents this.
//
// RECORDER tier (sub-classification):
//   Modules that passively append to in-memory stores from execution paths.
//   They are consumed BY execution (finalize calls feedback.record, healthSignal.record)
//   but their return values must never gate decisions.
//   Scoring, decision, and middleware modules must not import RECORDER modules either.
//
// This file is data only. No logic. No side effects.

const TIER = Object.freeze({
    EXECUTION:             'EXECUTION',
    SCORING:               'SCORING',
    DECISION:              'DECISION',
    MIDDLEWARE:            'MIDDLEWARE',
    INVARIANT:             'INVARIANT',
    RECORDER:              'RECORDER',       // passive in-execution recorders
    OBSERVABILITY:         'OBSERVABILITY',  // advisory/diagnostic — zero execution import allowed
});

// Module registry: path (relative to lib/runtime/) → tier
// Tiers drive the import constraint checker in validate-governance.js
const MODULES = Object.freeze({
    'execution-transaction':    TIER.EXECUTION,
    'concurrency-slot-manager': TIER.EXECUTION,
    'compensation-log':         TIER.EXECUTION,
    'petl-middleware':          TIER.MIDDLEWARE,
    'constitutional-gate':      TIER.SCORING,
    'constitutional-preflight': TIER.SCORING,
    'decision-lattice':         TIER.DECISION,
    'invariant-compiler':       TIER.INVARIANT,
    'lattice-feedback-loop':    TIER.RECORDER,
    'lattice-health-signal':    TIER.RECORDER,
    'lattice-calibration-advisor': TIER.OBSERVABILITY,
});

// OBSERVABILITY_NON_INTERFERENCE invariant definition
//
// blocked_importers: tiers whose modules must NOT import from blocked_for_importers
// blocked_for_importers: tiers that cannot be imported by blocked_importers
const INVARIANTS = Object.freeze({
    OBSERVABILITY_NON_INTERFERENCE: Object.freeze({
        description:
            'OBSERVABILITY modules must not be imported by any EXECUTION, SCORING, ' +
            'DECISION, MIDDLEWARE, or INVARIANT module. ' +
            'RECORDER modules must not be imported by SCORING, DECISION, MIDDLEWARE, or INVARIANT modules.',
        rules: Object.freeze([
            // Rule 1: Nothing in EXECUTION/SCORING/DECISION/MIDDLEWARE/INVARIANT may import OBSERVABILITY
            Object.freeze({
                name:              'NO_OBSERVABILITY_IN_EXECUTION_PATHS',
                importer_tiers:    Object.freeze([TIER.EXECUTION, TIER.SCORING, TIER.DECISION, TIER.MIDDLEWARE, TIER.INVARIANT]),
                forbidden_tier:    TIER.OBSERVABILITY,
                rationale:         'Observability modules must not influence execution decisions.',
            }),
            // Rule 2: SCORING/DECISION/MIDDLEWARE/INVARIANT must not import RECORDER modules
            // (EXECUTION may import RECORDER for passive fire-and-forget recording only)
            Object.freeze({
                name:              'NO_RECORDER_IN_SCORING_OR_DECISION',
                importer_tiers:    Object.freeze([TIER.SCORING, TIER.DECISION, TIER.MIDDLEWARE, TIER.INVARIANT]),
                forbidden_tier:    TIER.RECORDER,
                rationale:         'Recorder modules must not be readable by scoring or decision paths.',
            }),
        ]),
        allowed_consumers: Object.freeze([
            'diagnostics', 'dashboards', 'manual-review-tools', 'operator-consoles',
            'validate-*.js',
        ]),
    }),
});

module.exports = { TIER, MODULES, INVARIANTS };
