'use strict';

// Execution Orchestrator V1 — Post-Execution Governance Pipeline
// Single entry point. Runs all 8 governance stages sequentially after execution.
// NO execution authority. NO mutation of live state. NO blocking of caller.
// I3: same execution_id → same ExecutionTrace (idempotent cache).

const realityLoop     = require('../reality/reality_loop');
const truthInjection  = require('../learning/truth_injection_contract');
const { build_system_snapshot }       = require('../state/system_snapshot');
const { record_execution_receipt }    = require('../audit/decision_ledger');
const { simulate_scenario }           = require('../simulation/scenario_simulator');
const { certify_execution }           = require('../certification/execution_certification_engine');
const { assess_covenant }             = require('../deployment/deployment_covenant');
const { compute_coherence }           = require('./architecture_coherence_layer');
const { get_registry }                = require('../registry/autonomous_architecture_registry');
const bus                             = require('./governance_event_bus');

const _cache = new Map(); // execution_id → ExecutionTrace (idempotency)

// ── Pipeline ──────────────────────────────────────────────────────────────────

async function process(execution_event) {
    const execId    = execution_event?.execution_id ?? null;
    const trace     = [];
    const anomalies = [];

    // Idempotency: same execution_id → return cached trace
    if (execId && _cache.has(execId)) return _cache.get(execId);

    trace.push('orchestration_initiated');

    // Build minimal execution_result shape for downstream modules
    const meta = execution_event?.metadata ?? {};
    const executionResult = {
        task_id:    meta.task_id    ?? execId,
        success:    meta.success    ?? (execution_event?.output?.status === 'completed'),
        output:     execution_event?.output ?? null,
        timestamp:  execution_event?.timestamp ?? new Date().toISOString(),
    };

    // ── Step a: Reality Loop ──────────────────────────────────────────────────
    let rlResult = null;
    try {
        rlResult = await realityLoop.process({
            execution_result:       executionResult,
            control_plane_snapshot: meta.control_plane_snapshot ?? null,
            founder_snapshot:       meta.founder_snapshot       ?? null,
            external_signals:       meta.external_signals       ?? null,
        });
        trace.push('reality_loop_complete');
    } catch (_) {
        anomalies.push('REALITY_LOOP_FAILED');
        trace.push('reality_loop_failed');
    }

    // ── Step b: Truth Injection ───────────────────────────────────────────────
    let truthSignal = null;
    try {
        truthSignal = truthInjection.transform({
            reality_loop_output: rlResult,
            execution_context:   { task_id: executionResult.task_id, trace_id: execId },
        });
        trace.push('truth_injection_complete');
    } catch (_) {
        anomalies.push('TRUTH_INJECTION_FAILED');
        trace.push('truth_injection_failed');
    }

    // ── Step c: System Snapshot ───────────────────────────────────────────────
    let systemSnapshot = null;
    try {
        systemSnapshot = build_system_snapshot({
            reality_loop_snapshot: rlResult ? {
                drift_score:        rlResult.drift_score,
                outcome_attribution: rlResult.outcome_attribution,
                anomaly_flags:      rlResult.anomaly_flags,
            } : null,
            execution_state: {
                active_runs:       1,
                queue_depth:       0,
                execution_health:  executionResult.success ? 'HEALTHY' : 'DEGRADED',
            },
        });
        trace.push('system_snapshot_complete');
    } catch (_) {
        anomalies.push('SYSTEM_SNAPSHOT_FAILED');
        trace.push('system_snapshot_failed');
    }

    // ── Step d: Decision Ledger ───────────────────────────────────────────────
    let dlReceipt = null;
    try {
        dlReceipt = await record_execution_receipt({
            execution_id:          execId,
            final_action_bundle:   { action: meta.task_id ?? execId, source: 'orchestrator' },
            reality_snapshot:      rlResult,
            truth_signal:          truthSignal,
            system_snapshot_id:    systemSnapshot?.snapshot_id ?? null,
            control_plane_snapshot: meta.control_plane_snapshot ?? null,
        });
        trace.push('decision_ledger_complete');
    } catch (_) {
        anomalies.push('DECISION_LEDGER_FAILED');
        trace.push('decision_ledger_failed');
    }

    // ── Step e: Scenario Simulation ───────────────────────────────────────────
    let simResult = null;
    try {
        simResult = simulate_scenario({
            baseline_snapshot: systemSnapshot,
            replay_result:     null,
            modifications:     {},
        });
        trace.push('simulation_complete');
    } catch (_) {
        anomalies.push('SIMULATION_FAILED');
        trace.push('simulation_failed');
    }

    // ── Step f: Execution Certification ──────────────────────────────────────
    let certResult = null;
    try {
        certResult = certify_execution({
            decision_receipt: dlReceipt,
            scenario_result:  simResult,
            system_snapshot:  systemSnapshot,
        });
        trace.push('certification_complete');
    } catch (_) {
        anomalies.push('CERTIFICATION_FAILED');
        trace.push('certification_failed');
    }

    // ── Step g: Deployment Covenant ───────────────────────────────────────────
    let covenantResult = null;
    try {
        covenantResult = assess_covenant({
            execution_certification: certResult,
            decision_receipt:        dlReceipt,
        });
        trace.push('covenant_complete');
    } catch (_) {
        anomalies.push('COVENANT_FAILED');
        trace.push('covenant_failed');
    }

    // ── Step h: Architecture Coherence ────────────────────────────────────────
    let coherenceResult = null;
    try {
        coherenceResult = compute_coherence({
            registry:                get_registry(),
            execution_certification: certResult,
            deployment_covenant:     covenantResult,
            decision_receipt:        dlReceipt,
        });
        trace.push('coherence_complete');
    } catch (_) {
        anomalies.push('COHERENCE_FAILED');
        trace.push('coherence_failed');
    }

    // ── Assemble ExecutionTrace ───────────────────────────────────────────────
    const status = anomalies.length === 0 ? 'PIPELINE_COMPLETE' : 'PIPELINE_INCOMPLETE';

    const executionTrace = Object.freeze({
        execution_id:     execId,
        status,
        anomaly_flags:    Object.freeze([...anomalies]),
        trace:            Object.freeze([...trace, 'orchestration_sealed']),
        reality_loop:     rlResult      ?? null,
        truth_signal:     truthSignal   ?? null,
        system_snapshot:  systemSnapshot ?? null,
        decision_receipt: dlReceipt     ?? null,
        simulation:       simResult     ?? null,
        certification:    certResult    ?? null,
        covenant:         covenantResult ?? null,
        coherence:        coherenceResult ?? null,
        generated_at:     new Date().toISOString(),
    });

    // Cache for idempotency
    if (execId) _cache.set(execId, executionTrace);

    // Emit to event bus (fire-and-forget, no throw)
    try { bus.emit('EXECUTION_TRACE', { execution_id: execId, status, anomaly_count: anomalies.length }); } catch (_) {}

    console.log(
        `[ExecutionOrchestrator] id=${execId} status=${status}` +
        ` anomalies=${anomalies.length} steps=${trace.length}`
    );

    return executionTrace;
}

module.exports = { process };
