'use strict';

// Change Admission Gate V1 — Structural Acceptance Contract
// Deterministic admission layer. Classifies whether a proposed evolution artifact
// may enter the architecture lifecycle.
// NO execution. NO deployment. NO runtime mutation. NO DB writes.
// I3: same proposal → same admission decision always.

const crypto = require('crypto');

const ADMISSION_VERSION    = '1.0.0';
const GRM_VERSION          = 'V3';
const CONSTITUTION_VERSION = '1.0.0';

// ── Task 7: Deterministic admission hash ──────────────────────────────────────
// Excludes timestamps. Same stable inputs → same hash always.

function _admissionHash(evolutionHash, compatibility, admissionState) {
    const raw = [evolutionHash ?? '', compatibility ?? '', admissionState ?? ''].join('|');
    return 'ah-' + crypto.createHash('sha256').update(raw).digest('hex');
}

// ── Task 3: Dimension evaluators ──────────────────────────────────────────────
// Each returns: PASS | PARTIAL | FAIL | UNKNOWN
// UNKNOWN = missing input — never infer. Caller supplies all data.

function _evalIdentityStability(evoRecord) {
    if (!evoRecord)                                             return 'UNKNOWN';
    if (!evoRecord.evolution_hash || !evoRecord.evolution_id)   return 'FAIL';
    const expectedId = 'evo-' + evoRecord.evolution_hash.slice(3, 19);
    if (evoRecord.evolution_id !== expectedId)                  return 'FAIL';
    if (evoRecord.proposal_status === 'INVALID'       ||
        evoRecord.proposal_status === 'REJECTED'      ||
        evoRecord.proposal_status === 'INCOMPATIBLE')           return 'FAIL';
    if (evoRecord.proposal_status === 'EVOLUTION_INCOMPLETE')   return 'PARTIAL';
    return 'PASS';
}

function _evalReconstructionCoverage(replayRef) {
    if (!replayRef)                                                 return 'UNKNOWN';
    if (replayRef.reconstruction_status === 'EMPTY_REPLAY')         return 'FAIL';
    if (!replayRef.reconstructed_snapshot)                          return 'FAIL';
    const status = replayRef.reconstruction_status;
    const conf   = replayRef.confidence ?? 0;
    if (status === 'COMPLETE' && conf >= 0.70)                      return 'PASS';
    if (status === 'PARTIAL'  || conf >= 0.40)                      return 'PARTIAL';
    return 'FAIL';
}

function _evalProvenanceCompleteness(decReceipt) {
    if (!decReceipt)                                                   return 'UNKNOWN';
    if (!decReceipt.receipt_id    || !decReceipt.integrity_hash  ||
        !decReceipt.execution_id  || !decReceipt.final_action_bundle)  return 'FAIL';
    if (decReceipt.anomaly_flags?.includes('LEDGER_PERSIST_FAILED'))   return 'PARTIAL';
    const depth = [
        decReceipt.founder_decision,       decReceipt.control_plane_snapshot,
        decReceipt.reality_snapshot,        decReceipt.truth_signal,
        decReceipt.replay_reference,        decReceipt.simulation_reference,
    ].filter(Boolean).length;
    if (depth >= 4) return 'PASS';
    return 'PARTIAL';
}

function _evalSimulationCoverage(simRef) {
    if (!simRef)                                                         return 'UNKNOWN';
    if (!simRef.projected_snapshot ||
        simRef.anomaly_flags?.includes('SIMULATION_INCOMPLETE'))         return 'FAIL';
    if ((simRef.confidence ?? 0) <= 0)                                   return 'FAIL';
    if (simRef.replay_compatibility === 'INCOMPATIBLE')                  return 'FAIL';
    const conf   = simRef.confidence ?? 0;
    const compat = simRef.replay_compatibility;
    if (conf >= 0.70 && compat === 'COMPATIBLE')                         return 'PASS';
    return 'PARTIAL';
}

function _evalSnapshotCompatibility(currentSnap, evoRecord) {
    if (!currentSnap)                                                    return 'UNKNOWN';
    if (!currentSnap.snapshot_id)                                        return 'FAIL';
    if (evoRecord?.constitution_version &&
        evoRecord.constitution_version !== CONSTITUTION_VERSION)          return 'FAIL';
    if (evoRecord?.grm_version &&
        evoRecord.grm_version !== GRM_VERSION)                           return 'FAIL';
    if (currentSnap.system_health === 'DEGRADED')                        return 'PARTIAL';
    if (currentSnap.system_health === 'HEALTHY')                         return 'PASS';
    return 'PARTIAL'; // UNKNOWN system_health → PARTIAL not FAIL
}

// ── Task 4: Structural threshold collapse ──────────────────────────────────────

function _collapseState(dims, evoRecord) {
    // Schema invalid: evolution record present but missing hash (structural incompleteness)
    if (evoRecord != null && evoRecord.evolution_hash == null) return 'INVALID';
    if (evoRecord?.proposal_status === 'INVALID')              return 'INVALID';

    // Constitution mismatch → REJECT (pre-empts dimension cascade)
    if (evoRecord?.compatibility === 'REJECT')                 return 'REJECT';

    const vals = Object.values(dims);

    // Any FAIL → REJECT
    if (vals.includes('FAIL'))                                 return 'REJECT';

    // All UNKNOWN with no valid evidence → INVALID
    if (vals.every(v => v === 'UNKNOWN'))                      return 'INVALID';

    // Any PARTIAL or UNKNOWN → REVIEW
    if (vals.includes('PARTIAL') || vals.includes('UNKNOWN'))  return 'REVIEW';

    // All PASS → ACCEPT
    if (vals.every(v => v === 'PASS'))                         return 'ACCEPT';

    return 'REVIEW';
}

// ── Task 5: Admission chain ────────────────────────────────────────────────────
// Forward only. 6 nodes. Missing nodes → ADMISSION_PARTIAL.

function _buildChain(currentSnap, replayRef, simRef, decReceipt, evoRecord, admissionId) {
    const nodes = [
        { node: 'snapshot',         id: currentSnap?.snapshot_id,           present: !!currentSnap },
        { node: 'replay',           id: replayRef?.replay_id,                present: !!replayRef },
        { node: 'simulation',       id: simRef?.simulation_id,               present: !!simRef },
        { node: 'decision_receipt', id: decReceipt?.receipt_id,              present: !!decReceipt },
        { node: 'evolution_record', id: evoRecord?.evolution_id,             present: !!evoRecord },
        { node: 'admission_record', id: admissionId,                         present: !!admissionId },
    ];
    const missing = nodes.filter(n => !n.present).map(n => n.node);
    return Object.freeze({
        status:        missing.length === 0 ? 'ADMISSION_COMPLETE' : 'ADMISSION_PARTIAL',
        chain:         Object.freeze(nodes.map(n => Object.freeze({ ...n }))),
        depth:         nodes.filter(n => n.present).length,
        missing_nodes: Object.freeze(missing),
    });
}

// ── Task 1: Main evaluation function ──────────────────────────────────────────

function evaluate_admission(input) {
    const trace        = [];
    const anomalyFlags = [];
    let   confidence   = 1.0;

    const evoRecord   = input?.evolution_record     ?? null;
    const simRef      = input?.simulation_reference ?? null;
    const replayRef   = input?.replay_reference     ?? null;
    const decReceipt  = input?.decision_receipt     ?? null;
    const currentSnap = input?.current_snapshot     ?? null;

    // Task 6: all sources absent → ADMISSION_INCOMPLETE
    if (!evoRecord && !simRef && !replayRef && !decReceipt && !currentSnap) {
        anomalyFlags.push('INSUFFICIENT_EVIDENCE');
        const aid = 'adm-' + crypto.createHash('sha256')
            .update(JSON.stringify(input ?? {})).digest('hex').slice(0, 16);
        const rec = Object.freeze({
            admission_id:      aid,
            admission_state:   'ADMISSION_INCOMPLETE',
            confidence:        0.10,
            dimensions:        Object.freeze({
                identity_stability:      'UNKNOWN',
                reconstruction_coverage: 'UNKNOWN',
                provenance_completeness: 'UNKNOWN',
                simulation_coverage:     'UNKNOWN',
                snapshot_compatibility:  'UNKNOWN',
            }),
            admission_hash:    null,
            evolution_hash:    null,
            compatibility:     null,
            chain:             Object.freeze({ status: 'ADMISSION_PARTIAL', chain: Object.freeze([]), depth: 0, missing_nodes: Object.freeze(['all']) }),
            anomaly_flags:     Object.freeze([...anomalyFlags]),
            trace:             Object.freeze(['admission_initiated', 'insufficient_evidence']),
            admission_version: ADMISSION_VERSION,
            evolution_id:      null,
        });
        console.log(`[ChangeAdmissionGate] id=${aid} state=ADMISSION_INCOMPLETE confidence=0.10`);
        return rec;
    }

    trace.push('admission_initiated');

    // Task 3: Evaluate all 5 dimensions
    const dims = Object.freeze({
        identity_stability:      _evalIdentityStability(evoRecord),
        reconstruction_coverage: _evalReconstructionCoverage(replayRef),
        provenance_completeness: _evalProvenanceCompleteness(decReceipt),
        simulation_coverage:     _evalSimulationCoverage(simRef),
        snapshot_compatibility:  _evalSnapshotCompatibility(currentSnap, evoRecord),
    });
    trace.push('dimensions_evaluated');

    // Confidence degradation from dimension results and missing sources
    const dimVals = Object.values(dims);
    confidence -= dimVals.filter(v => v === 'FAIL').length    * 0.25;
    confidence -= dimVals.filter(v => v === 'PARTIAL').length * 0.10;
    confidence -= dimVals.filter(v => v === 'UNKNOWN').length * 0.05;
    if (!evoRecord)   { confidence -= 0.20; anomalyFlags.push('MISSING_EVOLUTION_RECORD'); }
    if (!simRef)      confidence -= 0.10;
    if (!replayRef)   confidence -= 0.10;
    if (!decReceipt)  confidence -= 0.10;
    if (!currentSnap) confidence -= 0.10;

    // Task 4: Collapse to admission state
    const admissionState = _collapseState(dims, evoRecord);
    trace.push(`admission_state_resolved:${admissionState}`);

    // Task 7: Deterministic hash + id
    const compatibility  = evoRecord?.compatibility ?? 'UNKNOWN';
    const evolutionHash  = evoRecord?.evolution_hash ?? '';
    const hash = _admissionHash(evolutionHash, compatibility, admissionState);
    const aid  = 'adm-' + hash.slice(3, 19);
    trace.push('admission_hash_computed');

    // Task 5: Chain (forward only)
    const chain = _buildChain(currentSnap, replayRef, simRef, decReceipt, evoRecord, aid);
    trace.push('admission_chain_built');

    const record = Object.freeze({
        admission_id:      aid,
        admission_state:   admissionState,
        confidence:        parseFloat(Math.max(0.10, confidence).toFixed(3)),
        dimensions:        dims,
        admission_hash:    hash,
        evolution_hash:    evolutionHash || null,
        compatibility,
        chain,
        anomaly_flags:     Object.freeze([...anomalyFlags]),
        trace:             Object.freeze([...trace]),
        admission_version: ADMISSION_VERSION,
        evolution_id:      evoRecord?.evolution_id ?? null,
    });

    // Task 8: Observability log — no behavioural effect
    const passCoverage = dimVals.filter(v => v === 'PASS').length;
    console.log(
        `[ChangeAdmissionGate] id=${aid} state=${admissionState} confidence=${record.confidence}` +
        ` coverage=${passCoverage}/5 chain=${chain.depth}/6`
    );

    return record;
}

// ── verify_admission_record ────────────────────────────────────────────────────

function verify_admission_record(record) {
    if (!record) return { status: 'INVALID', reason: 'null_record', verified_fields: [], missing_fields: [] };
    const required = ['admission_id', 'admission_hash', 'admission_state', 'dimensions', 'confidence'];
    const missing  = required.filter(f => record[f] == null);
    if (missing.length > 0) return { status: 'INVALID', reason: 'missing_required_fields', missing_fields: missing, verified_fields: [] };

    const expected = _admissionHash(record.evolution_hash ?? '', record.compatibility ?? 'UNKNOWN', record.admission_state);
    if (expected !== record.admission_hash) {
        return {
            status:          'INVALID',
            reason:          'hash_mismatch',
            expected:        expected.slice(0, 22) + '...',
            found:           record.admission_hash?.slice(0, 22) + '...',
            verified_fields: required.filter(f => f !== 'admission_hash'),
        };
    }

    const optional    = ['chain', 'evolution_id', 'anomaly_flags', 'trace'];
    const missingOpt  = optional.filter(f => record[f] == null);
    return {
        status:          missingOpt.length > 0 ? 'PARTIAL' : 'VALID',
        verified_fields: [...required, ...optional.filter(f => record[f] != null)],
        missing_fields:  missingOpt,
    };
}

// ── build_admission_chain ──────────────────────────────────────────────────────

function build_admission_chain(record) {
    if (!record) return Object.freeze({ status: 'ADMISSION_PARTIAL', chain: Object.freeze([]), depth: 0, missing_nodes: Object.freeze(['all']), admission_id: null });
    return record.chain ?? Object.freeze({ status: 'ADMISSION_PARTIAL', chain: Object.freeze([]), depth: 0, missing_nodes: Object.freeze(['all']), admission_id: record.admission_id });
}

module.exports = { evaluate_admission, verify_admission_record, build_admission_chain };
