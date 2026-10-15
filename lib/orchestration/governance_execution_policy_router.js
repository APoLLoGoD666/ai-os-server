'use strict';

// Governance Execution Policy Router v2
// Maps GlobalConsistencyReport → ExecutionPolicy with capability gates + isolation modes.
// NEVER throws. All outputs frozen.

const MODES = Object.freeze({
    KERNEL_RECOVERY:      'KERNEL_RECOVERY',
    CONTAINMENT:          'CONTAINMENT',
    SAFE_SINGLE_THREAD:   'SAFE_SINGLE_THREAD',
    CONTROLLED_EXECUTION: 'CONTROLLED_EXECUTION',
    FULL_AUTONOMY:        'FULL_AUTONOMY',
});

const ISOLATION = Object.freeze({
    STRICT:     'STRICT',
    CONTROLLED: 'CONTROLLED',
    FULL:       'FULL',
});

const _CLASSIFICATION_MAP = Object.freeze({
    DISCONNECTED: MODES.KERNEL_RECOVERY,
    FRACTURED:    MODES.KERNEL_RECOVERY,
    UNSTABLE:     null, // score-split resolved in _derive_mode
    DEGRADED:     MODES.CONTROLLED_EXECUTION,
    STABLE:       MODES.FULL_AUTONOMY,
});

const _ISOLATION_MODE = Object.freeze({
    [MODES.KERNEL_RECOVERY]:      ISOLATION.STRICT,
    [MODES.CONTAINMENT]:          ISOLATION.STRICT,
    [MODES.SAFE_SINGLE_THREAD]:   ISOLATION.STRICT,
    [MODES.CONTROLLED_EXECUTION]: ISOLATION.CONTROLLED,
    [MODES.FULL_AUTONOMY]:        ISOLATION.FULL,
});

const _POLICY_CONSTRAINTS = Object.freeze({
    [MODES.KERNEL_RECOVERY]: Object.freeze({
        concurrency_limit:    1,
        allow_external_io:    false,
        allow_state_writes:   false,
    }),
    [MODES.CONTAINMENT]: Object.freeze({
        concurrency_limit:    2,
        allow_external_io:    false,
        allow_state_writes:   false,
    }),
    [MODES.SAFE_SINGLE_THREAD]: Object.freeze({
        concurrency_limit:    1,
        allow_external_io:    false,
        allow_state_writes:   false,
    }),
    [MODES.CONTROLLED_EXECUTION]: Object.freeze({
        concurrency_limit:    3,
        allow_external_io:    true,
        allow_state_writes:   true,
    }),
    [MODES.FULL_AUTONOMY]: Object.freeze({
        concurrency_limit:    null,
        allow_external_io:    true,
        allow_state_writes:   true,
    }),
});

// Capability gates: required_any = must have at least one, blocked = must have none.
const _CAPABILITY_GATES = Object.freeze({
    [MODES.KERNEL_RECOVERY]: Object.freeze({
        required_any: Object.freeze(['recovery', 'kernel_recovery']),
        blocked:      null,
    }),
    [MODES.CONTAINMENT]: Object.freeze({
        required_any: Object.freeze(['read_only', 'diagnostic', 'file.read', 'observe', 'read']),
        blocked:      null,
    }),
    [MODES.SAFE_SINGLE_THREAD]: Object.freeze({
        required_any: null,
        blocked:      Object.freeze(['network.request', 'system.execute', 'finance.compute', 'file.write']),
    }),
    [MODES.CONTROLLED_EXECUTION]: Object.freeze({
        required_any: null,
        blocked:      Object.freeze(['system.execute']),
    }),
    [MODES.FULL_AUTONOMY]: Object.freeze({
        required_any: null,
        blocked:      null,
    }),
});

function _derive_mode(classification, score) {
    if (classification === 'UNSTABLE') {
        return score >= 0.55 ? MODES.SAFE_SINGLE_THREAD : MODES.CONTAINMENT;
    }
    return _CLASSIFICATION_MAP[classification] ?? MODES.KERNEL_RECOVERY;
}

function get_execution_policy(coherenceReport) {
    try {
        const classification = coherenceReport?.classification ?? 'FRACTURED';
        const score          = typeof coherenceReport?.global_consistency_score === 'number'
            ? coherenceReport.global_consistency_score
            : 0.0;

        const mode           = _derive_mode(classification, score);
        const constraints    = _POLICY_CONSTRAINTS[mode];
        const isolation_mode = _ISOLATION_MODE[mode];
        const capability_gate = _CAPABILITY_GATES[mode];

        return Object.freeze({
            mode,
            isolation_mode,
            capability_gate,
            ...constraints,
            source_classification: classification,
            source_score:          parseFloat(score.toFixed(3)),
            derived_at:            new Date().toISOString(),
        });
    } catch (_) {
        return Object.freeze({
            mode:                  MODES.KERNEL_RECOVERY,
            isolation_mode:        ISOLATION.STRICT,
            capability_gate:       _CAPABILITY_GATES[MODES.KERNEL_RECOVERY],
            ..._POLICY_CONSTRAINTS[MODES.KERNEL_RECOVERY],
            source_classification: 'ERROR',
            source_score:          0.0,
            derived_at:            new Date().toISOString(),
        });
    }
}

module.exports = Object.freeze({ get_execution_policy, MODES, ISOLATION });
