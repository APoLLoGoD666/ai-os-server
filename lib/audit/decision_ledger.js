'use strict';

// Decision Ledger V1 — Immutable Execution Provenance
// Append-only audit record created AFTER execution completes.
// NO execution authority. NO state mutation. NO reverse traversal.
// Task 8: imports only crypto (built-in) and clients (DB persistence only).

const crypto              = require('crypto');
const { getSupabaseClient } = require('../clients');

function _sb() { return getSupabaseClient(); }

const LEDGER_VERSION       = '1.0.0';
const GRM_VERSION          = 'V3';
const CONSTITUTION_VERSION = '1.0.0';

const _REQUIRED = ['receipt_id', 'execution_id', 'integrity_hash', 'grm_version', 'constitution_version', 'final_action_bundle'];
const _OPTIONAL = ['founder_decision', 'control_plane_snapshot', 'reality_snapshot', 'truth_signal', 'system_snapshot_id', 'replay_reference', 'simulation_reference'];

// ── Task 5: Deterministic integrity hash ──────────────────────────────────────
// Excludes timestamps, generated_at, observability fields.
// Same stable inputs → same hash always.

function _integrityHash(constitutionVersion, grmVersion, executionId, action, snapshotId) {
    const raw = [constitutionVersion ?? '', grmVersion ?? '', executionId ?? '', action ?? '', snapshotId ?? ''].join('|');
    return 'ih-' + crypto.createHash('sha256').update(raw).digest('hex');
}

// ── Task 2: Append-only ledger storage ───────────────────────────────────────
// write() only. update/delete/replace forbidden by design (no such methods exported).

const ledger = Object.freeze({
    async write(receipt) {
        await _sb().from('decision_ledger').insert({
            receipt_id:             receipt.receipt_id,
            execution_id:           receipt.execution_id,
            constitution_version:   receipt.constitution_version,
            grm_version:            receipt.grm_version,
            ledger_version:         receipt.ledger_version,
            integrity_hash:         receipt.integrity_hash,
            founder_decision:       receipt.founder_decision,
            control_plane_snapshot: receipt.control_plane_snapshot,
            final_action_bundle:    receipt.final_action_bundle,
            reality_snapshot:       receipt.reality_snapshot,
            truth_signal:           receipt.truth_signal,
            system_snapshot_id:     receipt.system_snapshot_id,
            replay_reference:       receipt.replay_reference,
            simulation_reference:   receipt.simulation_reference,
            trace:                  receipt.trace,
            timestamp:              receipt.timestamp,
        });
    },
});

// ── Task 1: Receipt construction ──────────────────────────────────────────────

async function record_execution_receipt(input) {
    const anomalyFlags = [];
    const trace        = [];

    const execId      = input?.execution_id            ?? null;
    const founderDec  = input?.founder_decision        ?? null;
    const cpSnap      = input?.control_plane_snapshot  ?? null;
    const actionBundle = input?.final_action_bundle    ?? null;
    const realitySnap = input?.reality_snapshot        ?? null;
    const truthSig    = input?.truth_signal            ?? null;
    const ssId        = input?.system_snapshot_id      ?? null;
    const replayRef   = input?.replay_reference        ?? null;
    const simRef      = input?.simulation_reference    ?? null;

    // Task 6: track unavailable required sources
    if (!execId)       anomalyFlags.push('SUBSYSTEM_UNAVAILABLE:execution_id');
    if (!actionBundle) anomalyFlags.push('SUBSYSTEM_UNAVAILABLE:final_action_bundle');

    const action = actionBundle?.action ?? null;
    const hash   = _integrityHash(CONSTITUTION_VERSION, GRM_VERSION, execId, action, ssId);
    const receiptId = 'rcpt-' + crypto.createHash('sha256')
        .update(hash + (execId ?? '') + (action ?? '')).digest('hex').slice(0, 16);

    trace.push('receipt_initialised');
    if (founderDec)   trace.push('founder_recorded');
    if (cpSnap)       trace.push('control_plane_recorded');
    if (actionBundle) trace.push('grm_bundle_recorded');
    if (realitySnap)  trace.push('reality_recorded');
    if (truthSig)     trace.push('truth_signal_recorded');
    if (ssId)         trace.push('snapshot_referenced');
    if (replayRef)    trace.push('replay_referenced');
    if (simRef)       trace.push('simulation_referenced');
    trace.push('hash_computed');

    // Task 2: attempt append-only write BEFORE freezing so LEDGER_PERSIST_FAILED can be recorded
    const receiptBase = {
        receipt_id:             receiptId,
        timestamp:              new Date().toISOString(),
        ledger_version:         LEDGER_VERSION,
        constitution_version:   CONSTITUTION_VERSION,
        grm_version:            GRM_VERSION,
        execution_id:           execId,
        founder_decision:       founderDec   ? Object.freeze({ ...founderDec })   : null,
        control_plane_snapshot: cpSnap       ? Object.freeze({ ...cpSnap })       : null,
        final_action_bundle:    actionBundle ? Object.freeze({ ...actionBundle }) : null,
        reality_snapshot:       realitySnap  ? Object.freeze({ ...realitySnap })  : null,
        truth_signal:           truthSig     ? Object.freeze({ ...truthSig })     : null,
        system_snapshot_id:     ssId,
        replay_reference:       replayRef ? Object.freeze({ replay_id: replayRef.replay_id, status: replayRef.reconstruction_status }) : null,
        simulation_reference:   simRef    ? Object.freeze({ simulation_id: simRef.simulation_id, confidence: simRef.confidence })      : null,
        integrity_hash:         hash,
    };

    try {
        await ledger.write({ ...receiptBase, anomaly_flags: anomalyFlags, trace });
        trace.push('ledger_persisted');
    } catch (_) {
        anomalyFlags.push('LEDGER_PERSIST_FAILED');
        trace.push('ledger_persist_failed');
    }

    const receipt = Object.freeze({
        ...receiptBase,
        anomaly_flags: Object.freeze([...anomalyFlags]),
        trace:         Object.freeze([...trace]),
    });

    // Task 7: observability log
    const depth = [founderDec, cpSnap, actionBundle, realitySnap, truthSig, ssId, replayRef, simRef].filter(Boolean).length;
    console.log(
        `[DecisionLedger] id=${receiptId} hash=${hash.slice(0, 22)}...` +
        ` provenance_depth=${depth}/8 anomalies=${anomalyFlags.length}`
    );

    return receipt;
}

// ── Task 4: Receipt verification ──────────────────────────────────────────────

function verify_receipt(receipt) {
    if (!receipt) return { status: 'INVALID', reason: 'null_receipt', verified_fields: [], missing_fields: _REQUIRED };

    const missingRequired = _REQUIRED.filter(f => receipt[f] == null);
    if (missingRequired.length > 0) {
        return { status: 'INVALID', reason: 'missing_required_fields', missing_fields: missingRequired, verified_fields: [] };
    }

    // Hash recomputation
    const expected = _integrityHash(
        receipt.constitution_version, receipt.grm_version,
        receipt.execution_id, receipt.final_action_bundle?.action ?? null, receipt.system_snapshot_id ?? null
    );
    if (expected !== receipt.integrity_hash) {
        return { status: 'INVALID', reason: 'hash_mismatch', expected: expected.slice(0, 22) + '...', found: receipt.integrity_hash?.slice(0, 22) + '...', verified_fields: _REQUIRED.filter(f => f !== 'integrity_hash') };
    }

    // Trace consistency
    if (!Array.isArray(receipt.trace) ||
        !receipt.trace.includes('receipt_initialised') ||
        !receipt.trace.includes('hash_computed')) {
        return { status: 'INVALID', reason: 'trace_inconsistent', verified_fields: _REQUIRED };
    }

    const missingOptional = _OPTIONAL.filter(f => receipt[f] == null);
    return {
        status:          missingOptional.length > 0 ? 'PARTIAL' : 'VALID',
        verified_fields: [..._REQUIRED, ..._OPTIONAL.filter(f => receipt[f] != null)],
        missing_fields:  missingOptional,
    };
}

// ── Task 3: Provenance chain ──────────────────────────────────────────────────
// Forward-only. No reverse traversal. No authority. No enrichment.

function build_provenance_chain(receipt) {
    if (!receipt) return Object.freeze({ status: 'PROVENANCE_PARTIAL', chain: Object.freeze([]), depth: 0, missing_nodes: Object.freeze(['all']), receipt_id: null });

    const chain = [
        { node: 'execution',          id:   receipt.execution_id,                       present: !!receipt.execution_id },
        { node: 'grm_resolution',     data: receipt.final_action_bundle?.action,        present: !!receipt.final_action_bundle },
        { node: 'reality_observation',data: receipt.reality_snapshot?.drift_score,      present: !!receipt.reality_snapshot },
        { node: 'truth_injection',    data: receipt.truth_signal?.signal_type,          present: !!receipt.truth_signal },
        { node: 'snapshot',           id:   receipt.system_snapshot_id,                 present: !!receipt.system_snapshot_id },
        { node: 'replay',             id:   receipt.replay_reference?.replay_id,        present: !!receipt.replay_reference },
        { node: 'simulation',         id:   receipt.simulation_reference?.simulation_id, present: !!receipt.simulation_reference },
    ];

    const missing = chain.filter(n => !n.present).map(n => n.node);
    const depth   = chain.filter(n => n.present).length;

    return Object.freeze({
        status:        missing.length === 0 ? 'PROVENANCE_COMPLETE' : 'PROVENANCE_PARTIAL',
        chain:         Object.freeze(chain.map(n => Object.freeze({ ...n }))),
        depth,
        missing_nodes: Object.freeze(missing),
        receipt_id:    receipt.receipt_id,
    });
}

module.exports = { record_execution_receipt, verify_receipt, build_provenance_chain, ledger };
