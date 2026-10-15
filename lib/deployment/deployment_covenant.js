'use strict';

// Deployment Covenant V1 — Deterministic Deployment Eligibility
// Determines whether a certified architecture may be considered deployable.
// Eligibility only. NO deployment. NO execution. NO rollout. NO mutation.
// I3: same architecture state → same covenant always.

const crypto = require('crypto');

const COVENANT_VERSION     = '1.0.0';
const GRM_VERSION          = 'V3';
const CONSTITUTION_VERSION = '1.0.0';

// ── Task 4: Hash contract ──────────────────────────────────────────────────────
// Timestamps excluded. Same stable inputs → same hash always (I3).

function _covenantHash(certificationHash, identityHash, compatibility, covenantStatus) {
    const raw = [certificationHash ?? '', identityHash ?? '', compatibility ?? '', covenantStatus ?? ''].join('|');
    return 'cvh-' + crypto.createHash('sha256').update(raw).digest('hex');
}

// ── Task 5: Trust surface evaluators ──────────────────────────────────────────
// Each dimension: PASS | PARTIAL | FAIL | UNKNOWN
// UNKNOWN = missing input. Never infer.

function _evalIdentity(manifest, evoRecord) {
    if (!manifest && !evoRecord)                         return { status: 'UNKNOWN', detail: null };
    if (!manifest?.identity_hash)                        return { status: 'PARTIAL', detail: 'no_manifest_identity' };
    if (evoRecord?.compatibility === 'REJECT')           return { status: 'FAIL',    detail: 'constitution_mismatch' };
    if (manifest.completeness === 'INCOMPLETE' ||
        manifest.completeness === 'MANIFEST_INCOMPLETE') return { status: 'FAIL',    detail: manifest.completeness };
    if (manifest.completeness === 'PARTIAL')             return { status: 'PARTIAL', detail: manifest.completeness };
    if (manifest.completeness === 'COMPLETE')            return { status: 'PASS',    detail: manifest.identity_hash.slice(0, 22) };
    return { status: 'UNKNOWN', detail: null };
}

function _evalLineage(manifest) {
    if (!manifest?.lineage)                              return { status: 'UNKNOWN', depth: null };
    const { status, depth, missing_nodes } = manifest.lineage;
    if (status === 'LINEAGE_COMPLETE')                   return { status: 'PASS',    depth };
    if (depth >= 7)                                      return { status: 'PARTIAL', depth, missing: missing_nodes };
    return { status: 'FAIL', depth, missing: missing_nodes };
}

function _evalCoverage(manifest) {
    if (!manifest?.coverage)                             return { status: 'UNKNOWN', ratio: null };
    const ratio = manifest.coverage.ratio ?? 0;
    if (ratio >= 1.0)                                    return { status: 'PASS',    ratio };
    if (ratio >= 0.70)                                   return { status: 'PARTIAL', ratio };
    return { status: 'FAIL', ratio };
}

function _evalProvenance(decReceipt) {
    if (!decReceipt)                                     return { status: 'UNKNOWN', receipt_id: null };
    if (!decReceipt.receipt_id || !decReceipt.integrity_hash ||
        !decReceipt.execution_id || !decReceipt.final_action_bundle)
                                                         return { status: 'FAIL',    receipt_id: null };
    if (decReceipt.anomaly_flags?.includes('LEDGER_PERSIST_FAILED'))
                                                         return { status: 'PARTIAL', receipt_id: decReceipt.receipt_id };
    const depth = [
        decReceipt.founder_decision, decReceipt.control_plane_snapshot,
        decReceipt.reality_snapshot,  decReceipt.truth_signal,
    ].filter(Boolean).length;
    if (depth >= 3)                                      return { status: 'PASS',    receipt_id: decReceipt.receipt_id };
    return { status: 'PARTIAL', receipt_id: decReceipt.receipt_id };
}

function _evalHealth(manifest) {
    if (!manifest)                                       return { status: 'UNKNOWN', structure_health: null };
    const h = manifest.structure_health;
    if (h === 'HEALTHY')                                 return { status: 'PASS',    structure_health: h };
    if (h === 'DEGRADED')                                return { status: 'PARTIAL', structure_health: h };
    return { status: 'FAIL', structure_health: h ?? 'UNKNOWN' };
}

function _evalCompatibility(cert, admRecord, evoRecord) {
    if (cert?.compatibility === 'INCOMPATIBLE' ||
        admRecord?.admission_state === 'REJECT' ||
        admRecord?.admission_state === 'INVALID' ||
        evoRecord?.compatibility   === 'REJECT')         return { status: 'FAIL',    compatibility: 'INCOMPATIBLE' };
    if (!cert && !admRecord && !evoRecord)               return { status: 'UNKNOWN', compatibility: 'UNKNOWN' };
    const compat = cert?.compatibility ?? 'UNKNOWN';
    if (compat === 'COMPATIBLE')                         return { status: 'PASS',    compatibility: compat };
    if (compat === 'PARTIAL' || compat === 'UNKNOWN')    return { status: 'PARTIAL', compatibility: compat };
    return { status: 'UNKNOWN', compatibility: compat };
}

function _evalCertification(cert) {
    if (!cert)                                                       return { status: 'UNKNOWN', certification_status: null };
    if (cert.certification_status === 'UNCERTIFIED' ||
        cert.certification_status === 'CERTIFICATION_INCOMPLETE')    return { status: 'FAIL',    certification_status: cert.certification_status };
    if (cert.certification_status === 'CONDITIONAL')                 return { status: 'PARTIAL', certification_status: cert.certification_status };
    if (cert.certification_status === 'CERTIFIED')                   return { status: 'PASS',    certification_status: cert.certification_status };
    return { status: 'UNKNOWN', certification_status: cert.certification_status ?? null };
}

// ── Task 3: Covenant status collapse ──────────────────────────────────────────

function _resolveStatus(cert, manifest, admRecord, surfaceStatuses) {
    const admState = admRecord?.admission_state ?? null;

    // NOT_DEPLOYABLE: hard failures — explicit rejection or broken evidence
    if (cert?.certification_status === 'UNCERTIFIED' ||
        cert?.certification_status === 'CERTIFICATION_INCOMPLETE') return 'NOT_DEPLOYABLE';
    if (admState === 'REJECT' || admState === 'INVALID')           return 'NOT_DEPLOYABLE';
    if (cert?.compatibility  === 'INCOMPATIBLE' ||
        manifest?.compatibility === 'INCOMPATIBLE')                return 'NOT_DEPLOYABLE';
    if (surfaceStatuses.includes('FAIL'))                          return 'NOT_DEPLOYABLE';

    // DEPLOYABLE: CERTIFIED + COMPATIBLE + HEALTHY — all three required
    const deployable =
        cert?.certification_status === 'CERTIFIED' &&
        (cert?.compatibility === 'COMPATIBLE' || manifest?.compatibility === 'COMPATIBLE') &&
        manifest?.structure_health === 'HEALTHY';

    if (deployable) return 'DEPLOYABLE';
    return 'CONDITIONAL';
}

// ── Top-level compatibility assessment ────────────────────────────────────────

function _assessCompatibility(cert, admRecord, evoRecord, manifest) {
    if (cert?.compatibility     === 'INCOMPATIBLE') return 'INCOMPATIBLE';
    if (manifest?.compatibility === 'INCOMPATIBLE') return 'INCOMPATIBLE';
    if (admRecord?.admission_state === 'REJECT' ||
        admRecord?.admission_state === 'INVALID')   return 'INCOMPATIBLE';
    if (evoRecord?.compatibility  === 'REJECT')     return 'INCOMPATIBLE';
    if (!cert && !manifest)                         return 'UNKNOWN';
    if (cert?.compatibility === 'COMPATIBLE' &&
        manifest?.compatibility === 'COMPATIBLE')   return 'COMPATIBLE';
    const c = cert?.compatibility ?? manifest?.compatibility ?? 'UNKNOWN';
    return c === 'COMPATIBLE' ? 'COMPATIBLE' : c;
}

// ── Task 1 + 2: Main covenant function ────────────────────────────────────────

function assess_covenant(input) {
    const trace        = [];
    const anomalyFlags = [];

    const cert       = input?.execution_certification ?? null;
    const manifest   = input?.integrity_manifest      ?? null;
    const admRecord  = input?.admission_record        ?? null;
    const evoRecord  = input?.evolution_record        ?? null;
    const decReceipt = input?.decision_receipt        ?? null;

    // Task 6: all sources absent → COVENANT_INCOMPLETE
    if (!cert && !manifest && !admRecord && !evoRecord && !decReceipt) {
        anomalyFlags.push('INSUFFICIENT_EVIDENCE');
        const covId = 'cov-' + crypto.createHash('sha256')
            .update(JSON.stringify(input ?? {})).digest('hex').slice(0, 16);
        const rec = Object.freeze({
            covenant_id:            covId,
            covenant_hash:          null,
            covenant_status:        'COVENANT_INCOMPLETE',
            confidence:             0.10,
            deployability:          'NOT_ASSESSABLE',
            architecture_identity:  null,
            compatibility:          'UNKNOWN',
            trust_surface:          null,
            anomaly_flags:          Object.freeze([...anomalyFlags]),
            trace:                  Object.freeze(['covenant_initiated', 'insufficient_evidence']),
            generated_at:           new Date().toISOString(),
            covenant_version:       COVENANT_VERSION,
            certification_hash_ref: null,
            identity_hash_ref:      null,
        });
        console.log(`[DeploymentCovenant] id=${covId} status=COVENANT_INCOMPLETE confidence=0.10`);
        return rec;
    }

    trace.push('covenant_initiated');

    // Task 5: Evaluate 7 trust surface dimensions (append-only, no reverse traversal)
    const surface = Object.freeze({
        identity:      Object.freeze(_evalIdentity(manifest, evoRecord)),
        lineage:       Object.freeze(_evalLineage(manifest)),
        coverage:      Object.freeze(_evalCoverage(manifest)),
        provenance:    Object.freeze(_evalProvenance(decReceipt)),
        health:        Object.freeze(_evalHealth(manifest)),
        compatibility: Object.freeze(_evalCompatibility(cert, admRecord, evoRecord)),
        certification: Object.freeze(_evalCertification(cert)),
    });
    trace.push('trust_surface_evaluated');

    const surfaceStatuses = Object.values(surface).map(d => d.status);
    const passCount    = surfaceStatuses.filter(s => s === 'PASS').length;
    const failCount    = surfaceStatuses.filter(s => s === 'FAIL').length;
    const partialCount = surfaceStatuses.filter(s => s === 'PARTIAL').length;
    const unknownCount = surfaceStatuses.filter(s => s === 'UNKNOWN').length;

    // Top-level compatibility
    const compatibility = _assessCompatibility(cert, admRecord, evoRecord, manifest);
    if (compatibility === 'INCOMPATIBLE') anomalyFlags.push('COMPATIBILITY_FAILURE');
    if (!cert)                            anomalyFlags.push('MISSING_CERTIFICATION');
    if (!manifest)                        anomalyFlags.push('MISSING_INTEGRITY_MANIFEST');
    trace.push(`compatibility_assessed:${compatibility}`);

    // Task 3: Status
    const covenantStatus = _resolveStatus(cert, manifest, admRecord, surfaceStatuses);
    if (covenantStatus === 'NOT_DEPLOYABLE') anomalyFlags.push('NOT_DEPLOYABLE');
    trace.push(`covenant_status_resolved:${covenantStatus}`);

    // Confidence degradation
    let confidence = 1.0;
    confidence -= failCount    * 0.25;
    confidence -= partialCount * 0.10;
    confidence -= unknownCount * 0.05;
    if (!cert)       confidence -= 0.20;
    if (!manifest)   confidence -= 0.15;
    if (!admRecord)  confidence -= 0.10;
    if (!decReceipt) confidence -= 0.10;
    if (covenantStatus === 'NOT_DEPLOYABLE') confidence = Math.min(confidence, 0.30);

    // Task 4: Deterministic hash + id
    const certHashRef = cert?.certification_hash ?? '';
    const identHashRef = manifest?.identity_hash ?? cert?.architecture_identity?.identity_hash ?? '';
    const hash  = _covenantHash(certHashRef, identHashRef, compatibility, covenantStatus);
    const covId = 'cov-' + crypto.createHash('sha256').update(hash).digest('hex').slice(0, 16);
    trace.push('covenant_hash_computed');

    // architecture_identity: continuity proof across certification + manifest
    const archIdentity = (cert || manifest) ? Object.freeze({
        identity_hash:     manifest?.identity_hash     ?? cert?.architecture_identity?.identity_hash     ?? null,
        architecture_hash: manifest?.architecture_hash ?? cert?.architecture_identity?.architecture_hash ?? null,
        manifest_id:       manifest?.manifest_id       ?? cert?.architecture_identity?.manifest_id       ?? null,
        certification_id:  cert?.certification_id      ?? null,
    }) : null;

    // deployability: human-readable eligibility verdict
    const deployability =
        covenantStatus === 'DEPLOYABLE'     ? 'ELIGIBLE'
        : covenantStatus === 'CONDITIONAL'  ? 'CONDITIONAL_ELIGIBLE'
        : covenantStatus === 'NOT_DEPLOYABLE' ? 'INELIGIBLE'
        : 'NOT_ASSESSABLE';

    const record = Object.freeze({
        covenant_id:            covId,
        covenant_hash:          hash,
        covenant_status:        covenantStatus,
        confidence:             parseFloat(Math.max(0.10, confidence).toFixed(3)),
        deployability,
        architecture_identity:  archIdentity,
        compatibility,
        trust_surface:          surface,
        anomaly_flags:          Object.freeze([...anomalyFlags]),
        trace:                  Object.freeze([...trace, 'covenant_sealed']),
        generated_at:           new Date().toISOString(),
        covenant_version:       COVENANT_VERSION,
        certification_hash_ref: certHashRef  || null,
        identity_hash_ref:      identHashRef || null,
    });

    // Task 7: Observability log — no behavioural effect
    console.log(
        `[DeploymentCovenant] id=${covId} status=${covenantStatus} compat=${compatibility}` +
        ` confidence=${record.confidence} deployability=${deployability} coverage=${passCount}/7`
    );

    return record;
}

// ── verify_covenant ────────────────────────────────────────────────────────────

function verify_covenant(record) {
    if (!record) return { status: 'INVALID', reason: 'null_record', verified_fields: [], missing_fields: [] };
    const required = ['covenant_id', 'covenant_hash', 'covenant_status', 'confidence', 'deployability'];
    const missing  = required.filter(f => record[f] == null);
    if (missing.length > 0) return { status: 'INVALID', reason: 'missing_required_fields', missing_fields: missing, verified_fields: [] };

    const expectedHash = _covenantHash(
        record.certification_hash_ref ?? '',
        record.identity_hash_ref      ?? '',
        record.compatibility          ?? 'UNKNOWN',
        record.covenant_status,
    );
    if (expectedHash !== record.covenant_hash) {
        return {
            status:          'INVALID',
            reason:          'hash_mismatch',
            expected:        expectedHash.slice(0, 22) + '...',
            found:           record.covenant_hash?.slice(0, 22) + '...',
            verified_fields: required.filter(f => f !== 'covenant_hash'),
        };
    }

    const expectedId = 'cov-' + crypto.createHash('sha256').update(record.covenant_hash).digest('hex').slice(0, 16);
    if (expectedId !== record.covenant_id) {
        return {
            status:          'INVALID',
            reason:          'id_mismatch',
            expected:        expectedId,
            found:           record.covenant_id,
            verified_fields: required.filter(f => f !== 'covenant_id'),
        };
    }

    const optional   = ['trust_surface', 'architecture_identity', 'anomaly_flags', 'trace'];
    const missingOpt = optional.filter(f => record[f] == null);
    return {
        status:          missingOpt.length > 0 ? 'PARTIAL' : 'VALID',
        verified_fields: [...required, ...optional.filter(f => record[f] != null)],
        missing_fields:  missingOpt,
    };
}

module.exports = { assess_covenant, verify_covenant };
