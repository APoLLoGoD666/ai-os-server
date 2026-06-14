'use strict';

// State Replay V1 — Deterministic State Reconstruction Engine
// Rebuilds historical SystemSnapshot from recorded outputs.
// NO execution. NO learning writes. NO network calls. NO DB writes. NO mutation.
// I2: Uses recorded outputs only — never runtime state.

const crypto              = require('crypto');
const { build_system_snapshot } = require('./system_snapshot');

const SNAPSHOT_VERSION = '1.0.0';
const GRM_VERSION      = 'V3';

// ── Task 4: Checksum recomputation ────────────────────────────────────────────
// Mirrors system_snapshot._snapshotId() using the HISTORICAL timestamp,
// so the reconstructed id can be compared against the original stored id.

function _recomputeSnapshotId(timestamp, systemHealth, driftScore, execHealth) {
    const bucket = timestamp.slice(0, 16);
    const raw    = [bucket, SNAPSHOT_VERSION, GRM_VERSION, systemHealth, String(driftScore), execHealth].join('|');
    return 'snap-' + crypto.createHash('sha256').update(raw).digest('hex').slice(0, 16);
}

// ── Task 3: Deterministic source extractors ───────────────────────────────────
// Conflict rule: same-field conflict → preserve oldest (lowest timestamp wins).
// Sequential events (different timestamps) → most recent value used for state.

function _byTime(events) {
    return [...events].sort((a, b) =>
        new Date(a.created_at ?? 0).getTime() - new Date(b.created_at ?? 0).getTime()
    );
}

function _extractExecState(events) {
    if (!events?.length) return null;
    const sorted = _byTime(events);
    const last   = sorted[sorted.length - 1];
    return {
        active_runs:     last?.active_runs     ?? null,
        queue_depth:     last?.queue_depth     ?? null,
        execution_class: last?.execution_class ?? null,
        health:          last?.health          ?? 'UNKNOWN',
    };
}

function _extractFounder(events) {
    if (!events?.length) return null;
    const oldest = _byTime(events)[0];                  // oldest for conflict resolution
    return { decision: oldest?.decision ?? null, confidence: oldest?.confidence ?? null };
}

function _extractCP(events) {
    if (!events?.length) return null;
    const last = _byTime(events).at(-1);
    return {
        divergence_index: last?.divergence_index ?? last?.divergence ?? null,
        loop_consensus:   last?.loop_consensus   ?? null,
    };
}

function _extractReality(outputs) {
    if (!outputs?.length) return null;
    const last        = _byTime(outputs).at(-1);
    const allAnomalies = outputs.flatMap(o => o.anomaly_flags ?? []);
    return {
        drift_score:          last?.drift_score ?? null,
        outcome_attribution: { attribution_confidence: last?.attribution_confidence ?? null },
        anomaly_flags:        [...new Set(allAnomalies)],
    };
}

function _extractLearning(signals) {
    if (!signals?.length) return null;
    const highCount = signals.filter(s => s.severity === 'HIGH').length;
    return {
        signal_count:  signals.length,
        anomaly_rate:  parseFloat((highCount / signals.length).toFixed(3)),
        anomaly_flags: [],
    };
}

// ── Task 1: Main reconstruction function ──────────────────────────────────────

function reconstruct_snapshot(input) {
    const startMs   = Date.now();
    const replayId  = 'replay-' + crypto.createHash('sha256')
        .update(JSON.stringify(input ?? {})).digest('hex').slice(0, 12);
    const trace          = [];
    const missingSources = [];
    let   confidence     = 1.0;

    const execEvents    = input?.execution_events  ?? null;
    const realityOuts   = input?.reality_outputs   ?? null;
    const learnSigs     = input?.learning_signals  ?? null;
    const govEvents     = input?.governance_events ?? null;
    const metadata      = input?.snapshot_metadata ?? null;

    // ── Extract each source, record missing ───────────────────────────────────

    let execState   = null;
    let founderSnap = null;
    let cpSnap      = null;
    let rlSnap      = null;
    let learnSnap   = null;

    if (!Array.isArray(execEvents) || execEvents.length === 0) {
        missingSources.push('MISSING_SOURCE:execution_events');
        confidence -= 0.15;
    } else {
        const founderEvents = execEvents.filter(e => e.event_type === 'founder');
        const cpEventsList  = execEvents.filter(e => e.event_type === 'control_plane');
        execState   = _extractExecState(execEvents);
        founderSnap = _extractFounder(founderEvents);
        cpSnap      = _extractCP(cpEventsList);
        trace.push('execution_loaded');
    }

    if (!Array.isArray(govEvents) || govEvents.length === 0) {
        missingSources.push('MISSING_SOURCE:governance_events');
        confidence -= 0.10;
    } else {
        trace.push('governance_loaded');
    }

    if (!Array.isArray(realityOuts) || realityOuts.length === 0) {
        missingSources.push('MISSING_SOURCE:reality_outputs');
        confidence -= 0.15;
    } else {
        rlSnap = _extractReality(realityOuts);
        trace.push('reality_loaded');
    }

    if (!Array.isArray(learnSigs) || learnSigs.length === 0) {
        missingSources.push('MISSING_SOURCE:learning_signals');
        confidence -= 0.10;
    } else {
        learnSnap = _extractLearning(learnSigs);
        trace.push('learning_loaded');
    }

    // ── Task 6: all sources absent → EMPTY_REPLAY ────────────────────────────
    if (missingSources.length >= 4) {
        const empty = Object.freeze({
            replay_id:              replayId,
            reconstructed_snapshot: null,
            reconstruction_status:  'EMPTY_REPLAY',
            confidence:             0,
            missing_sources:        Object.freeze([...missingSources]),
            anomaly_flags:          Object.freeze(['ALL_SOURCES_ABSENT']),
            checksum_match:         'UNKNOWN',
            replay_trace:           Object.freeze([...trace, 'empty_replay_returned']),
        });
        console.log(`[StateReplay] id=${replayId} status=EMPTY_REPLAY confidence=0 duration=${Date.now() - startMs}ms`);
        return empty;
    }

    // ── Snapshot rebuild (Task 5) ─────────────────────────────────────────────
    const reconstructed = build_system_snapshot({
        execution_state:        execState,
        founder_snapshot:       founderSnap,
        control_plane_snapshot: cpSnap,
        reality_loop_snapshot:  rlSnap,
        learning_snapshot:      learnSnap,
        integration_snapshot:   null,
        observability_snapshot: null,
    });
    trace.push('snapshot_rebuilt');

    // ── Task 4: Checksum validation ───────────────────────────────────────────
    let checksumMatch = 'UNKNOWN';
    if (metadata?.snapshot_id) {
        const refTimestamp = metadata.generated_at ?? reconstructed.generated_at;
        const expectedId   = _recomputeSnapshotId(
            refTimestamp,
            reconstructed.system_health,
            String(reconstructed.reality.drift_score),
            reconstructed.execution.execution_health,
        );
        checksumMatch = expectedId === metadata.snapshot_id ? 'MATCH' : 'MISMATCH';
    }
    trace.push('checksum_verified');

    // ── Result assembly ───────────────────────────────────────────────────────
    const reconstructionStatus = missingSources.length === 0 ? 'COMPLETE'
        : missingSources.length <= 2                          ? 'PARTIAL'
        : 'DEGRADED';

    const confidenceFinal = parseFloat(Math.max(0.10, confidence).toFixed(3));
    const durationMs      = Date.now() - startMs;

    const result = Object.freeze({
        replay_id:              replayId,
        reconstructed_snapshot: reconstructed,
        reconstruction_status:  reconstructionStatus,
        confidence:             confidenceFinal,
        missing_sources:        Object.freeze([...missingSources]),
        anomaly_flags:          Object.freeze([]),
        checksum_match:         checksumMatch,
        replay_trace:           Object.freeze([...trace]),
    });

    // Task 7: observability log
    console.log(
        `[StateReplay] id=${replayId} status=${reconstructionStatus}` +
        ` confidence=${confidenceFinal} checksum=${checksumMatch}` +
        ` missing=${missingSources.length} duration=${durationMs}ms`
    );

    return result;
}

module.exports = { reconstruct_snapshot };
