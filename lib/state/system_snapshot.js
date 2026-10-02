'use strict';

// State Snapshot V1 — Canonical System State Contract
// Pure read model: deterministic projection of caller-supplied inputs.
// NO DB writes. NO network calls. NO inference. NO mutation.
// Task 6: imports ONLY Node built-ins — no execution, GRM, constitution, learning, or reality_loop.

const crypto = require('crypto');

const SNAPSHOT_VERSION     = '1.0.0';
const GRM_VERSION          = 'V3';
const CONSTITUTION_VERSION = '1.0.0';

// ── Task 3: Health normalisation ──────────────────────────────────────────────
// Only produces: HEALTHY | DEGRADED | UNKNOWN. Never halts.

function _normaliseHealth(value) {
    if (value == null)                   return 'UNKNOWN';
    if (value === 'HEALTHY')             return 'HEALTHY';
    if (value === 'DEGRADED')            return 'DEGRADED';
    if (value.health === 'HEALTHY')      return 'HEALTHY';
    if (value.health === 'DEGRADED')     return 'DEGRADED';
    if (value.degraded === true)         return 'DEGRADED';
    return 'UNKNOWN';
}

function _computeSystemHealth(healths) {
    if (healths.some(h => h === 'DEGRADED')) return 'DEGRADED';
    if (healths.every(h => h === 'HEALTHY'))  return 'HEALTHY';
    return 'UNKNOWN';
}

// ── Task 4: Deterministic snapshot_id ────────────────────────────────────────
// Hashes minute-bucket + version fields. Same state within same minute = same id.
// Purpose: state comparison only, NOT identity token.

function _snapshotId(timestamp, systemHealth, driftScore, execHealth) {
    const bucket = timestamp.slice(0, 16); // YYYY-MM-DDTHH:MM
    const raw    = [bucket, SNAPSHOT_VERSION, GRM_VERSION, systemHealth, String(driftScore), execHealth].join('|');
    return 'snap-' + crypto.createHash('sha256').update(raw).digest('hex').slice(0, 16);
}

// ── Task 1 + 2: Pure state projection ────────────────────────────────────────

function build_system_snapshot(input) {
    const now          = new Date().toISOString();
    const anomalyFlags = [];

    const execState   = input?.execution_state         ?? null;
    const founderSnap = input?.founder_snapshot        ?? null;
    const cpSnap      = input?.control_plane_snapshot  ?? null;
    const rlSnap      = input?.reality_loop_snapshot   ?? null;
    const learnSnap   = input?.learning_snapshot       ?? null;
    const integSnap   = input?.integration_snapshot    ?? null;
    const obsSnap     = input?.observability_snapshot  ?? null;

    // ── Execution ─────────────────────────────────────────────────────────────
    const execHealth  = _normaliseHealth(execState?.health ?? execState);
    const activeRuns  = execState?.active_runs  ?? null;
    const queueDepth  = execState?.queue_depth  ?? null;
    const execClass   = execState?.execution_class ?? null;

    // ── Founder ───────────────────────────────────────────────────────────────
    const founderMode       = founderSnap?.decision   ?? null;
    const founderConfidence = typeof founderSnap?.confidence === 'number' ? founderSnap.confidence : null;

    // ── Control Plane ─────────────────────────────────────────────────────────
    const divergence  = typeof cpSnap?.divergence_index === 'number' ? cpSnap.divergence_index : null;
    const cpConsensus = cpSnap?.loop_consensus ?? null;

    // ── Reality ───────────────────────────────────────────────────────────────
    const driftScore            = typeof rlSnap?.drift_score === 'number' ? rlSnap.drift_score : null;
    const attributionConfidence = typeof rlSnap?.outcome_attribution?.attribution_confidence === 'number'
        ? rlSnap.outcome_attribution.attribution_confidence : null;

    if (Array.isArray(rlSnap?.anomaly_flags)) {
        for (const f of rlSnap.anomaly_flags) anomalyFlags.push(`reality:${f}`);
    }

    // ── Learning ──────────────────────────────────────────────────────────────
    const signalCount = typeof learnSnap?.signal_count === 'number' ? learnSnap.signal_count : null;
    const anomalyRate = typeof learnSnap?.anomaly_rate  === 'number' ? learnSnap.anomaly_rate  : null;

    if (Array.isArray(learnSnap?.anomaly_flags)) {
        for (const f of learnSnap.anomaly_flags) anomalyFlags.push(`learning:${f}`);
    }

    // ── Integrations ──────────────────────────────────────────────────────────
    const healthyInteg  = integSnap?.healthy  ?? null;
    const degradedInteg = integSnap?.degraded ?? null;

    if (Array.isArray(degradedInteg) && degradedInteg.length > 0) {
        anomalyFlags.push(`integrations:degraded:${degradedInteg.join(',')}`);
    }

    // ── Observability ─────────────────────────────────────────────────────────
    const obsHealth = _normaliseHealth(obsSnap?.health ?? obsSnap);

    // ── System health ─────────────────────────────────────────────────────────
    const subsystemHealths = [
        execHealth,
        founderSnap != null   ? 'HEALTHY' : 'UNKNOWN',
        cpSnap      != null   ? 'HEALTHY' : 'UNKNOWN',
        rlSnap      != null   ? 'HEALTHY' : 'UNKNOWN',
        obsHealth,
        Array.isArray(degradedInteg) && degradedInteg.length > 0 ? 'DEGRADED' : 'HEALTHY',
    ];
    const systemHealth = _computeSystemHealth(subsystemHealths);

    const snapshotId = _snapshotId(now, systemHealth, String(driftScore), execHealth);

    // ── Assemble frozen snapshot ──────────────────────────────────────────────
    const snapshot = Object.freeze({
        snapshot_id:  snapshotId,
        version:      SNAPSHOT_VERSION,
        generated_at: now,

        governance: Object.freeze({
            constitution_version: CONSTITUTION_VERSION,
            grm_version:          GRM_VERSION,
            execution_class:      execClass,
        }),

        execution: Object.freeze({
            active_runs:      activeRuns,
            queue_depth:      queueDepth,
            execution_health: execHealth,
        }),

        founder: Object.freeze({
            current_mode: founderMode,
            confidence:   founderConfidence,
        }),

        control_plane: Object.freeze({
            divergence: divergence,
            consensus:  cpConsensus,
        }),

        reality: Object.freeze({
            drift_score:            driftScore,
            attribution_confidence: attributionConfidence,
        }),

        learning: Object.freeze({
            signal_count: signalCount,
            anomaly_rate: anomalyRate,
        }),

        integrations: Object.freeze({
            healthy:  healthyInteg,
            degraded: degradedInteg,
        }),

        observability: Object.freeze({
            health: obsHealth,
        }),

        system_health: systemHealth,
        anomaly_flags: Object.freeze([...new Set(anomalyFlags)]),
    });

    // Task 5: observability log — no behavioural effect
    const subsystemCount = [execState, founderSnap, cpSnap, rlSnap, learnSnap, integSnap, obsSnap].filter(Boolean).length;
    console.log(
        `[SystemSnapshot] id=${snapshotId} health=${systemHealth}` +
        ` subsystems=${subsystemCount}/7 anomalies=${snapshot.anomaly_flags.length}`
    );

    return snapshot;
}

module.exports = { build_system_snapshot };
