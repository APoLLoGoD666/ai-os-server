'use strict';

// System Integrity Manifest V1 — Architectural Closure
// Produces a reproducible immutable proof of the entire system state and structural lineage.
// Proof generation only. NO execution. NO governance. NO decision making. NO mutation.
// I3: same architecture structure → same manifest always.

const crypto = require('crypto');

const MANIFEST_VERSION     = '1.0.0';
const GRM_VERSION          = 'V3';
const CONSTITUTION_VERSION = '1.0.0';

const EXPECTED_MODULES = Object.freeze([
    'constitution', 'grm', 'reality_loop', 'truth_injection',
    'system_snapshot', 'state_replay', 'scenario_simulation',
    'decision_ledger', 'evolution_record', 'admission_record',
]);

// ── Task 3: Hash contract ──────────────────────────────────────────────────────
// Timestamps excluded. Same stable inputs → same hashes always (I3).

function _architectureHash(constVersion, grmVersion, snapVersion, ledgerVersion, evoVersion, admVersion) {
    const raw = [constVersion, grmVersion, snapVersion, ledgerVersion, evoVersion, admVersion].join('|');
    return 'arch-' + crypto.createHash('sha256').update(raw).digest('hex');
}

function _identityHash(architectureHash, compatibility, structureHealth) {
    const raw = [architectureHash, compatibility, structureHealth].join('|');
    return 'id-' + crypto.createHash('sha256').update(raw).digest('hex');
}

// ── Task 4: Structural health ──────────────────────────────────────────────────

function _structuralHealth(presentCount) {
    const missing = EXPECTED_MODULES.length - presentCount;
    if (missing === 0)  return 'HEALTHY';
    if (missing <= 2)   return 'DEGRADED';
    return 'UNKNOWN';
}

// ── Task 6: Completeness classification ───────────────────────────────────────

function _classifyCompleteness(ratio) {
    if (ratio >= 1.0)  return 'COMPLETE';
    if (ratio >= 0.70) return 'PARTIAL';
    return 'INCOMPLETE';
}

// ── Compatibility assessment ───────────────────────────────────────────────────

function _assessCompatibility(input, presentCount) {
    const er = input?.evolution_record;
    const ar = input?.admission_record;
    const ss = input?.system_snapshot;

    // Version mismatches across any artifact → INCOMPATIBLE
    if (er?.constitution_version && er.constitution_version !== CONSTITUTION_VERSION) return 'INCOMPATIBLE';
    if (er?.grm_version          && er.grm_version          !== GRM_VERSION)          return 'INCOMPATIBLE';
    if (ss?.governance?.constitution_version && ss.governance.constitution_version !== CONSTITUTION_VERSION) return 'INCOMPATIBLE';
    if (ss?.governance?.grm_version          && ss.governance.grm_version          !== GRM_VERSION)         return 'INCOMPATIBLE';

    // Admission gate rejection propagates
    if (ar?.admission_state === 'REJECT' || ar?.admission_state === 'INVALID') return 'INCOMPATIBLE';

    if (presentCount < EXPECTED_MODULES.length) return 'PARTIAL';
    return 'COMPATIBLE';
}

// ── Task 5: Lineage model ──────────────────────────────────────────────────────
// Forward-only. 10 nodes. Append-only. No reverse traversal.

function _buildLineage(input, manifestId) {
    const rl  = input?.reality_loop;
    const ti  = input?.truth_injection;
    const ss  = input?.system_snapshot;
    const sr  = input?.state_replay;
    const sim = input?.scenario_simulation;
    const dl  = input?.decision_ledger;
    const er  = input?.evolution_record;
    const ar  = input?.admission_record;

    // Execution: implied present if any downstream artifact exists
    const execPresent = !!(rl || ti || ss || sr || sim || dl || er || ar);

    const nodes = [
        { node: 'execution',           id: execPresent ? 'implied' : null,        present: execPresent },
        { node: 'reality_loop',        id: rl?.snapshot_id  ?? null,              present: !!rl },
        { node: 'truth_injection',     id: ti?.signal_type  ?? null,              present: !!ti },
        { node: 'system_snapshot',     id: ss?.snapshot_id  ?? null,              present: !!ss },
        { node: 'state_replay',        id: sr?.replay_id    ?? null,              present: !!sr },
        { node: 'scenario_simulation', id: sim?.simulation_id ?? null,            present: !!sim },
        { node: 'decision_ledger',     id: dl?.receipt_id   ?? null,              present: !!dl },
        { node: 'evolution_record',    id: er?.evolution_id ?? null,              present: !!er },
        { node: 'admission_record',    id: ar?.admission_id ?? null,              present: !!ar },
        { node: 'integrity_manifest',  id: manifestId,                            present: !!manifestId },
    ];

    const missing = nodes.filter(n => !n.present).map(n => n.node);
    return Object.freeze({
        status:        missing.length === 0 ? 'LINEAGE_COMPLETE' : 'LINEAGE_PARTIAL',
        chain:         Object.freeze(nodes.map(n => Object.freeze({ ...n }))),
        depth:         nodes.filter(n => n.present).length,
        missing_nodes: Object.freeze(missing),
    });
}

// ── Task 1 + 2: Main manifest function ────────────────────────────────────────

function generate_manifest(input) {
    const trace        = [];
    const anomalyFlags = [];

    try {
        trace.push('manifest_initiated');

        const presentModules = EXPECTED_MODULES.filter(m => input?.[m] != null);
        const presentCount   = presentModules.length;
        const missingModules = EXPECTED_MODULES.filter(m => input?.[m] == null);
        const coverageRatio  = parseFloat((presentCount / EXPECTED_MODULES.length).toFixed(3));

        // Extract version fields for architecture_hash (stable version constants, not timestamps)
        const constVersion  = input?.constitution?.version                 ??
                              input?.constitution?.constitution_version      ?? CONSTITUTION_VERSION;
        const grmVersion    = input?.grm?.version                          ?? GRM_VERSION;
        const snapVersion   = input?.system_snapshot?.version              ?? '1.0.0';
        const ledgerVersion = input?.decision_ledger?.ledger_version       ?? '1.0.0';
        const evoVersion    = input?.evolution_record?.evolution_version    ?? '1.0.0';
        const admVersion    = input?.admission_record?.admission_version    ?? '1.0.0';

        trace.push('versions_extracted');

        // Task 4: Structural health
        const structureHealth = _structuralHealth(presentCount);
        if (structureHealth === 'UNKNOWN') anomalyFlags.push('STRUCTURE_CRITICALLY_DEGRADED');
        trace.push(`structure_health_computed:${structureHealth}`);

        // Compatibility
        const compatibility = _assessCompatibility(input, presentCount);
        if (compatibility === 'INCOMPATIBLE') anomalyFlags.push('VERSION_MISMATCH');
        trace.push(`compatibility_assessed:${compatibility}`);

        // Task 3: Deterministic hashes (I3)
        const archHash = _architectureHash(constVersion, grmVersion, snapVersion, ledgerVersion, evoVersion, admVersion);
        const idHash   = _identityHash(archHash, compatibility, structureHealth);
        trace.push('hashes_computed');

        // manifest_id derived from identity hash — stable, no timestamp (I3)
        const manifestId = 'mfst-' + idHash.slice(3, 19);

        // Task 5: Lineage (forward only)
        const lineage = _buildLineage(input, manifestId);
        trace.push('lineage_built');

        // Task 6: Completeness
        const completeness = _classifyCompleteness(coverageRatio);
        if (missingModules.length > 0) anomalyFlags.push(`MISSING_MODULES:${missingModules.join(',')}`);
        trace.push(`completeness_classified:${completeness}`);

        const manifest = Object.freeze({
            manifest_id:       manifestId,
            manifest_version:  MANIFEST_VERSION,
            architecture_hash: archHash,
            identity_hash:     idHash,
            structure_health:  structureHealth,
            completeness,
            compatibility,
            lineage,
            coverage: Object.freeze({
                present:  presentCount,
                expected: EXPECTED_MODULES.length,
                ratio:    coverageRatio,
                missing:  Object.freeze([...missingModules]),
            }),
            anomaly_flags: Object.freeze([...anomalyFlags]),
            generated_at:  new Date().toISOString(),
            trace:         Object.freeze([...trace, 'manifest_sealed']),
        });

        // Task 8: Observability log — no behavioural effect
        console.log(
            `[SystemIntegrityManifest] id=${manifestId} coverage=${coverageRatio}` +
            ` health=${structureHealth} compat=${compatibility}` +
            ` identity=${idHash.slice(0, 26)}... lineage=${lineage.depth}/10`
        );

        return manifest;

    } catch (_) {
        // Task 7: projection failure — never halt, never retry
        anomalyFlags.push('MANIFEST_PROJECTION_FAILED');
        const fallbackId = 'mfst-' + crypto.createHash('sha256')
            .update(JSON.stringify(input ?? {})).digest('hex').slice(0, 16);
        const fallback = Object.freeze({
            manifest_id:       fallbackId,
            manifest_version:  MANIFEST_VERSION,
            architecture_hash: null,
            identity_hash:     null,
            structure_health:  'UNKNOWN',
            completeness:      'MANIFEST_INCOMPLETE',
            compatibility:     'UNKNOWN',
            lineage:           Object.freeze({ status: 'LINEAGE_PARTIAL', chain: Object.freeze([]), depth: 0, missing_nodes: Object.freeze([...EXPECTED_MODULES, 'integrity_manifest']) }),
            coverage:          Object.freeze({ present: 0, expected: EXPECTED_MODULES.length, ratio: 0, missing: Object.freeze([...EXPECTED_MODULES]) }),
            anomaly_flags:     Object.freeze([...anomalyFlags]),
            generated_at:      new Date().toISOString(),
            trace:             Object.freeze([...trace, 'manifest_incomplete']),
        });
        console.log(`[SystemIntegrityManifest] id=${fallbackId} state=MANIFEST_INCOMPLETE`);
        return fallback;
    }
}

// ── verify_manifest ────────────────────────────────────────────────────────────

function verify_manifest(manifest) {
    if (!manifest) return { status: 'INVALID', reason: 'null_manifest', verified_fields: [], missing_fields: [] };
    const required = ['manifest_id', 'architecture_hash', 'identity_hash', 'structure_health', 'completeness'];
    const missing  = required.filter(f => manifest[f] == null);
    if (missing.length > 0) return { status: 'INVALID', reason: 'missing_required_fields', missing_fields: missing, verified_fields: [] };

    const expected = _identityHash(manifest.architecture_hash, manifest.compatibility ?? 'UNKNOWN', manifest.structure_health);
    if (expected !== manifest.identity_hash) {
        return {
            status:          'INVALID',
            reason:          'identity_hash_mismatch',
            expected:        expected.slice(0, 26) + '...',
            found:           manifest.identity_hash?.slice(0, 26) + '...',
            verified_fields: required.filter(f => f !== 'identity_hash'),
        };
    }

    const optional   = ['lineage', 'coverage', 'anomaly_flags', 'trace'];
    const missingOpt = optional.filter(f => manifest[f] == null);
    return {
        status:          missingOpt.length > 0 ? 'PARTIAL' : 'VALID',
        verified_fields: [...required, ...optional.filter(f => manifest[f] != null)],
        missing_fields:  missingOpt,
    };
}

// ── build_manifest_lineage ────────────────────────────────────────────────────

function build_manifest_lineage(manifest) {
    if (!manifest) return Object.freeze({ status: 'LINEAGE_PARTIAL', chain: Object.freeze([]), depth: 0, missing_nodes: Object.freeze(['all']), manifest_id: null });
    return manifest.lineage ?? Object.freeze({ status: 'LINEAGE_PARTIAL', chain: Object.freeze([]), depth: 0, missing_nodes: Object.freeze(['all']), manifest_id: manifest.manifest_id });
}

module.exports = { generate_manifest, verify_manifest, build_manifest_lineage };
