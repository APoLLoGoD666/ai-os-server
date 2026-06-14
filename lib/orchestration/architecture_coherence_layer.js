'use strict';

// Architecture Coherence Layer V1 — Global Consistency Validation
// Evaluates consistency across registry, temporal snapshots, certification,
// covenant, and integrity manifest. Structural coherence validation only.
// NO execution control. NO mutation of upstream systems.
// I3: same architecture state → same coherence report always.

const crypto = require('crypto');

const COHERENCE_VERSION = '1.0.0';

// Weights (fixed — Task 3)
const W = Object.freeze({ registry: 0.25, temporal: 0.20, certification: 0.20, covenant: 0.20, integrity: 0.15 });

// ── Deterministic coherence hash ──────────────────────────────────────────────

function _coherenceHash(registry, temporal, cert, covenant, manifest) {
    const raw = [
        registry?.registry_hash    ?? '',
        temporal?.temporal_hash    ?? '',
        cert?.certification_hash   ?? '',
        covenant?.covenant_hash    ?? '',
        manifest?.identity_hash    ?? '',
    ].join('|');
    return 'chash-' + crypto.createHash('sha256').update(raw).digest('hex');
}

// ── Task 2, Check 1: Registry ↔ Manifest ──────────────────────────────────────

function _checkRegistryManifest(registry, manifest) {
    if (!registry && !manifest)
        return { score: 0.50, mismatches: [], details: { status: 'both_absent' } };
    if (!registry || !manifest)
        return { score: 0.25, mismatches: [{ field: 'source_availability', delta: 0.75 }], details: { status: 'one_absent' } };

    const mismatches = [];
    let   points     = 0;

    // Module count alignment
    const regCount  = registry.module_count       ?? 0;
    const mfstCount = manifest.coverage?.present  ?? 0;
    const countDelta = Math.abs(regCount - mfstCount) / Math.max(regCount, mfstCount, 1);
    if (countDelta === 0)        { points += 1.0; }
    else if (countDelta <= 0.15) { points += 0.5; mismatches.push({ field: 'module_count', delta: parseFloat(countDelta.toFixed(3)) }); }
    else                         { mismatches.push({ field: 'module_count', delta: parseFloat(countDelta.toFixed(3)) }); }

    // Structure health alignment
    const healthMatch = registry.structure_health === manifest.structure_health;
    if (healthMatch)                                        { points += 1.0; }
    else if (registry.structure_health !== 'FRAGMENTED' &&
             manifest.structure_health  !== 'FRAGMENTED')   { points += 0.5; mismatches.push({ field: 'structure_health', delta: 0.20, registry: registry.structure_health, manifest: manifest.structure_health }); }
    else                                                    { mismatches.push({ field: 'structure_health', delta: 0.50, registry: registry.structure_health, manifest: manifest.structure_health }); }

    // Graph connectivity vs manifest completeness
    const regConnected  = registry.graph_health       === 'CONNECTED';
    const mfstComplete  = manifest.completeness       === 'COMPLETE';
    if (regConnected && mfstComplete)        { points += 1.0; }
    else if (regConnected || mfstComplete)   { points += 0.5; mismatches.push({ field: 'graph_completeness', delta: 0.25 }); }
    else                                     { mismatches.push({ field: 'graph_completeness', delta: 0.60 }); }

    return {
        score:    parseFloat(Math.max(0, Math.min(1, points / 3)).toFixed(3)),
        mismatches,
        details:  { registry_modules: regCount, manifest_modules: mfstCount, module_count_delta: parseFloat(countDelta.toFixed(3)) },
    };
}

// ── Task 2, Check 2: Snapshot ↔ Registry ──────────────────────────────────────

function _checkSnapshotRegistry(temporal, registry) {
    if (!temporal && !registry)
        return { score: 0.50, mismatches: [], details: { status: 'both_absent' } };
    if (!temporal || !registry)
        return { score: 0.25, mismatches: [{ field: 'source_availability', delta: 0.75 }], details: { status: 'one_absent' } };

    const mismatches = [];
    let   points     = 0;

    // Registry hash must match
    const hashMatch = temporal.registry_hash === registry.registry_hash;
    if (hashMatch)   { points += 1.0; }
    else             { mismatches.push({ field: 'registry_hash', delta: 1.0, snapshot: (temporal.registry_hash ?? '').slice(0, 16), registry: (registry.registry_hash ?? '').slice(0, 16) }); }

    // Snapshot must be complete
    if (temporal.status === 'TEMPORAL_SNAPSHOT_COMPLETE') { points += 1.0; }
    else { points += 0.0; mismatches.push({ field: 'snapshot_status', delta: 0.50, status: temporal.status }); }

    // Compatibility state vs graph health
    const compatOk = temporal.compatibility_state === 'COMPATIBLE' && registry.graph_health === 'CONNECTED';
    const bothDegrad = temporal.compatibility_state !== 'COMPATIBLE' && registry.graph_health !== 'CONNECTED';
    if (compatOk)        { points += 1.0; }
    else if (bothDegrad) { points += 0.7; }
    else                 { points += 0.2; mismatches.push({ field: 'compatibility_alignment', delta: 0.40, snapshot_compat: temporal.compatibility_state, graph_health: registry.graph_health }); }

    return {
        score:   parseFloat(Math.max(0, Math.min(1, points / 3)).toFixed(3)),
        mismatches,
        details: { hash_match: hashMatch, snapshot_status: temporal.status },
    };
}

// ── Task 2, Check 3: Certification ↔ Covenant ─────────────────────────────────

function _checkCertCovenant(cert, covenant) {
    if (!cert && !covenant)
        return { score: 0.50, mismatches: [], details: { status: 'both_absent' } };
    if (!cert || !covenant)
        return { score: 0.25, mismatches: [{ field: 'source_availability', delta: 0.75 }], details: { status: 'one_absent' } };

    const mismatches = [];
    let   points     = 0;

    // Status alignment
    const cStatus = cert.certification_status;
    const vStatus = covenant.covenant_status;
    const statusOk =
        (cStatus === 'CERTIFIED'   && vStatus === 'DEPLOYABLE')     ||
        (cStatus === 'CONDITIONAL' && vStatus === 'CONDITIONAL')    ||
        (cStatus === 'UNCERTIFIED' && vStatus === 'NOT_DEPLOYABLE');
    const statusBreak =
        (cStatus === 'CERTIFIED'   && vStatus === 'NOT_DEPLOYABLE') ||
        (cStatus === 'UNCERTIFIED' && vStatus === 'DEPLOYABLE');

    if (statusOk)        { points += 1.0; }
    else if (statusBreak){ mismatches.push({ field: 'status_alignment', delta: 1.0, cert: cStatus, covenant: vStatus }); }
    else                 { points += 0.4; mismatches.push({ field: 'status_alignment', delta: 0.30, cert: cStatus, covenant: vStatus }); }

    // Compatibility match
    if (cert.compatibility === covenant.compatibility)              { points += 1.0; }
    else if (cert.compatibility !== 'INCOMPATIBLE' &&
             covenant.compatibility !== 'INCOMPATIBLE')             { points += 0.5; mismatches.push({ field: 'compatibility', delta: 0.25, cert: cert.compatibility, covenant: covenant.compatibility }); }
    else                                                            { mismatches.push({ field: 'compatibility', delta: 0.60, cert: cert.compatibility, covenant: covenant.compatibility }); }

    // Confidence band
    const cConf = cert.confidence    ?? 0;
    const vConf = covenant.confidence ?? 0;
    const bothHigh = cConf >= 0.70 && vConf >= 0.70;
    const bothLow  = cConf <  0.40 && vConf <  0.40;
    const diverge  = Math.abs(cConf - vConf) > 0.40;
    if (bothHigh || bothLow)     { points += 1.0; }
    else if (diverge)            { mismatches.push({ field: 'confidence_band', delta: parseFloat(Math.abs(cConf - vConf).toFixed(3)) }); }
    else                         { points += 0.6; }

    return {
        score:   parseFloat(Math.max(0, Math.min(1, points / 3)).toFixed(3)),
        mismatches,
        details: { cert_status: cStatus, covenant_status: vStatus, cert_confidence: cConf, covenant_confidence: vConf },
    };
}

// ── Task 2, Check 4: Ledger ↔ Certification ───────────────────────────────────

function _checkLedgerCert(decReceipt, cert) {
    if (!decReceipt && !cert)
        return { score: 0.50, mismatches: [], details: { status: 'both_absent' } };
    if (!decReceipt || !cert)
        return { score: 0.25, mismatches: [{ field: 'source_availability', delta: 0.75 }], details: { status: 'one_absent' } };

    const mismatches = [];
    let   points     = 0;

    // Provenance surface alignment
    const certProv = cert.certification_surface?.provenance?.status ?? 'UNKNOWN';
    const ledgerOk = !!(decReceipt.receipt_id && decReceipt.integrity_hash &&
                        decReceipt.execution_id && decReceipt.final_action_bundle);
    if (certProv === 'PASS'    && ledgerOk)  { points += 1.0; }
    else if (certProv === 'PARTIAL' && ledgerOk) { points += 0.7; }
    else if (certProv === 'FAIL' && !ledgerOk)   { points += 0.6; }
    else                                          { points += 0.2; mismatches.push({ field: 'provenance_alignment', delta: 0.40, cert_provenance: certProv, ledger_valid: ledgerOk }); }

    // Integrity hash present
    if (decReceipt.integrity_hash && cert.certification_hash) { points += 1.0; }
    else { points += 0.3; mismatches.push({ field: 'hash_completeness', delta: 0.50 }); }

    // Anomaly flag consistency
    const ledgerFailed  = decReceipt.anomaly_flags?.includes('LEDGER_PERSIST_FAILED') ?? false;
    const certHighConf  = (cert.confidence ?? 0) >= 0.70;
    if (!ledgerFailed && certHighConf)   { points += 1.0; }
    else if (ledgerFailed && !certHighConf) { points += 0.6; }
    else { mismatches.push({ field: 'anomaly_consistency', delta: 0.35, ledger_failed: ledgerFailed, cert_high_conf: certHighConf }); }

    return {
        score:   parseFloat(Math.max(0, Math.min(1, points / 3)).toFixed(3)),
        mismatches,
        details: { ledger_valid: ledgerOk, cert_provenance: certProv, ledger_persist_failed: ledgerFailed },
    };
}

// ── Task 2, Check 5: Admission ↔ Evolution ────────────────────────────────────

function _checkAdmissionEvolution(admRecord, evoRecord) {
    if (!admRecord && !evoRecord)
        return { score: 0.50, mismatches: [], details: { status: 'both_absent' } };
    if (!admRecord || !evoRecord)
        return { score: 0.25, mismatches: [{ field: 'source_availability', delta: 0.75 }], details: { status: 'one_absent' } };

    const mismatches = [];
    let   points     = 0;

    // Evolution ID cross-reference
    const evoId = evoRecord.evolution_id  ?? null;
    const admEvoId = admRecord.evolution_id ?? null;
    if (evoId && admEvoId && evoId === admEvoId) { points += 1.0; }
    else if (!evoId && !admEvoId)                { points += 0.5; }
    else if (evoId !== admEvoId)                 { mismatches.push({ field: 'evolution_id', delta: 1.0, evo: evoId, adm: admEvoId }); }
    else                                         { points += 0.3; }

    // Status alignment
    const eStatus = evoRecord.proposal_status  ?? null;
    const aStatus = admRecord.admission_state  ?? null;
    const statusScore =
        (eStatus === 'EVALUATED'             && aStatus === 'ACCEPT')  ? 1.0 :
        (eStatus === 'EVALUATED'             && aStatus === 'REVIEW')  ? 0.7 :
        (eStatus === 'REJECTED'              && aStatus === 'REJECT')  ? 1.0 :
        (eStatus === 'INVALID'               && aStatus === 'INVALID') ? 1.0 :
        (eStatus === 'EVALUATED'             && aStatus === 'REJECT')  ? 0.0 :
        (eStatus === 'EVOLUTION_INCOMPLETE'  && aStatus === 'REVIEW')  ? 0.6 : 0.5;
    points += statusScore;
    if (statusScore < 0.5) mismatches.push({ field: 'status_alignment', delta: parseFloat((1 - statusScore).toFixed(3)), evo_status: eStatus, adm_state: aStatus });

    // Compatibility alignment
    const eCompat = evoRecord.compatibility       ?? 'UNKNOWN';
    const aCompat = admRecord.compatibility       ?? 'UNKNOWN';
    if (eCompat === aCompat)                      { points += 1.0; }
    else if (eCompat !== 'REJECT' && aCompat !== 'INCOMPATIBLE') { points += 0.5; mismatches.push({ field: 'compatibility_alignment', delta: 0.25, evo: eCompat, adm: aCompat }); }
    else                                          { mismatches.push({ field: 'compatibility_alignment', delta: 0.60, evo: eCompat, adm: aCompat }); }

    return {
        score:   parseFloat(Math.max(0, Math.min(1, points / 3)).toFixed(3)),
        mismatches,
        details: { evo_status: eStatus, adm_state: aStatus, evo_id_match: evoId === admEvoId },
    };
}

// ── Task 4: Classification ────────────────────────────────────────────────────

function _classify(scores, allMismatches) {
    const brokenDimensions = [];
    const dimNames = ['registry_consistency', 'temporal_consistency', 'certification_alignment', 'covenant_alignment', 'integrity_alignment'];

    const hasScoreBreak    = scores.some(s => s < 0.65);
    const hasMismatchBreak = allMismatches.some(m => (m.delta ?? 0) > 0.35);

    if (hasScoreBreak || hasMismatchBreak) {
        scores.forEach((s, i) => { if (s < 0.65) brokenDimensions.push(dimNames[i]); });
        allMismatches.forEach(m => { if ((m.delta ?? 0) > 0.35 && m.field) brokenDimensions.push(m.field); });
    }

    const overall = parseFloat((
        scores[0] * W.registry +
        scores[1] * W.temporal +
        scores[2] * W.certification +
        scores[3] * W.covenant +
        scores[4] * W.integrity
    ).toFixed(3));

    const hasBreak      = hasScoreBreak || hasMismatchBreak;
    const classification = hasBreak      ? 'INCOHERENT'
        : overall >= 0.80                ? 'COHERENT'
        : 'DEGRADED_COHERENCE';

    return { overall, classification, brokenDimensions: [...new Set(brokenDimensions)], hasBreak };
}

// ── Task 1 + 6: Main coherence function ───────────────────────────────────────

function compute_coherence(input) {
    const trace        = [];
    const anomalyFlags = [];

    const registry  = input?.registry                  ?? null;
    const temporal  = input?.temporal_snapshot         ?? null;
    const cert      = input?.execution_certification   ?? null;
    const covenant  = input?.deployment_covenant       ?? null;
    const manifest  = input?.integrity_manifest        ?? null;
    const decReceipt = input?.decision_receipt         ?? null;
    const admRecord  = input?.admission_record         ?? null;
    const evoRecord  = input?.evolution_record         ?? null;

    // Task 5: all sources absent → COHERENCE_UNDETERMINED
    if (!registry && !temporal && !cert && !covenant && !manifest && !decReceipt && !admRecord && !evoRecord) {
        anomalyFlags.push('INSUFFICIENT_EVIDENCE');
        const cid = 'coh-' + crypto.createHash('sha256').update('COHERENCE_UNDETERMINED').digest('hex').slice(0, 16);
        const rec = Object.freeze({
            coherence_id:                   cid,
            registry_consistency_score:     null,
            temporal_consistency_score:     null,
            certification_alignment_score:  null,
            covenant_alignment_score:       null,
            integrity_alignment_score:      null,
            overall_coherence_score:        null,
            classification:                 'COHERENCE_UNDETERMINED',
            broken_dimensions:              Object.freeze([]),
            mismatches:                     Object.freeze([]),
            anomaly_flags:                  Object.freeze([...anomalyFlags]),
            trace:                          Object.freeze(['coherence_initiated', 'insufficient_evidence']),
            confidence:                     0.10,
            coherence_version:              COHERENCE_VERSION,
        });
        console.log(`[ArchitectureCoherenceLayer] id=${cid} classification=COHERENCE_UNDETERMINED confidence=0.10`);
        return rec;
    }

    trace.push('coherence_initiated');

    try {
        // Task 2: 5 cross-system consistency checks
        const regCheck  = _checkRegistryManifest(registry, manifest);
        trace.push(`registry_manifest_checked:score=${regCheck.score}`);

        const tmpCheck  = _checkSnapshotRegistry(temporal, registry);
        trace.push(`snapshot_registry_checked:score=${tmpCheck.score}`);

        const crtCheck  = _checkCertCovenant(cert, covenant);
        trace.push(`cert_covenant_checked:score=${crtCheck.score}`);

        const covCheck  = _checkLedgerCert(decReceipt, cert);
        trace.push(`ledger_cert_checked:score=${covCheck.score}`);

        const itgCheck  = _checkAdmissionEvolution(admRecord, evoRecord);
        trace.push(`admission_evolution_checked:score=${itgCheck.score}`);

        // Collect all mismatches with dimension labels
        const allMismatches = [
            ...regCheck.mismatches.map(m => Object.freeze({ dimension: 'registry_manifest',    ...m })),
            ...tmpCheck.mismatches.map(m => Object.freeze({ dimension: 'temporal_registry',    ...m })),
            ...crtCheck.mismatches.map(m => Object.freeze({ dimension: 'cert_covenant',        ...m })),
            ...covCheck.mismatches.map(m => Object.freeze({ dimension: 'ledger_cert',          ...m })),
            ...itgCheck.mismatches.map(m => Object.freeze({ dimension: 'admission_evolution',  ...m })),
        ];

        // Task 3 + 4: Weighted average + classification
        const scores   = [regCheck.score, tmpCheck.score, crtCheck.score, covCheck.score, itgCheck.score];
        const result   = _classify(scores, allMismatches);
        trace.push(`classification_resolved:${result.classification}`);

        if (result.hasBreak) anomalyFlags.push('COHERENCE_BREAK');

        // Deterministic coherence id
        const chash = _coherenceHash(registry, temporal, cert, covenant, manifest);
        const cid   = 'coh-' + chash.slice(6, 22);

        const report = Object.freeze({
            coherence_id:                  cid,
            registry_consistency_score:    regCheck.score,
            temporal_consistency_score:    tmpCheck.score,
            certification_alignment_score: crtCheck.score,
            covenant_alignment_score:      covCheck.score,
            integrity_alignment_score:     itgCheck.score,
            overall_coherence_score:       result.overall,
            classification:                result.classification,
            broken_dimensions:             Object.freeze([...result.brokenDimensions]),
            mismatches:                    Object.freeze(allMismatches),
            details: Object.freeze({
                registry_manifest:    Object.freeze(regCheck.details),
                temporal_registry:    Object.freeze(tmpCheck.details),
                cert_covenant:        Object.freeze(crtCheck.details),
                ledger_cert:          Object.freeze(covCheck.details),
                admission_evolution:  Object.freeze(itgCheck.details),
            }),
            anomaly_flags:    Object.freeze([...anomalyFlags]),
            trace:            Object.freeze([...trace, 'coherence_report_sealed']),
            confidence:       result.overall,
            coherence_version: COHERENCE_VERSION,
        });

        // Task 6: Observability log — no behavioural effect
        console.log(
            `[ArchitectureCoherenceLayer] id=${cid} score=${result.overall}` +
            ` classification=${result.classification}` +
            ` broken=${result.brokenDimensions.length} mismatches=${allMismatches.length}`
        );

        return report;

    } catch (_) {
        // Task 5: catch-all — never halt, never retry
        anomalyFlags.push('COHERENCE_PROJECTION_FAILED');
        const cid = 'coh-' + crypto.createHash('sha256').update('FAILED').digest('hex').slice(0, 16);
        const fallback = Object.freeze({
            coherence_id:                  cid,
            registry_consistency_score:    null,
            temporal_consistency_score:    null,
            certification_alignment_score: null,
            covenant_alignment_score:      null,
            integrity_alignment_score:     null,
            overall_coherence_score:       null,
            classification:                'COHERENCE_UNDETERMINED',
            broken_dimensions:             Object.freeze([]),
            mismatches:                    Object.freeze([]),
            anomaly_flags:                 Object.freeze([...anomalyFlags]),
            trace:                         Object.freeze([...trace, 'coherence_undetermined']),
            confidence:                    0.10,
            coherence_version:             COHERENCE_VERSION,
        });
        console.log(`[ArchitectureCoherenceLayer] id=${cid} classification=COHERENCE_UNDETERMINED reason=projection_failed`);
        return fallback;
    }
}

module.exports = { compute_coherence };
