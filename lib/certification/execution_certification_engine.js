'use strict';

// Execution Certification Engine V1 — Deterministic Runtime Certification
// Determines whether a completed architecture state meets structural execution standards.
// Certification only. NO execution. NO scheduling. NO deployment. NO mutation.
// I3: same architecture state → same certification always.

const crypto = require('crypto');

const CERTIFICATION_VERSION = '1.0.0';
const GRM_VERSION           = 'V3';
const CONSTITUTION_VERSION  = '1.0.0';

// ── Task 4: Hash contract ──────────────────────────────────────────────────────
// Timestamps excluded. Same stable inputs → same hash always (I3).

function _certificationHash(identityHash, admissionState, compatibility, structureHealth) {
    const raw = [identityHash ?? '', admissionState ?? '', compatibility ?? '', structureHealth ?? ''].join('|');
    return 'ch-' + crypto.createHash('sha256').update(raw).digest('hex');
}

// ── Task 5: Certification surface evaluators ───────────────────────────────────
// Each dimension: PASS | PARTIAL | FAIL | UNKNOWN
// UNKNOWN = missing input. Never infer. Caller supplies all data.

function _evalIdentity(manifest) {
    if (!manifest)                                  return { status: 'UNKNOWN', detail: null };
    if (!manifest.identity_hash ||
        !manifest.architecture_hash)                return { status: 'FAIL',    detail: 'missing_hashes' };
    if (manifest.completeness === 'MANIFEST_INCOMPLETE' ||
        manifest.completeness === 'INCOMPLETE')     return { status: 'FAIL',    detail: manifest.completeness };
    if (manifest.completeness === 'PARTIAL')        return { status: 'PARTIAL', detail: manifest.completeness };
    if (manifest.completeness === 'COMPLETE')       return { status: 'PASS',    detail: manifest.identity_hash.slice(0, 22) };
    return { status: 'UNKNOWN', detail: null };
}

function _evalLineage(manifest) {
    if (!manifest?.lineage)                         return { status: 'UNKNOWN', depth: null };
    const { status, depth, missing_nodes } = manifest.lineage;
    if (status === 'LINEAGE_COMPLETE')              return { status: 'PASS',    depth };
    if (depth >= 7)                                 return { status: 'PARTIAL', depth, missing: missing_nodes };
    return { status: 'FAIL', depth, missing: missing_nodes };
}

function _evalCoverage(manifest) {
    if (!manifest?.coverage)                        return { status: 'UNKNOWN', ratio: null };
    const ratio = manifest.coverage.ratio ?? 0;
    if (ratio >= 1.0)                               return { status: 'PASS',    ratio };
    if (ratio >= 0.70)                              return { status: 'PARTIAL', ratio };
    return { status: 'FAIL', ratio };
}

function _evalHealth(manifest, systemSnapshot) {
    const mHealth = manifest?.structure_health ?? null;
    const sHealth = systemSnapshot?.system_health ?? null;
    if (!mHealth && !sHealth)                       return { status: 'UNKNOWN', manifest_health: null, snapshot_health: null };
    if (mHealth === 'UNKNOWN')                      return { status: 'FAIL',    manifest_health: mHealth, snapshot_health: sHealth };
    if (mHealth === 'HEALTHY' &&
        (sHealth === 'HEALTHY' || !sHealth))        return { status: 'PASS',    manifest_health: mHealth, snapshot_health: sHealth };
    if (mHealth === 'DEGRADED' ||
        sHealth === 'DEGRADED')                     return { status: 'PARTIAL', manifest_health: mHealth, snapshot_health: sHealth };
    return { status: 'PARTIAL', manifest_health: mHealth, snapshot_health: sHealth };
}

function _evalProvenance(decReceipt) {
    if (!decReceipt)                                                       return { status: 'UNKNOWN', receipt_id: null };
    if (!decReceipt.receipt_id || !decReceipt.integrity_hash ||
        !decReceipt.execution_id || !decReceipt.final_action_bundle)       return { status: 'FAIL',    receipt_id: null };
    if (decReceipt.anomaly_flags?.includes('LEDGER_PERSIST_FAILED'))       return { status: 'PARTIAL', receipt_id: decReceipt.receipt_id };
    const depth = [
        decReceipt.founder_decision, decReceipt.control_plane_snapshot,
        decReceipt.reality_snapshot,  decReceipt.truth_signal,
    ].filter(Boolean).length;
    if (depth >= 3) return { status: 'PASS',    receipt_id: decReceipt.receipt_id };
    return { status: 'PARTIAL', receipt_id: decReceipt.receipt_id };
}

function _evalReplay(replayResult) {
    if (!replayResult)                                                              return { status: 'UNKNOWN', replay_id: null };
    if (replayResult.reconstruction_status === 'EMPTY_REPLAY' ||
        !replayResult.reconstructed_snapshot)                                       return { status: 'FAIL',    replay_id: replayResult.replay_id ?? null };
    const conf = replayResult.confidence ?? 0;
    if (replayResult.reconstruction_status === 'COMPLETE' && conf >= 0.70)          return { status: 'PASS',    replay_id: replayResult.replay_id, confidence: conf };
    if (replayResult.reconstruction_status === 'PARTIAL'  || conf >= 0.40)          return { status: 'PARTIAL', replay_id: replayResult.replay_id, confidence: conf };
    return { status: 'FAIL', replay_id: replayResult.replay_id ?? null };
}

function _evalSimulation(scenarioResult) {
    if (!scenarioResult)                                                             return { status: 'UNKNOWN', simulation_id: null };
    if (!scenarioResult.projected_snapshot ||
        scenarioResult.anomaly_flags?.includes('SIMULATION_INCOMPLETE'))             return { status: 'FAIL',    simulation_id: scenarioResult.simulation_id ?? null };
    const conf   = scenarioResult.confidence ?? 0;
    const compat = scenarioResult.replay_compatibility;
    if (conf <= 0)                                                                   return { status: 'FAIL',    simulation_id: scenarioResult.simulation_id ?? null };
    if (conf >= 0.70 && compat === 'COMPATIBLE')                                    return { status: 'PASS',    simulation_id: scenarioResult.simulation_id, confidence: conf };
    return { status: 'PARTIAL', simulation_id: scenarioResult.simulation_id ?? null, confidence: conf };
}

// ── Task 3: Certification status collapse ──────────────────────────────────────

function _resolveStatus(manifest, admRecord, surfaceStatuses) {
    const admState = admRecord?.admission_state ?? null;

    // UNCERTIFIED: hard failures — explicit rejection or broken evidence chain
    if (!manifest || manifest.completeness === 'MANIFEST_INCOMPLETE')  return 'UNCERTIFIED';
    if (admState === 'REJECT' || admState === 'INVALID')               return 'UNCERTIFIED';
    if (manifest.compatibility === 'INCOMPATIBLE')                     return 'UNCERTIFIED';
    if (surfaceStatuses.includes('FAIL'))                              return 'UNCERTIFIED';

    // CERTIFIED: integrity COMPLETE + admission ACCEPT + compatibility COMPATIBLE, no FAIL
    if (manifest.completeness === 'COMPLETE' &&
        admState === 'ACCEPT' &&
        manifest.compatibility === 'COMPATIBLE')                       return 'CERTIFIED';

    // CONDITIONAL: partial evidence, recoverable
    return 'CONDITIONAL';
}

// ── Compatibility assessment ────────────────────────────────────────────────────

function _assessCompatibility(manifest, admRecord, evoRecord) {
    if (manifest?.compatibility === 'INCOMPATIBLE')                return 'INCOMPATIBLE';
    if (admRecord?.admission_state === 'REJECT' ||
        admRecord?.admission_state === 'INVALID')                  return 'INCOMPATIBLE';
    if (evoRecord?.compatibility === 'REJECT')                     return 'INCOMPATIBLE';
    if (!manifest)                                                 return 'UNKNOWN';
    return manifest.compatibility ?? 'UNKNOWN';
}

// ── Task 1 + 2: Main certification function ────────────────────────────────────

function certify_execution(input) {
    const trace        = [];
    const anomalyFlags = [];

    const manifest     = input?.integrity_manifest  ?? null;
    const admRecord    = input?.admission_record    ?? null;
    const evoRecord    = input?.evolution_record    ?? null;
    const decReceipt   = input?.decision_receipt    ?? null;
    const scenResult   = input?.scenario_result     ?? null;
    const replayResult = input?.replay_result       ?? null;
    const systemSnap   = input?.system_snapshot     ?? null;

    // Task 6: all sources absent → CERTIFICATION_INCOMPLETE
    if (!manifest && !admRecord && !evoRecord && !decReceipt && !scenResult && !replayResult && !systemSnap) {
        anomalyFlags.push('INSUFFICIENT_EVIDENCE');
        const cid = 'cert-' + crypto.createHash('sha256')
            .update(JSON.stringify(input ?? {})).digest('hex').slice(0, 16);
        const rec = Object.freeze({
            certification_id:       cid,
            certification_hash:     null,
            certification_status:   'CERTIFICATION_INCOMPLETE',
            confidence:             0.10,
            architecture_identity:  null,
            compatibility:          'UNKNOWN',
            admission_state:        null,
            structure_health:       null,
            certification_surface:  null,
            anomaly_flags:          Object.freeze([...anomalyFlags]),
            trace:                  Object.freeze(['certification_initiated', 'insufficient_evidence']),
            generated_at:           new Date().toISOString(),
            certification_version:  CERTIFICATION_VERSION,
        });
        console.log(`[ExecutionCertificationEngine] id=${cid} status=CERTIFICATION_INCOMPLETE confidence=0.10`);
        return rec;
    }

    trace.push('certification_initiated');

    // Task 5: Evaluate all 7 surface dimensions (append-only, forward traversal)
    const surface = Object.freeze({
        identity:   Object.freeze(_evalIdentity(manifest)),
        lineage:    Object.freeze(_evalLineage(manifest)),
        coverage:   Object.freeze(_evalCoverage(manifest)),
        health:     Object.freeze(_evalHealth(manifest, systemSnap)),
        provenance: Object.freeze(_evalProvenance(decReceipt)),
        replay:     Object.freeze(_evalReplay(replayResult)),
        simulation: Object.freeze(_evalSimulation(scenResult)),
    });
    trace.push('certification_surface_evaluated');

    const surfaceStatuses = Object.values(surface).map(d => d.status);
    const passCount    = surfaceStatuses.filter(s => s === 'PASS').length;
    const failCount    = surfaceStatuses.filter(s => s === 'FAIL').length;
    const partialCount = surfaceStatuses.filter(s => s === 'PARTIAL').length;
    const unknownCount = surfaceStatuses.filter(s => s === 'UNKNOWN').length;

    // Compatibility
    const compatibility = _assessCompatibility(manifest, admRecord, evoRecord);
    if (compatibility === 'INCOMPATIBLE') anomalyFlags.push('COMPATIBILITY_FAILURE');
    if (!manifest)                        anomalyFlags.push('MISSING_INTEGRITY_MANIFEST');
    trace.push(`compatibility_assessed:${compatibility}`);

    // Task 3: Certification status
    const admissionState  = admRecord?.admission_state  ?? null;
    const structureHealth = manifest?.structure_health  ?? 'UNKNOWN';
    const certStatus      = _resolveStatus(manifest, admRecord, surfaceStatuses);
    if (certStatus === 'UNCERTIFIED') anomalyFlags.push('CERTIFICATION_FAILED');
    trace.push(`certification_status_resolved:${certStatus}`);

    // Confidence degradation
    let confidence = 1.0;
    confidence -= failCount    * 0.25;
    confidence -= partialCount * 0.10;
    confidence -= unknownCount * 0.05;
    if (!manifest)     confidence -= 0.20;
    if (!admRecord)    confidence -= 0.10;
    if (!decReceipt)   confidence -= 0.10;
    if (!replayResult) confidence -= 0.10;
    if (!scenResult)   confidence -= 0.10;
    if (certStatus === 'UNCERTIFIED') confidence = Math.min(confidence, 0.30);

    // Task 4: Deterministic hash + id
    const identityHash = manifest?.identity_hash ?? '';
    const hash = _certificationHash(identityHash, admissionState ?? '', compatibility, structureHealth);
    const cid  = 'cert-' + crypto.createHash('sha256').update(hash).digest('hex').slice(0, 16);
    trace.push('certification_hash_computed');

    // architecture_identity: stable structural proof derived from manifest
    const archIdentity = manifest ? Object.freeze({
        identity_hash:     manifest.identity_hash,
        architecture_hash: manifest.architecture_hash,
        manifest_id:       manifest.manifest_id,
    }) : null;

    const record = Object.freeze({
        certification_id:      cid,
        certification_hash:    hash,
        certification_status:  certStatus,
        confidence:            parseFloat(Math.max(0.10, confidence).toFixed(3)),
        architecture_identity: archIdentity,
        compatibility,
        admission_state:       admissionState,   // stored for hash verification
        structure_health:      structureHealth,   // stored for hash verification
        certification_surface: surface,
        anomaly_flags:         Object.freeze([...anomalyFlags]),
        trace:                 Object.freeze([...trace, 'certification_sealed']),
        generated_at:          new Date().toISOString(),
        certification_version: CERTIFICATION_VERSION,
    });

    // Task 7: Observability log — no behavioural effect
    console.log(
        `[ExecutionCertificationEngine] id=${cid} status=${certStatus} compat=${compatibility}` +
        ` confidence=${record.confidence} coverage=${passCount}/7 trace_depth=${record.trace.length}`
    );

    return record;
}

// ── verify_certification ────────────────────────────────────────────────────────

function verify_certification(record) {
    if (!record) return { status: 'INVALID', reason: 'null_record', verified_fields: [], missing_fields: [] };
    const required = ['certification_id', 'certification_hash', 'certification_status', 'confidence'];
    const missing  = required.filter(f => record[f] == null);
    if (missing.length > 0) return { status: 'INVALID', reason: 'missing_required_fields', missing_fields: missing, verified_fields: [] };

    // Recompute hash from stored inputs (admission_state + structure_health stored for this purpose)
    const expectedHash = _certificationHash(
        record.architecture_identity?.identity_hash ?? '',
        record.admission_state   ?? '',
        record.compatibility     ?? 'UNKNOWN',
        record.structure_health  ?? 'UNKNOWN',
    );
    if (expectedHash !== record.certification_hash) {
        return {
            status:          'INVALID',
            reason:          'hash_mismatch',
            expected:        expectedHash.slice(0, 22) + '...',
            found:           record.certification_hash?.slice(0, 22) + '...',
            verified_fields: required.filter(f => f !== 'certification_hash'),
        };
    }

    // Verify id derivation: cert-sha256(certification_hash)[0:16]
    const expectedId = 'cert-' + crypto.createHash('sha256').update(record.certification_hash).digest('hex').slice(0, 16);
    if (expectedId !== record.certification_id) {
        return {
            status:          'INVALID',
            reason:          'id_mismatch',
            expected:        expectedId,
            found:           record.certification_id,
            verified_fields: required.filter(f => f !== 'certification_id'),
        };
    }

    const optional   = ['certification_surface', 'architecture_identity', 'anomaly_flags', 'trace'];
    const missingOpt = optional.filter(f => record[f] == null);
    return {
        status:          missingOpt.length > 0 ? 'PARTIAL' : 'VALID',
        verified_fields: [...required, ...optional.filter(f => record[f] != null)],
        missing_fields:  missingOpt,
    };
}

module.exports = { certify_execution, verify_certification };
