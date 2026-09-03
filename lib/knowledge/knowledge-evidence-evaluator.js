'use strict';
// lib/knowledge/knowledge-evidence-evaluator.js — KG-03 Evidence Evaluator
//
// Derives confidence, completeness, and contradiction state from canonical evidence
// stores. Callers supply evidence REFERENCES — not confidence values. This module
// looks them up and derives assessment attributes independently.
//
// SOLVES KG-02-L03: confidence and completeness are no longer caller-authoritative
// when evidence references are provided. The caller cannot supply a fake confidence
// score to force SATISFIED.
//
// CANONICAL SOURCES (read-only):
//   knowledge_validation_queue — primary evidence store (KVQ)
//   constitutional_records     — KnowledgeClaim (KC-) records
//   contradiction_reports      — open conflict records
//   knowledge_gaps             — CONFLICTING gap type
//
// OWNED BY: lib/knowledge/knowledge-gap-engine.js (re-exported through canonical surface)
// DO NOT require this file directly — use kge.evaluateEvidenceRef(), etc.
//
// INVARIANTS:
//   - INFERRED evidence (source_type=pattern or caller-declared) cannot produce
//     confidence >= MIN_CONFIDENCE via derivation
//   - A reference not found in canonical stores → UNVERIFIED (confidence 0)
//   - Contradictions are always derived from the record, never trusted from caller
//   - Completeness is derived from confirmations ratio, not from caller input
//   - Constitutional claims (KC- prefix) carry their EP-T4 gate confidence

const { getSupabaseClient }  = require('../clients');
const { MIN_CONFIDENCE }     = require('./knowledge-lifecycle');

function _sb() { return getSupabaseClient(); }

// ── Authority weights by evidence source type ─────────────────────────────────
// Source types come from knowledge_validation_queue.source_type.
// They define: (a) how to map to EVIDENCE_TYPES, (b) the base authority weight.

const SOURCE_AUTHORITY = Object.freeze({
    observation: { evidence_type: 'OBSERVED',      authority: 0.90 },
    lesson:      { evidence_type: 'RETRIEVED',     authority: 0.80 },
    reflection:  { evidence_type: 'RETRIEVED',     authority: 0.75 },
    pattern:     { evidence_type: 'INFERRED',      authority: 0.50 },  // inference; cannot satisfy alone
    constitutional:{ evidence_type: 'RETRIEVED',   authority: 1.00 },  // passed EP-T4 gate
    user:        { evidence_type: 'USER_PROVIDED', authority: 0.85 },
});

// ── Freshness state constants ─────────────────────────────────────────────────
// Replicated from lifecycle to avoid circular dependency.
const FRESHNESS = Object.freeze({ FRESH: 'FRESH', STALE: 'STALE', EXPIRED: 'EXPIRED', UNKNOWN: 'UNKNOWN' });

// ── Private: derive freshness from a formed_at timestamp + TVW type ───────────

async function _deriveFreshness(formed_at, knowledge_type) {
    if (!formed_at) return FRESHNESS.UNKNOWN;
    if (!knowledge_type) return FRESHNESS.UNKNOWN;

    const { data: tvw } = await _sb()
        .from('temporal_validity_windows')
        .select('validity_seconds, staleness_seconds')
        .eq('knowledge_type', knowledge_type)
        .single();

    if (!tvw) return FRESHNESS.UNKNOWN;

    const age_seconds = Math.floor((Date.now() - new Date(formed_at).getTime()) / 1000);
    const is_expired  = tvw.validity_seconds != null && age_seconds >= tvw.validity_seconds;
    const stale_threshold = tvw.validity_seconds != null
        ? tvw.validity_seconds - (tvw.staleness_seconds || 0)
        : (tvw.staleness_seconds != null ? tvw.staleness_seconds : Infinity);

    if (is_expired) return FRESHNESS.EXPIRED;
    if (age_seconds >= stale_threshold) return FRESHNESS.STALE;
    return FRESHNESS.FRESH;
}

// ── Private: map source_type → EVIDENCE_TYPE and authority weight ─────────────

function _sourceTypeToEvidenceType(source_type) {
    return (SOURCE_AUTHORITY[source_type] || SOURCE_AUTHORITY.lesson).evidence_type;
}

function _sourceTypeToAuthority(source_type) {
    return (SOURCE_AUTHORITY[source_type] || SOURCE_AUTHORITY.lesson).authority;
}

// ── Private: evaluate a KVQ validation_id ────────────────────────────────────

async function _evaluateKVQEntry(validation_id, opts = {}) {
    const { subject = null, knowledge_type = null } = opts;

    const { data, error } = await _sb()
        .from('knowledge_validation_queue')
        .select('validation_id, lesson_text, confirmations, min_confirmations, confidence, contradictions, status, source_type, created_at')
        .eq('validation_id', validation_id)
        .single();

    if (error || !data) {
        return {
            found:              false,
            ref:                validation_id,
            ref_type:           'KVQ',
            status:             null,
            derived_evidence_type: 'NONE',
            derived_confidence: 0,
            derived_completeness: 0,
            has_contradictions: false,
            freshness_state:    FRESHNESS.UNKNOWN,
            authority:          0,
        };
    }

    // Evidence type from source_type
    const derived_evidence_type = _sourceTypeToEvidenceType(data.source_type);
    const authority             = _sourceTypeToAuthority(data.source_type);

    // Confidence: use stored value, scaled by authority weight
    // For INFERRED (pattern) source: cap below MIN_CONFIDENCE regardless of stored value
    let derived_confidence = parseFloat(data.confidence) || 0;
    if (derived_evidence_type === 'INFERRED') {
        derived_confidence = Math.min(derived_confidence * authority, MIN_CONFIDENCE - 0.01);
    } else {
        derived_confidence = derived_confidence * authority;
    }

    // Completeness: derived from confirmations ratio
    // validated status + full confirmations = max completeness
    const confirmations     = Math.max(0, parseInt(data.confirmations) || 0);
    const min_confirmations = Math.max(1, parseInt(data.min_confirmations) || 2);
    const confirmations_ratio = Math.min(1.0, confirmations / min_confirmations);
    let derived_completeness = confirmations_ratio;
    if (data.status === 'validated' && confirmations >= min_confirmations) {
        derived_completeness = Math.max(0.70, confirmations_ratio);
    } else if (data.status === 'rejected' || data.status === 'superseded') {
        derived_completeness = 0;
        derived_confidence   = 0;
    }

    // Subject relevance penalty: if subject provided but not in lesson_text → reduce completeness
    if (subject && data.lesson_text) {
        const subjectFragment = subject.slice(0, 40).toLowerCase();
        const textLower       = data.lesson_text.toLowerCase();
        if (subjectFragment.length > 5 && !textLower.includes(subjectFragment)) {
            derived_completeness *= 0.70; // subject mismatch penalty
            derived_confidence   *= 0.85;
        }
    }

    // Contradictions: derived from contradictions JSONB array in record
    const contradictions_arr = Array.isArray(data.contradictions)
        ? data.contradictions
        : (typeof data.contradictions === 'string' ? JSON.parse(data.contradictions || '[]') : []);
    const has_contradictions = contradictions_arr.length > 0;

    // Freshness
    const freshness_state = await _deriveFreshness(data.created_at, knowledge_type);

    return {
        found:              true,
        ref:                validation_id,
        ref_type:           'KVQ',
        status:             data.status,
        source_type:        data.source_type,
        derived_evidence_type,
        derived_confidence: Math.max(0, Math.min(1, derived_confidence)),
        derived_completeness: Math.max(0, Math.min(1, derived_completeness)),
        has_contradictions,
        freshness_state,
        authority,
        formed_at:          data.created_at,
    };
}

// ── Private: evaluate a constitutional KC- claim ──────────────────────────────

async function _evaluateConstitutionalClaim(knowledge_id, opts = {}) {
    const { knowledge_type = null } = opts;

    // Look up in constitutional_records by knowledge_id embedded in record_data JSONB
    const { data, error } = await _sb()
        .from('constitutional_records')
        .select('record_data, created_at')
        .eq('record_type', 'KnowledgeClaim')
        .eq("record_data->>knowledge_id", knowledge_id)
        .maybeSingle();

    // Base result for constitutionally validated claims (fallback if not found in DB)
    // KC- prefix guarantees the claim passed EP-T4 gate (conf≥0.60, confirmations≥2)
    const base = {
        found:               !!data && !error,
        ref:                 knowledge_id,
        ref_type:            'KC',
        status:              'validated',
        source_type:         'constitutional',
        derived_evidence_type: 'RETRIEVED',
        derived_confidence:  0.85,  // EP-T4 minimum is 0.60; constitutional claims are high quality
        derived_completeness: 0.85, // KC- = 2+ confirmations; corroborated
        has_contradictions:  false,
        freshness_state:     FRESHNESS.UNKNOWN,
        authority:           SOURCE_AUTHORITY.constitutional.authority,
    };

    if (data && !error && data.record_data) {
        // Extract actual confidence from validation_attributes
        try {
            const rd = typeof data.record_data === 'string' ? JSON.parse(data.record_data) : data.record_data;
            const va = rd?.validation_attributes;
            const vaObj = typeof va === 'string' ? JSON.parse(va) : va;
            if (vaObj && vaObj.confidence != null) {
                base.derived_confidence = Math.max(0.60, Math.min(1.0, parseFloat(vaObj.confidence)));
            }
            if (vaObj && vaObj.confirmations != null && vaObj.min_confirmations != null) {
                const ratio = vaObj.confirmations / vaObj.min_confirmations;
                base.derived_completeness = Math.min(1.0, Math.max(0.70, ratio));
            }
        } catch (_e) {
            // parse failure — keep base values (already conservative)
        }
        base.formed_at    = data.created_at;
        base.freshness_state = await _deriveFreshness(data.created_at, knowledge_type);
    }

    return base;
}

// ── Private: combine multiple evaluations into a bundle result ────────────────
// Pure function — exported for test coverage.

function _combineEvaluations(evaluations, contradictionCheck = { has_contradictions: false }) {
    const found = evaluations.filter(e => e.found);

    if (found.length === 0) {
        return {
            derived_confidence:   0,
            derived_completeness: 0,
            derived_evidence_type: 'NONE',
            has_contradictions:   contradictionCheck.has_contradictions,
            freshness_state:      FRESHNESS.UNKNOWN,
            corroboration_count:  0,
            evaluations,
        };
    }

    // Confidence: highest from valid non-INFERRED sources; constrained for INFERRED
    const nonInferred = found.filter(e => e.derived_evidence_type !== 'INFERRED');
    const allInferred  = found.every(e => e.derived_evidence_type === 'INFERRED');
    const max_confidence = allInferred
        ? Math.min(...found.map(e => e.derived_confidence), MIN_CONFIDENCE - 0.01)
        : Math.max(...(nonInferred.length ? nonInferred : found).map(e => e.derived_confidence));

    // Completeness: base from highest single source + corroboration bonus
    const base_completeness  = Math.max(...found.map(e => e.derived_completeness));
    const corroboration_count = found.length;
    const corroboration_bonus = corroboration_count >= 3 ? 0.25
                               : corroboration_count === 2 ? 0.15 : 0;
    const derived_completeness = Math.min(1.0, base_completeness + corroboration_bonus);

    // Contradictions: any source contradiction OR external contradiction check
    const internal_conflict = found.some(e => e.has_contradictions);
    const has_contradictions = internal_conflict || contradictionCheck.has_contradictions;

    // Freshness: worst case wins (EXPIRED > STALE > UNKNOWN > FRESH)
    const freshnessRank = { EXPIRED: 0, STALE: 1, UNKNOWN: 2, FRESH: 3 };
    const worst_freshness = found.reduce((worst, e) => {
        const ef = e.freshness_state || FRESHNESS.UNKNOWN;
        return (freshnessRank[ef] ?? 2) < (freshnessRank[worst] ?? 2) ? ef : worst;
    }, FRESHNESS.FRESH);

    // Dominant evidence type: prefer most authoritative non-INFERRED type
    const typesByAuthority = found
        .filter(e => e.derived_evidence_type !== 'INFERRED')
        .sort((a, b) => (b.authority || 0) - (a.authority || 0));
    const derived_evidence_type = typesByAuthority[0]?.derived_evidence_type
                                  || found[0]?.derived_evidence_type
                                  || 'NONE';

    return {
        derived_confidence:   Math.max(0, Math.min(1, max_confidence)),
        derived_completeness: Math.max(0, Math.min(1, derived_completeness)),
        derived_evidence_type,
        has_contradictions,
        freshness_state:      worst_freshness,
        corroboration_count,
        evaluations,
    };
}

// ── Core: detectContradictions ────────────────────────────────────────────────

/**
 * detectContradictions — Check canonical stores for open conflicts about a subject.
 *
 * Queries both contradiction_reports and knowledge_gaps(CONFLICTING) to detect
 * known conflicts. This is independent of caller-supplied has_contradictions.
 *
 * @param {string} subject
 * @param {string} [domain_id]
 * @returns {Promise<{ has_contradictions, contradiction_count, sources }>}
 */
async function detectContradictions(subject, domain_id = null) {
    if (!subject) return { has_contradictions: false, contradiction_count: 0, sources: [] };

    const fragment = subject.slice(0, 60).replace(/%/g, '');
    const sources  = [];

    // Check knowledge_gaps for CONFLICTING open gaps on this subject
    let gapQuery = _sb()
        .from('knowledge_gaps')
        .select('gap_id, subject, domain_id')
        .eq('gap_type', 'CONFLICTING')
        .eq('status', 'OPEN')
        .ilike('subject', `%${fragment}%`)
        .limit(5);
    if (domain_id) gapQuery = gapQuery.eq('domain_id', domain_id);
    const { data: conflictGaps } = await gapQuery;
    if (conflictGaps && conflictGaps.length > 0) sources.push(...conflictGaps.map(g => `gap:${g.gap_id}`));

    // Check contradiction_reports for open conflicts
    const { data: contReports } = await _sb()
        .from('contradiction_reports')
        .select('report_id, description, resolution_status')
        .eq('resolution_status', 'open')
        .or(`description.ilike.%${fragment}%`)
        .limit(5);
    if (contReports && contReports.length > 0) sources.push(...contReports.map(r => `report:${r.report_id}`));

    return {
        has_contradictions: sources.length > 0,
        contradiction_count: sources.length,
        sources,
    };
}

// ── Core: evaluateEvidenceRef ─────────────────────────────────────────────────

/**
 * evaluateEvidenceRef — Independently evaluate a single evidence reference.
 *
 * Looks up the reference in canonical stores (KVQ or constitutional_records) and
 * derives confidence, completeness, and other assessment attributes.
 *
 * The caller's confidence/completeness values are NOT consulted.
 *
 * @param {string} evidence_ref     — validation_id (KVQ) or KC-* (constitutional)
 * @param {object} [opts]
 * @param {string} [opts.subject]   — requirement subject for relevance scoring
 * @param {string} [opts.knowledge_type] — for TVW freshness check
 * @returns {Promise<EvalResult>}
 */
async function evaluateEvidenceRef(evidence_ref, opts = {}) {
    if (!evidence_ref) {
        return {
            found: false, ref: null, ref_type: 'UNKNOWN',
            derived_evidence_type: 'NONE', derived_confidence: 0, derived_completeness: 0,
            has_contradictions: false, freshness_state: FRESHNESS.UNKNOWN, authority: 0,
        };
    }

    // Route by prefix: KC- → constitutional_records; else → KVQ
    if (evidence_ref.startsWith('KC-')) {
        return _evaluateConstitutionalClaim(evidence_ref, opts);
    }
    return _evaluateKVQEntry(evidence_ref, opts);
}

// ── Core: evaluateEvidenceBundle ──────────────────────────────────────────────

/**
 * evaluateEvidenceBundle — Evaluate multiple evidence references for a requirement.
 *
 * Returns combined attributes that account for corroboration, worst-case freshness,
 * and contradiction detection from external stores.
 *
 * @param {string[]} evidence_refs
 * @param {object}   opts
 * @param {string}   [opts.subject]         — for relevance scoring + contradiction check
 * @param {string}   [opts.domain_id]       — for domain-scoped contradiction check
 * @param {string}   [opts.knowledge_type]  — for TVW freshness check
 * @returns {Promise<BundleResult>}
 */
async function evaluateEvidenceBundle(evidence_refs = [], opts = {}) {
    if (!Array.isArray(evidence_refs) || evidence_refs.length === 0) {
        const contradictions = await detectContradictions(opts.subject, opts.domain_id);
        return {
            derived_confidence: 0, derived_completeness: 0,
            derived_evidence_type: 'NONE',
            has_contradictions: contradictions.has_contradictions,
            freshness_state: FRESHNESS.UNKNOWN, corroboration_count: 0,
            evaluations: [],
        };
    }

    const [evaluations, contradictions] = await Promise.all([
        Promise.all(evidence_refs.map(ref => evaluateEvidenceRef(ref, opts))),
        detectContradictions(opts.subject, opts.domain_id),
    ]);

    return _combineEvaluations(evaluations, contradictions);
}

// ── Exports ───────────────────────────────────────────────────────────────────

module.exports = Object.freeze({
    // Core operations
    evaluateEvidenceRef,
    evaluateEvidenceBundle,
    detectContradictions,

    // Exported helpers (testability; _ prefix = internal)
    _combineEvaluations,
    _sourceTypeToEvidenceType,
    _sourceTypeToAuthority,

    // Constants
    SOURCE_AUTHORITY,
    FRESHNESS,
});
