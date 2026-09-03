'use strict';

// Truth Injection Contract V1 — Structured Learning Substrate
// Pure deterministic transform: RealityLoopOutput → StructuredLearningSignal.
// Same input always produces same signal (I4 — deterministic mapping).
// NO execution authority. NO GRM influence. NO upstream return path.

const { getSupabaseClient } = require('../clients');
function _sb() { return getSupabaseClient(); }

// ── Task 4: Deterministic mapping tables ──────────────────────────────────────

const _DRIFT_SIGNAL_MAP = Object.freeze([
    { max: 0.2, type: 'SYSTEM_STABILITY' },
    { max: 0.5, type: 'DRIFT_OBSERVED'   },
    { max: 0.8, type: 'ANOMALY_CLUSTER'  },
    { max: 1.0, type: 'CONSENSUS_BREAK'  },
]);

const _DRIFT_SEVERITY_MAP = Object.freeze([
    { max: 0.3, level: 'LOW'    },
    { max: 0.7, level: 'MEDIUM' },
    { max: 1.0, level: 'HIGH'   },
]);

const _SIGNAL_TAGGING = Object.freeze({
    SYSTEM_STABILITY: 'IGNORE',
    DRIFT_OBSERVED:   'MONITOR',
    ANOMALY_CLUSTER:  'HIGHLIGHT',
    CONSENSUS_BREAK:  'STORE_ONLY',
});

function _signalType(driftScore) {
    for (const band of _DRIFT_SIGNAL_MAP)    if (driftScore <= band.max) return band.type;
    return 'CONSENSUS_BREAK';
}

function _severity(driftScore) {
    for (const band of _DRIFT_SEVERITY_MAP) if (driftScore <= band.max) return band.level;
    return 'HIGH';
}

function _tagging(signalType, anomalyFlags) {
    if (anomalyFlags.length > 0) return 'STORE_ONLY';
    return _SIGNAL_TAGGING[signalType] ?? 'MONITOR';
}

// ── Task 3: StructuredLearningSignal construction ────────────────────────────

function _buildSignal(rlo, execContext) {
    const driftScore = typeof rlo.drift_score === 'number' ? rlo.drift_score : 0;
    const consensus  = rlo.loop_consensus;
    const anomalies  = rlo.anomaly_flags ?? [];

    let signalType = _signalType(driftScore);
    let severity   = _severity(driftScore);

    // Consensus override rule (Task 4 — overrides drift-based type)
    if (consensus === false) {
        signalType = 'CONSENSUS_BREAK';
        severity   = 'HIGH';
    }

    const components = rlo.outcome_attribution?.contributing_signals ?? [];
    const predComp   = components.find(c => c.source === 'prediction_vs_actual');
    const execComp   = components.find(c => c.source === 'observed_vs_actual');

    return Object.freeze({
        signal_type: signalType,
        severity,
        drift_score: driftScore,
        attribution_summary: Object.freeze({
            prediction_error:    predComp?.value     ?? null,
            execution_delta:     execComp?.value     ?? null,
            signal_completeness: rlo.signal_completeness ?? null,
        }),
        classification:      rlo.drift_classification ?? 'unknown',
        recommended_tagging: _tagging(signalType, anomalies),
        metadata: Object.freeze({
            timestamp:     new Date().toISOString(),
            source:        'reality_loop_v1',
            task_id:       execContext?.task_id   ?? null,
            trace_id:      execContext?.trace_id  ?? null,
            anomaly_flags: anomalies,
            recommendation: rlo.recommendation   ?? null,
        }),
    });
}

// ── Task 6: Append-only learning signal store ─────────────────────────────────
// Insert only. No update. No delete. No backpropagation effects (I3).

const learning_signal_store = Object.freeze({
    async write(signal) {
        try {
            await _sb().from('learning_signals').insert({
                signal_type:         signal.signal_type,
                severity:            signal.severity,
                drift_score:         signal.drift_score,
                classification:      signal.classification,
                recommended_tagging: signal.recommended_tagging,
                attribution_summary: signal.attribution_summary,
                metadata:            signal.metadata,
                created_at:          signal.metadata.timestamp,
            });
        } catch (_) {
            // Table may not yet exist — non-fatal; signal already logged to stdout
        }
    },
});

// ── Task 1 + 2: Main transform ────────────────────────────────────────────────
// Synchronous and pure (DB write is fire-and-forget via setImmediate).

function transform(input) {
    const rlo         = input?.reality_loop_output    ?? {};
    const execContext = input?.execution_context      ?? null;

    const signal = _buildSignal(rlo, execContext);

    // Task 8: observability log — no behavioural effect
    console.log(
        `[TruthInjection] type=${signal.signal_type} severity=${signal.severity}` +
        ` drift=${signal.drift_score} class=${signal.classification}` +
        ` consensus=${rlo.loop_consensus} tagging=${signal.recommended_tagging}`
    );

    // Task 6: append to store (non-blocking — I2: no execution coupling)
    setImmediate(() => learning_signal_store.write(signal).catch(() => {}));

    return signal;
}

module.exports = { transform, learning_signal_store };
