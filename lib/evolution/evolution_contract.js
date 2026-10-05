'use strict';

// Evolution Contract V1 — Controlled Architectural Evolution
// Evaluates proposed system changes and emits an immutable evolution record.
// NO execution. NO runtime mutation. NO DB writes (evaluation only).
// I3: same proposal → same evolution record always.

const crypto = require('crypto');

const EVOLUTION_VERSION    = '1.0.0';
const GRM_VERSION          = 'V3';
const CONSTITUTION_VERSION = '1.0.0';

const VALID_CATEGORIES = Object.freeze(['CONFIG', 'SCHEMA', 'MODULE', 'PIPELINE', 'CONTRACT']);

// ── Task 7: Deterministic evolution hash (no timestamps) ──────────────────────

function _evolutionHash(proposalId, constitutionVersion, grmVersion, compatibility) {
    const raw = [proposalId ?? '', constitutionVersion ?? '', grmVersion ?? '', compatibility ?? ''].join('|');
    return 'eh-' + crypto.createHash('sha256').update(raw).digest('hex');
}

// ── Task 2: Category resolution — oldest wins for conflicts ───────────────────

function _resolveCategory(targetChanges) {
    if (!targetChanges) return null;
    const raw = Array.isArray(targetChanges.categories)
        ? targetChanges.categories
        : [targetChanges.category ?? null];
    const valid = raw.filter(c => VALID_CATEGORIES.includes(c));
    if (valid.length > 0) return valid[0];            // oldest (first) wins
    if (raw.some(c => c != null)) return 'INVALID_PROPOSAL';
    return null;
}

// ── Task 3: Impact surface analysis (caller data only — no execution, no mutation) ──

function _impactSurface(category, targetChanges) {
    const tc = targetChanges ?? {};

    const exec = category === 'MODULE'   ? 'HIGH'
        : category === 'PIPELINE'        ? 'HIGH'
        : category === 'SCHEMA'          ? 'MEDIUM'
        : category === 'CONFIG'          ? 'LOW'
        : category === 'CONTRACT'        ? 'LOW'
        : 'UNKNOWN';

    const gov  = category === 'CONTRACT' ? 'HIGH'
        : category === 'SCHEMA'          ? 'MEDIUM'
        : category === 'MODULE'          ? 'LOW'
        : category === 'PIPELINE'        ? 'LOW'
        : category === 'CONFIG'          ? 'NONE'
        : 'UNKNOWN';

    const learn = (tc.affects_attribution || tc.affects_learning) ? 'HIGH'
        : category === 'SCHEMA'          ? 'MEDIUM'
        : category === 'CONFIG'          ? 'LOW'
        : 'NONE';

    const obs   = (tc.affects_observability || tc.affects_telemetry) ? 'HIGH'
        : category === 'MODULE'          ? 'LOW'
        : 'NONE';

    return Object.freeze({ execution_impact: exec, governance_impact: gov, learning_impact: learn, observability_impact: obs });
}

// ── Task 4: Compatibility contract ────────────────────────────────────────────

function _compatibility(proposalId, constVersion, grmVersion, currentSnap, simRef) {
    if (constVersion && constVersion !== CONSTITUTION_VERSION) return 'REJECT';
    if (grmVersion   && grmVersion   !== GRM_VERSION)          return 'INCOMPATIBLE';
    if (!proposalId || !currentSnap)                           return 'PARTIAL';
    if (!simRef)                                               return 'PARTIAL';
    return 'COMPATIBLE';
}

// ── Task 5: Lineage — forward only, no reverse traversal ──────────────────────

function _lineageChain(currentSnap, replayRef, simRef, decReceipt, evolutionId) {
    const nodes = [
        { node: 'snapshot',         id: currentSnap?.snapshot_id,            present: !!currentSnap },
        { node: 'replay',           id: replayRef?.replay_id,                 present: !!replayRef },
        { node: 'simulation',       id: simRef?.simulation_id,                present: !!simRef },
        { node: 'decision_receipt', id: decReceipt?.receipt_id,               present: !!decReceipt },
        { node: 'evolution_record', id: evolutionId,                          present: !!evolutionId },
    ];
    const missing = nodes.filter(n => !n.present).map(n => n.node);
    return Object.freeze({
        status:        missing.length === 0 ? 'LINEAGE_COMPLETE' : 'LINEAGE_PARTIAL',
        chain:         Object.freeze(nodes.map(n => Object.freeze({ ...n }))),
        depth:         nodes.filter(n => n.present).length,
        missing_nodes: Object.freeze(missing),
    });
}

// ── Task 1: Main evaluation function ──────────────────────────────────────────

function evaluate_proposal(input) {
    const trace        = [];
    const anomalyFlags = [];
    let   confidence   = 1.0;

    const proposalId    = input?.proposal_id          ?? null;
    const currentSnap   = input?.current_snapshot     ?? null;
    const targetChanges = input?.target_changes       ?? null;
    const constVersion  = input?.constitution_version ?? CONSTITUTION_VERSION;
    const grmVersion    = input?.grm_version          ?? GRM_VERSION;
    const replayRef     = input?.replay_reference     ?? null;
    const simRef        = input?.simulation_reference ?? null;
    const decReceipt    = input?.decision_receipt     ?? null;

    // Task 6: insufficient input → EVOLUTION_INCOMPLETE
    if (!proposalId || !targetChanges) {
        anomalyFlags.push('INSUFFICIENT_INPUT');
        const eid = 'evo-' + crypto.createHash('sha256').update(JSON.stringify(input ?? {})).digest('hex').slice(0, 16);
        const rec = Object.freeze({
            evolution_id:     eid,
            proposal_id:      proposalId,
            proposal_status:  'EVOLUTION_INCOMPLETE',
            category:         null,
            compatibility:    'PARTIAL',
            confidence:       0.10,
            impact_surface:   Object.freeze({ execution_impact: 'UNKNOWN', governance_impact: 'UNKNOWN', learning_impact: 'UNKNOWN', observability_impact: 'UNKNOWN' }),
            anomaly_flags:    Object.freeze([...anomalyFlags]),
            lineage:          Object.freeze({ status: 'LINEAGE_PARTIAL', chain: Object.freeze([]), depth: 0, missing_nodes: Object.freeze(['all']) }),
            trace:            Object.freeze(['proposal_received', 'insufficient_input']),
            evolution_hash:   null,
            evolution_version: EVOLUTION_VERSION,
            constitution_version: constVersion,
            grm_version:      grmVersion,
        });
        console.log(`[EvolutionContract] id=${eid} status=EVOLUTION_INCOMPLETE confidence=0.10`);
        return rec;
    }

    trace.push('proposal_received');

    // Category
    const category = _resolveCategory(targetChanges);
    if (category === 'INVALID_PROPOSAL') { anomalyFlags.push('INVALID_PROPOSAL_CATEGORY'); confidence -= 0.30; }
    trace.push(`category_resolved:${category ?? 'null'}`);

    // Source completeness
    if (!replayRef)   confidence -= 0.10;
    if (!simRef)      confidence -= 0.15;
    if (!decReceipt)  confidence -= 0.10;
    if (!currentSnap) { confidence -= 0.20; anomalyFlags.push('MISSING_CURRENT_SNAPSHOT'); }

    // Compatibility
    const compat = _compatibility(proposalId, constVersion, grmVersion, currentSnap, simRef);
    if (compat === 'REJECT')       { confidence = Math.max(0.10, confidence - 0.50); anomalyFlags.push('CONSTITUTION_MISMATCH'); }
    if (compat === 'INCOMPATIBLE') { confidence = Math.max(0.10, confidence - 0.30); anomalyFlags.push('GRM_VERSION_MISMATCH'); }
    trace.push(`compatibility_assessed:${compat}`);

    // Impact
    const impact = _impactSurface(category, targetChanges);
    trace.push('impact_surface_computed');

    // Status
    const status = compat === 'REJECT'                              ? 'REJECTED'
        : compat === 'INCOMPATIBLE'                                 ? 'INCOMPATIBLE'
        : anomalyFlags.includes('INVALID_PROPOSAL_CATEGORY')        ? 'INVALID'
        : Math.max(0.10, confidence) < 0.40                         ? 'EVOLUTION_INCOMPLETE'
        : 'EVALUATED';

    // Hash + id (deterministic — I3)
    const hash = _evolutionHash(proposalId, constVersion, grmVersion, compat);
    const eid  = 'evo-' + hash.slice(3, 19);
    trace.push('evolution_hash_computed');

    // Lineage
    const lineage = _lineageChain(currentSnap, replayRef, simRef, decReceipt, eid);
    trace.push('lineage_built');

    const record = Object.freeze({
        evolution_id:         eid,
        proposal_id:          proposalId,
        proposal_status:      status,
        category,
        compatibility:        compat,
        confidence:           parseFloat(Math.max(0.10, confidence).toFixed(3)),
        impact_surface:       impact,
        anomaly_flags:        Object.freeze([...anomalyFlags]),
        lineage,
        trace:                Object.freeze([...trace]),
        evolution_hash:       hash,
        evolution_version:    EVOLUTION_VERSION,
        constitution_version: constVersion,
        grm_version:          grmVersion,
    });

    // Task 8: observability log
    console.log(
        `[EvolutionContract] id=${eid} status=${status} compat=${compat}` +
        ` confidence=${record.confidence}` +
        ` impact=exec:${impact.execution_impact}/gov:${impact.governance_impact}` +
        ` lineage=${lineage.depth}/5`
    );

    return record;
}

// ── verify_evolution_record ───────────────────────────────────────────────────

function verify_evolution_record(record) {
    if (!record) return { status: 'INVALID', reason: 'null_record', verified_fields: [], missing_fields: [] };
    const required = ['evolution_id', 'evolution_hash', 'proposal_id', 'compatibility', 'proposal_status'];
    const missing  = required.filter(f => record[f] == null);
    if (missing.length > 0) return { status: 'INVALID', reason: 'missing_required_fields', missing_fields: missing, verified_fields: [] };

    const expected = _evolutionHash(record.proposal_id, record.constitution_version, record.grm_version, record.compatibility);
    if (expected !== record.evolution_hash) {
        return { status: 'INVALID', reason: 'hash_mismatch', expected: expected.slice(0, 22) + '...', found: record.evolution_hash?.slice(0, 22) + '...' };
    }

    const optional = ['category', 'impact_surface', 'lineage'];
    const missingOpt = optional.filter(f => record[f] == null);
    return {
        status:          missingOpt.length > 0 ? 'PARTIAL' : 'VALID',
        verified_fields: [...required, ...optional.filter(f => record[f] != null)],
        missing_fields:  missingOpt,
    };
}

// ── build_evolution_lineage ───────────────────────────────────────────────────

function build_evolution_lineage(record) {
    if (!record) return Object.freeze({ status: 'LINEAGE_PARTIAL', chain: Object.freeze([]), depth: 0, missing_nodes: Object.freeze(['all']), evolution_id: null });
    return record.lineage ?? Object.freeze({ status: 'LINEAGE_PARTIAL', chain: Object.freeze([]), depth: 0, missing_nodes: Object.freeze(['all']), evolution_id: record.evolution_id });
}

module.exports = { evaluate_proposal, verify_evolution_record, build_evolution_lineage };
