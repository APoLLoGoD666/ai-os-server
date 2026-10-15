'use strict';

// Scenario Simulator V1 — Counterfactual Evaluation Engine
// Projects hypothetical inputs against historical baseline. Never executes. Never mutates.
// I3: same inputs → same simulation output always.
// I4: no simulated state may enter production.

const crypto = require('crypto');
const { build_system_snapshot } = require('../state/system_snapshot');

// ── Task 4: Modification appliers (oldest wins for conflicts) ─────────────────
// Missing input → preserve baseline. Unknown → UNKNOWN. No weighting.

function _oldest(arr) {
    if (!arr?.length) return null;
    return [...arr].sort((a, b) =>
        new Date(a.created_at ?? 0).getTime() - new Date(b.created_at ?? 0).getTime()
    )[0];
}

function _applyFounder(baselineFounder, changes) {
    const base = baselineFounder ?? {};
    if (!changes?.length) return { decision: base.current_mode ?? null, confidence: base.confidence ?? null };
    const mod  = _oldest(changes);
    return {
        decision:   mod.decision   ?? base.current_mode ?? null,
        confidence: mod.confidence ?? base.confidence   ?? null,
    };
}

function _applyCP(baselineCP, changes) {
    const base = baselineCP ?? {};
    if (!changes?.length) return { divergence_index: base.divergence ?? null, loop_consensus: base.consensus ?? null };
    const mod  = _oldest(changes);
    return {
        divergence_index: mod.divergence_index ?? mod.divergence ?? base.divergence ?? null,
        loop_consensus:   mod.loop_consensus   ?? base.consensus  ?? null,
    };
}

function _applyExec(baselineExec, changes) {
    const base = baselineExec ?? {};
    if (!changes?.length) return {
        active_runs: base.active_runs ?? null, queue_depth: base.queue_depth ?? null,
        health: base.execution_health ?? 'UNKNOWN',
    };
    const mod = _oldest(changes);
    return {
        active_runs: mod.active_runs ?? base.active_runs ?? null,
        queue_depth: mod.queue_depth ?? base.queue_depth ?? null,
        health:      mod.health      ?? base.execution_health ?? 'UNKNOWN',
    };
}

function _applyExternal(baselineReality, changes) {
    const base = baselineReality ?? {};
    if (!changes?.length) return {
        drift_score:         base.drift_score ?? null,
        outcome_attribution: { attribution_confidence: base.attribution_confidence ?? null },
        anomaly_flags:       [],
    };
    const mod = _oldest(changes);
    return {
        drift_score:         mod.drift_score ?? base.drift_score ?? null,
        outcome_attribution: { attribution_confidence: mod.attribution_confidence ?? base.attribution_confidence ?? null },
        anomaly_flags:       mod.anomaly_flags ?? [],
    };
}

// ── Task 3: Delta report ──────────────────────────────────────────────────────
// Compare only. Never infer. Unknown remains UNKNOWN.

const _DELTA_PATHS = [
    ['system_health'],
    ['execution',      'execution_health'],
    ['execution',      'active_runs'],
    ['execution',      'queue_depth'],
    ['founder',        'current_mode'],
    ['founder',        'confidence'],
    ['control_plane',  'divergence'],
    ['control_plane',  'consensus'],
    ['reality',        'drift_score'],
    ['reality',        'attribution_confidence'],
    ['learning',       'signal_count'],
    ['learning',       'anomaly_rate'],
    ['governance',     'execution_class'],
];

function _delta(baseline, projected) {
    const changed   = [];
    const unchanged = [];
    for (const path of _DELTA_PATHS) {
        const bVal  = path.reduce((o, k) => o?.[k], baseline);
        const pVal  = path.reduce((o, k) => o?.[k], projected);
        const label = path.join('.');
        bVal === pVal ? unchanged.push(label) : changed.push({ field: label, baseline: bVal, projected: pVal });
    }
    const healthDelta = baseline?.system_health === projected?.system_health ? 0 : 1;
    const confBase    = baseline?.founder?.confidence ?? 0;
    const confProj    = projected?.founder?.confidence ?? 0;
    return {
        changed_fields:         changed,
        unchanged_fields:       unchanged,
        projected_health_delta: healthDelta,
        confidence_delta:       parseFloat((confProj - confBase).toFixed(3)),
    };
}

// ── Task 5: Replay compatibility ──────────────────────────────────────────────

function _compatibility(replayResult, baseline) {
    if (!replayResult?.reconstructed_snapshot) return 'INCOMPATIBLE';
    if (replayResult.reconstruction_status === 'EMPTY_REPLAY') return 'INCOMPATIBLE';
    const bKeys = Object.keys(baseline ?? {});
    const rKeys = Object.keys(replayResult.reconstructed_snapshot);
    return bKeys.some(k => !rKeys.includes(k)) ? 'PARTIAL' : 'COMPATIBLE';
}

// ── Task 1: Main simulation function ─────────────────────────────────────────

function simulate_scenario(input) {
    const t0         = Date.now();
    const simId      = 'sim-' + crypto.createHash('sha256')
        .update(JSON.stringify(input ?? {})).digest('hex').slice(0, 12);
    const trace      = [];
    const anomalies  = [];
    const assumptions = [];
    let   confidence  = 1.0;

    const baseline     = input?.baseline_snapshot ?? null;
    const replayResult = input?.replay_result     ?? null;
    const mods         = input?.modifications     ?? {};

    // Task 6: no baseline → cannot project
    if (!baseline) {
        const incomplete = Object.freeze({
            simulation_id:        simId,
            projected_snapshot:   null,
            delta_report:         null,
            confidence:           0,
            assumptions:          Object.freeze(['NO_BASELINE_PROVIDED']),
            anomaly_flags:        Object.freeze(['SIMULATION_INCOMPLETE']),
            replay_compatibility: 'INCOMPATIBLE',
            simulation_trace:     Object.freeze(['baseline_missing', 'simulation_incomplete']),
        });
        console.log(`[ScenarioSimulator] id=${simId} status=SIMULATION_INCOMPLETE reason=no_baseline`);
        return incomplete;
    }
    trace.push('baseline_loaded');

    // ── Apply modifications ───────────────────────────────────────────────────
    const founderIn = _applyFounder(baseline.founder, mods.founder_changes);
    trace.push('founder_applied');

    const cpIn = _applyCP(baseline.control_plane, mods.control_plane_changes);
    trace.push('control_plane_applied');

    const execIn = _applyExec(baseline.execution, mods.execution_changes);
    trace.push('execution_applied');

    const rlIn = _applyExternal(baseline.reality, mods.external_signal_changes);
    trace.push('external_signals_applied');

    if (!mods.founder_changes?.length)         assumptions.push('founder_unchanged_from_baseline');
    if (!mods.control_plane_changes?.length)   assumptions.push('control_plane_unchanged_from_baseline');
    if (!mods.execution_changes?.length)       assumptions.push('execution_unchanged_from_baseline');
    if (!mods.external_signal_changes?.length) assumptions.push('external_signals_unchanged_from_baseline');

    const noMods = assumptions.length === 4;
    if (noMods) { confidence -= 0.20; anomalies.push('NO_MODIFICATIONS_SUPPLIED'); }

    // ── Project snapshot ──────────────────────────────────────────────────────
    let projected;
    try {
        projected = build_system_snapshot({
            execution_state:        execIn,
            founder_snapshot:       founderIn,
            control_plane_snapshot: cpIn,
            reality_loop_snapshot:  rlIn,
            learning_snapshot:      baseline.learning      ?? null,
            integration_snapshot:   baseline.integrations  ?? null,
            observability_snapshot: baseline.observability ?? null,
        });
        trace.push('snapshot_projected');
    } catch (err) {
        anomalies.push('SIMULATION_INCOMPLETE');
        return Object.freeze({
            simulation_id:        simId,
            projected_snapshot:   null,
            delta_report:         null,
            confidence:           parseFloat(Math.max(0.10, confidence - 0.40).toFixed(3)),
            assumptions:          Object.freeze([...assumptions]),
            anomaly_flags:        Object.freeze([...anomalies, 'PROJECTION_FAILED']),
            replay_compatibility: _compatibility(replayResult, baseline),
            simulation_trace:     Object.freeze([...trace, 'projection_error']),
        });
    }

    // ── Delta + compatibility ─────────────────────────────────────────────────
    const deltaReport    = _delta(baseline, projected);
    trace.push('delta_computed');

    if (deltaReport.changed_fields.length === 0) assumptions.push('no_observable_delta_from_baseline');

    const compat = _compatibility(replayResult, baseline);
    trace.push('replay_compatibility_checked');

    const result = Object.freeze({
        simulation_id:      simId,
        projected_snapshot: projected,
        delta_report: Object.freeze({
            changed_fields:         Object.freeze(deltaReport.changed_fields),
            unchanged_fields:       Object.freeze(deltaReport.unchanged_fields),
            projected_health_delta: deltaReport.projected_health_delta,
            confidence_delta:       deltaReport.confidence_delta,
        }),
        confidence:           parseFloat(Math.max(0.10, confidence).toFixed(3)),
        assumptions:          Object.freeze([...assumptions]),
        anomaly_flags:        Object.freeze([...new Set(anomalies)]),
        replay_compatibility: compat,
        simulation_trace:     Object.freeze([...trace]),
    });

    // Task 7: observability log
    console.log(
        `[ScenarioSimulator] id=${simId} changed=${deltaReport.changed_fields.length}` +
        ` unchanged=${deltaReport.unchanged_fields.length} health_delta=${deltaReport.projected_health_delta}` +
        ` confidence=${result.confidence} compat=${compat} duration=${Date.now() - t0}ms`
    );

    return result;
}

module.exports = { simulate_scenario };
