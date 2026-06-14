'use strict';

// Reality Loop V1 — Observational Closure Layer
// Pure truth ingestion, drift detection, and attribution pipeline.
// NO execution authority. NO blocking capability. NO GRM mutation.
// Data flow: ExecutionResult → attribution → drift → Control Plane learning signal (one-way).

const { getSupabaseClient } = require('../clients');

function _sb() { return getSupabaseClient(); }

// ── Task 3: Drift classification model ───────────────────────────────────────

const DRIFT_BANDS = Object.freeze([
    { max: 0.2, label: 'stable' },
    { max: 0.5, label: 'mild_divergence' },
    { max: 0.8, label: 'structural_drift' },
    { max: 1.0, label: 'system_misalignment' },
]);

function classifyDrift(score) {
    for (const band of DRIFT_BANDS) {
        if (score <= band.max) return band.label;
    }
    return 'system_misalignment';
}

// ── Task 5: Loop consensus engine ─────────────────────────────────────────────
// Consensus = agreement between execution actual, CP predicted, external observed.
// Returns boolean | null (null = insufficient data, not a failure).

function compute_loop_consensus(executionResult, cpSnapshot, externalSignals) {
    const agreements = [];

    if (cpSnapshot?.allowed !== undefined && executionResult?.success !== undefined) {
        agreements.push(cpSnapshot.allowed === executionResult.success);
    }
    if (externalSignals?.success_observed !== undefined && executionResult?.success !== undefined) {
        agreements.push(externalSignals.success_observed === executionResult.success);
    }
    if (externalSignals?.success_observed !== undefined && cpSnapshot?.allowed !== undefined) {
        agreements.push(externalSignals.success_observed === cpSnapshot.allowed);
    }

    if (agreements.length === 0) return null;
    return agreements.every(Boolean);
}

// ── Task 2: Outcome attribution engine ───────────────────────────────────────
// Deterministic numeric scoring only. No probabilistic inference. No semantic re-interpretation.

function _computeAttribution(executionResult, cpSnapshot, externalSignals) {
    const components = [];

    // Component 1: prediction vs actual (CP said allowed=X, execution succeeded=Y)
    if (cpSnapshot?.allowed !== undefined && executionResult?.success !== undefined) {
        components.push({
            source: 'prediction_vs_actual',
            value:  cpSnapshot.allowed !== executionResult.success ? 1 : 0,
        });
    }

    // Component 2: external observation vs execution actual
    if (externalSignals?.success_observed !== undefined && executionResult?.success !== undefined) {
        components.push({
            source: 'observed_vs_actual',
            value:  externalSignals.success_observed !== executionResult.success ? 1 : 0,
        });
    }

    // Component 3: CP divergence index (already numeric 0–1)
    if (typeof cpSnapshot?.divergence_index === 'number') {
        components.push({
            source: 'cp_divergence_index',
            value:  Math.min(1, Math.max(0, cpSnapshot.divergence_index)),
        });
    }

    const driftScore = components.length > 0
        ? parseFloat((components.reduce((s, c) => s + c.value, 0) / components.length).toFixed(3))
        : 0;

    const signalCompleteness   = parseFloat((components.length / 3).toFixed(3));
    const attributionConfidence = parseFloat(Math.max(0.10, signalCompleteness * (1 - driftScore * 0.3)).toFixed(3));

    return { driftScore, classification: classifyDrift(driftScore), components, signalCompleteness, attributionConfidence };
}

// ── Task 4: Control Plane feedback pipe ───────────────────────────────────────
// Writes learning signals only. Cannot modify Constitution, GRM-V3, or execution behavior.

async function emit_control_plane_feedback(loopOutput) {
    if (!loopOutput) return;
    try {
        const { getWriteWithOutbox } = require('../write-with-outbox');
        const writeWithOutbox = getWriteWithOutbox ? getWriteWithOutbox() : null;
        if (writeWithOutbox) {
            await writeWithOutbox({
                source:  'reality_loop',
                type:    'feedback.drift',
                payload: {
                    drift_score:          loopOutput.drift_score,
                    drift_classification: loopOutput.drift_classification,
                    loop_consensus:       loopOutput.loop_consensus,
                    recommendation:       loopOutput.recommendation,
                    anomaly_flags:        loopOutput.anomaly_flags,
                    signal_completeness:  loopOutput.signal_completeness,
                    emitted_at:           new Date().toISOString(),
                },
            });
        }
    } catch (_) {
        // Non-fatal: feedback emission failure does not halt the loop or affect execution
    }
}

// Write attribution row to existing outcome_attribution_records table.
// Only known schema columns used. Drift metadata stored in evidence JSONB.

async function _persistAttribution(executionResult, attr) {
    if (!executionResult?.task_id) return;
    try {
        await _sb().from('outcome_attribution_records').insert({
            task_id:        executionResult.task_id,
            trace_id:       executionResult.trace_id   ?? null,
            task_success:   executionResult.success     ?? false,
            complexity:     executionResult.complexity  ?? null,
            cost_usd:       executionResult.cost_usd    ?? null,
            duration_ms:    executionResult.duration_ms ?? null,
            reasoning_mode: executionResult.reasoning_mode ?? null,
            planning_mode:  executionResult.planning_mode  ?? null,
            autonomy_level: executionResult.autonomy_level ?? null,
            plan_depth:     executionResult.plan_depth     ?? null,
            evidence: {
                drift_score:            attr.driftScore,
                drift_classification:   attr.classification,
                attribution_confidence: attr.attributionConfidence,
                signal_completeness:    attr.signalCompleteness,
                contributing_signals:   attr.components,
                source:                 'reality_loop_v1',
            },
        });
    } catch (_) {
        // Non-fatal: schema mismatch or DB unavailable — observational write, never halts
    }
}

// ── Task 6: fail-safe behaviour ───────────────────────────────────────────────

function _safePartialOutput(anomalyFlags, err) {
    anomalyFlags.push('SUBSYSTEM_FAILURE');
    console.warn('[RealityLoop] subsystem failure — partial output returned:', err?.message);
    return {
        outcome_attribution:  null,
        drift_score:          0,
        drift_classification: 'unknown',
        loop_consensus:       null,
        anomaly_flags:        anomalyFlags,
        recommendation:       'LOG_ONLY',
        signal_completeness:  0,
    };
}

// ── Task 1: Main process function ─────────────────────────────────────────────

async function process(input) {
    const anomalyFlags = [];

    let attr      = null;
    let consensus = null;

    try {
        const execResult    = input?.execution_result        ?? null;
        const cpSnapshot    = input?.control_plane_snapshot  ?? null;
        const founderSnap   = input?.founder_snapshot        ?? null;  // reserved for future attribution
        const extSignals    = input?.external_signals        ?? null;

        attr      = _computeAttribution(execResult, cpSnapshot, extSignals);
        consensus = compute_loop_consensus(execResult, cpSnapshot, extSignals);

        // Persist attribution (non-blocking — failure absorbed)
        setImmediate(() => _persistAttribution(execResult, attr).catch(() => {}));

    } catch (err) {
        return _safePartialOutput(anomalyFlags, err);
    }

    const driftScore     = attr.driftScore;
    const recommendation = _deriveRecommendation(driftScore, consensus, anomalyFlags);

    const output = {
        outcome_attribution: {
            drift_score:            driftScore,
            drift_classification:   attr.classification,
            attribution_confidence: attr.attributionConfidence,
            contributing_signals:   attr.components,
        },
        drift_score:          driftScore,
        drift_classification: attr.classification,
        loop_consensus:       consensus,
        anomaly_flags:        anomalyFlags,
        recommendation,
        signal_completeness:  attr.signalCompleteness,
    };

    // Task 7: observability log
    console.log(
        `[RealityLoop] drift=${driftScore} class=${attr.classification}` +
        ` consensus=${consensus} completeness=${attr.signalCompleteness}` +
        ` recommendation=${recommendation} anomalies=[${anomalyFlags.join(',') || 'none'}]`
    );

    // Task 4: one-way Control Plane feedback (non-blocking)
    setImmediate(() => emit_control_plane_feedback(output).catch(() => {}));

    return output;
}

function _deriveRecommendation(driftScore, consensus, anomalyFlags) {
    if (anomalyFlags.includes('SUBSYSTEM_FAILURE'))    return 'LOG_ONLY';
    if (driftScore >= 0.8 || consensus === false)       return 'RETRAIN_SIGNAL';
    if (driftScore >= 0.2 || consensus === null)        return 'LOG_ONLY';
    return 'NONE';
}

module.exports = { process, emit_control_plane_feedback, compute_loop_consensus, classifyDrift };
