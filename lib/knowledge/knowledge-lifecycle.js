'use strict';
// lib/knowledge/knowledge-lifecycle.js — KG-02 Canonical Lifecycle
//
// Implements the evidence-grounded lifecycle for knowledge requirements:
//
//   REQUIRE → ASSESS → DETECT_GAP → CLASSIFY → RESOLVE → REASSESS → CERTIFY_SUFFICIENCY
//
// ARCHITECTURE NOTE:
//   This module is OWNED BY knowledge-gap-engine.js. All public functions are
//   re-exported through that engine — callers must not require this file directly.
//   Canonical authority remains lib/knowledge/knowledge-gap-engine.js.
//
// CRITICAL INVARIANTS:
//   1. RESOLUTION ATTEMPT ≠ KNOWLEDGE SATISFIED.
//      attemptResolution() creates evidence for reassessment.
//      The gap is not closed until reassessAfterResolution() passes.
//   2. INFERRED evidence alone → UNCERTAIN (never SATISFIED).
//      LLM-generated text is not automatically evidence.
//   3. EXPIRED evidence → STALE_EVIDENCE (cannot satisfy).
//   4. Every lifecycle transition is auditable via knowledge_evidence_assessments.
//   5. Knowledge ≠ Memory: this module does NOT touch lib/memory/gateway.js.
//   6. Canonical Supabase client: lib/clients.js only.

const crypto                = require('crypto');
const { getSupabaseClient } = require('../clients');

function _sb() { return getSupabaseClient(); }

// ── ID generators ─────────────────────────────────────────────────────────────

function _assessmentId() {
    return `KEA-${crypto.randomBytes(6).toString('hex').toUpperCase()}`;
}

function _attemptId() {
    return `GRA-${crypto.randomBytes(6).toString('hex').toUpperCase()}`;
}

// ── Evidence types / determinations (exported for test/consumer reference) ───

const EVIDENCE_TYPES = Object.freeze({
    OBSERVED:     'OBSERVED',
    RETRIEVED:    'RETRIEVED',
    USER_PROVIDED:'USER_PROVIDED',
    INFERRED:     'INFERRED',
    NONE:         'NONE',
});

const DETERMINATIONS = Object.freeze({
    SATISFIED:      'SATISFIED',
    GAP:            'GAP',
    UNCERTAIN:      'UNCERTAIN',
    INSUFFICIENT:   'INSUFFICIENT',
    CONFLICTING:    'CONFLICTING',
    STALE_EVIDENCE: 'STALE_EVIDENCE',
});

const ASSESSMENT_PHASES = Object.freeze({
    INITIAL:       'INITIAL',
    RESOLUTION:    'RESOLUTION',
    REASSESSMENT:  'REASSESSMENT',
});

const RESOLUTION_OUTCOMES = Object.freeze({
    PENDING:      'PENDING',
    SUCCESS:      'SUCCESS',
    INSUFFICIENT: 'INSUFFICIENT',
    CONFLICTING:  'CONFLICTING',
    STALE:        'STALE',
    FAILED:       'FAILED',
});

// Confidence thresholds
const MIN_CONFIDENCE  = 0.60;  // below this → INSUFFICIENT
const MIN_COMPLETENESS = 0.50; // below this → INSUFFICIENT (partial evidence)

// ── Core: _determineFromEvidence (pure, testable) ────────────────────────────

/**
 * _determineFromEvidence — Pure function mapping evidence fields → determination.
 * Called by assessRequirement internally and exported for test coverage.
 *
 * Rules (in order of precedence):
 *   1. No evidence (type=NONE) → GAP
 *   2. Has contradictions → CONFLICTING
 *   3. Evidence is EXPIRED → STALE_EVIDENCE
 *   4. Evidence is INFERRED only → UNCERTAIN (never SATISFIED — LLM text ≠ knowledge)
 *   5. completeness < MIN_COMPLETENESS → INSUFFICIENT
 *   6. confidence < MIN_CONFIDENCE → INSUFFICIENT
 *   7. freshness_state=STALE (warning, not blocking) → allowed if confidence high
 *   8. Else → SATISFIED
 */
function _determineFromEvidence({
    evidence_type,
    freshness_state,
    confidence,
    completeness,
    has_contradictions,
}) {
    // 1. No evidence
    if (!evidence_type || evidence_type === EVIDENCE_TYPES.NONE) {
        return { determination: DETERMINATIONS.GAP, reason: 'No evidence available for requirement' };
    }

    // 2. Contradictions (highest priority after no-evidence)
    if (has_contradictions) {
        return { determination: DETERMINATIONS.CONFLICTING, reason: 'Evidence contradicts existing knowledge; truth cannot be determined' };
    }

    // 3. Expired evidence
    if (freshness_state === 'EXPIRED') {
        return { determination: DETERMINATIONS.STALE_EVIDENCE, reason: 'Evidence is past its validity window and cannot satisfy a current requirement' };
    }

    // 4. Inferred-only evidence (LLM output is not knowledge)
    if (evidence_type === EVIDENCE_TYPES.INFERRED) {
        if (confidence != null && confidence >= MIN_CONFIDENCE) {
            return { determination: DETERMINATIONS.UNCERTAIN, reason: 'Inferred knowledge meets confidence threshold but cannot be automatically verified; human or system confirmation required' };
        }
        return { determination: DETERMINATIONS.INSUFFICIENT, reason: `Inferred evidence with confidence ${confidence ?? 'unknown'} below threshold ${MIN_CONFIDENCE}; LLM output is not automatically satisfying knowledge` };
    }

    // 5. Completeness check (partial evidence)
    if (completeness != null && completeness < MIN_COMPLETENESS) {
        return { determination: DETERMINATIONS.INSUFFICIENT, reason: `Evidence completeness ${completeness.toFixed(2)} is below required threshold ${MIN_COMPLETENESS}; requirement partially addressed only` };
    }

    // 6. Confidence check
    if (confidence != null && confidence < MIN_CONFIDENCE) {
        return { determination: DETERMINATIONS.INSUFFICIENT, reason: `Evidence confidence ${confidence.toFixed(3)} is below required threshold ${MIN_CONFIDENCE}` };
    }

    // 7. Stale-but-not-expired (STALE warning, not blocking if confidence is high enough)
    if (freshness_state === 'STALE') {
        // Stale evidence with sufficiently high confidence is still reportable
        // but we flag it via determination reason; determination is SATISFIED with staleness noted
        return { determination: DETERMINATIONS.SATISFIED, reason: `Evidence satisfies requirement (staleness warning: freshness_state=STALE — evidence should be refreshed soon)` };
    }

    // 8. Satisfied
    return { determination: DETERMINATIONS.SATISFIED, reason: 'Evidence satisfies requirement: confidence, completeness, freshness, and provenance checks passed' };
}

// ── Core: assessRequirement ───────────────────────────────────────────────────

/**
 * assessRequirement — Assess whether available evidence satisfies a requirement.
 *
 * The result is written to knowledge_evidence_assessments. This is the canonical
 * "ASSESS" step in the lifecycle. Every assessment is auditable.
 *
 * @param {string} requirement_id
 * @param {object} evidence
 * @param {string} evidence.evidence_type      — EVIDENCE_TYPES value
 * @param {string} [evidence.evidence_source]
 * @param {string} [evidence.evidence_ref]
 * @param {string} [evidence.evidence_content]
 * @param {string} [evidence.knowledge_type]   — for TVW freshness check
 * @param {string} [evidence.formed_at]        — ISO timestamp of evidence formation
 * @param {number} [evidence.confidence]       — 0.000 to 1.000
 * @param {number} [evidence.completeness]     — 0.000 to 1.000
 * @param {boolean}[evidence.has_contradictions]
 * @param {string} [evidence.gap_id]
 * @param {string} [evidence.phase]            — ASSESSMENT_PHASES (default INITIAL)
 * @param {string} [evidence.assessed_by]
 * @param {object} [evidence.metadata]
 * @returns {Promise<{ assessment_id, determination, determination_reason, freshness_state }>}
 */
async function assessRequirement(requirement_id, evidence = {}) {
    if (!requirement_id) throw new Error('assessRequirement: requirement_id required');

    const {
        evidence_type    = EVIDENCE_TYPES.NONE,
        evidence_source  = null,
        evidence_ref     = null,
        evidence_refs    = null,   // KG-03: array of canonical evidence references
        evidence_content = null,
        knowledge_type   = null,
        formed_at        = null,
        confidence       = null,
        completeness     = null,
        has_contradictions = false,
        gap_id           = null,
        phase            = ASSESSMENT_PHASES.INITIAL,
        assessed_by      = 'system',
        metadata         = {},
    } = evidence;

    // Validate phase
    if (!ASSESSMENT_PHASES[phase]) {
        throw new Error(`assessRequirement: invalid phase '${phase}'. Valid: ${Object.values(ASSESSMENT_PHASES).join(', ')}`);
    }

    // KG-03: Evidence-grounded path — derive assessment attributes from canonical stores.
    // When refs are provided, caller-supplied confidence/completeness are ignored entirely.
    const refs = evidence_refs || (evidence_ref ? [evidence_ref] : []);
    let evaluatedAttrs = null;
    let assessment_method = 'CALLER_ASSERTED';

    if (refs.length > 0) {
        const evaluator = require('./knowledge-evidence-evaluator');
        const { data: reqRow } = await _sb()
            .from('knowledge_requirements')
            .select('required_subject')
            .eq('requirement_id', requirement_id)
            .single();
        evaluatedAttrs = await evaluator.evaluateEvidenceBundle(refs, {
            subject:        reqRow?.required_subject || null,
            knowledge_type,
        });
        assessment_method = 'EVIDENCE_GROUNDED';
    }

    // Apply evidence-grounded overrides; caller values ignored when refs present
    const final_evidence_type      = evaluatedAttrs ? evaluatedAttrs.derived_evidence_type : evidence_type;
    const final_confidence         = evaluatedAttrs ? evaluatedAttrs.derived_confidence    : confidence;
    const final_completeness       = evaluatedAttrs ? evaluatedAttrs.derived_completeness  : completeness;
    const final_has_contradictions = evaluatedAttrs ? evaluatedAttrs.has_contradictions    : has_contradictions;

    // Freshness: use evaluator result if available; else run TVW lookup from caller params
    let freshness_state = evaluatedAttrs ? evaluatedAttrs.freshness_state : null;
    if (!freshness_state && knowledge_type && formed_at) {
        const { data: tvw } = await _sb()
            .from('temporal_validity_windows')
            .select('validity_seconds, staleness_seconds')
            .eq('knowledge_type', knowledge_type)
            .single();

        if (tvw) {
            const age_seconds = Math.floor((Date.now() - new Date(formed_at).getTime()) / 1000);
            const is_expired = tvw.validity_seconds != null && age_seconds >= tvw.validity_seconds;
            const stale_threshold = tvw.validity_seconds != null
                ? tvw.validity_seconds - (tvw.staleness_seconds || 0)
                : (tvw.staleness_seconds != null ? tvw.staleness_seconds : Infinity);
            if (is_expired) freshness_state = 'EXPIRED';
            else if (age_seconds >= stale_threshold) freshness_state = 'STALE';
            else freshness_state = 'FRESH';
        } else {
            freshness_state = 'UNKNOWN';
        }
    } else if (!freshness_state && formed_at) {
        freshness_state = 'UNKNOWN';
    }

    // Determine from final (possibly evidence-grounded) attributes
    const { determination, reason } = _determineFromEvidence({
        evidence_type:      final_evidence_type,
        freshness_state,
        confidence:         final_confidence,
        completeness:       final_completeness,
        has_contradictions: final_has_contradictions,
    });

    const assessment_id = _assessmentId();

    const { error } = await _sb().from('knowledge_evidence_assessments').insert({
        assessment_id,
        requirement_id,
        gap_id:              gap_id || null,
        phase,
        evidence_type:       final_evidence_type,
        evidence_source:     evidence_source || null,
        evidence_ref:        evidence_ref    || null,
        evidence_content:    evidence_content || null,
        knowledge_type:      knowledge_type   || null,
        formed_at:           formed_at        || null,
        freshness_state:     freshness_state  || null,
        confidence:          final_confidence   != null ? final_confidence   : null,
        completeness:        final_completeness != null ? final_completeness : null,
        has_contradictions:  final_has_contradictions,
        determination,
        determination_reason: reason,
        assessed_by,
        metadata: { ...metadata, assessment_method },
    });

    if (error) throw new Error(`assessRequirement failed: ${error.message}`);

    return { assessment_id, determination, determination_reason: reason, freshness_state };
}

// ── Core: attemptResolution ───────────────────────────────────────────────────

/**
 * attemptResolution — Supply candidate evidence for a gap and run reassessment.
 *
 * CRITICAL INVARIANT: This creates a gap_resolution_attempt and runs an independent
 * reassessment assessment. The gap is NOT closed until reassessment determines SATISFIED.
 *
 * @param {string} gap_id
 * @param {object} params
 * @param {string} params.strategy          — from RESOLUTION_STRATEGIES
 * @param {string} params.evidence_type     — EVIDENCE_TYPES value
 * @param {string} [params.requirement_id]  — linked requirement
 * @param {string} [params.evidence_source]
 * @param {string} [params.evidence_ref]
 * @param {string} [params.evidence_summary]
 * @param {string} [params.knowledge_type]  — for TVW freshness check
 * @param {string} [params.formed_at]       — ISO timestamp
 * @param {number} [params.confidence]
 * @param {number} [params.completeness]
 * @param {boolean}[params.has_contradictions]
 * @param {string} [params.attempted_by]
 * @param {object} [params.metadata]
 * @returns {Promise<{ attempt_id, assessment_id, determination, outcome, gap_resolved: boolean }>}
 */
async function attemptResolution(gap_id, params = {}) {
    if (!gap_id) throw new Error('attemptResolution: gap_id required');

    const {
        strategy, evidence_type, requirement_id = null,
        evidence_source = null, evidence_ref = null, evidence_summary = null,
        knowledge_type = null, formed_at = null,
        confidence = null, completeness = null, has_contradictions = false,
        attempted_by = 'system', metadata = {},
    } = params;

    if (!strategy) throw new Error('attemptResolution: strategy required');
    if (!evidence_type) throw new Error('attemptResolution: evidence_type required');

    // Step 1: Mark gap IN_RESOLUTION
    await _sb().from('knowledge_gaps').update({ status: 'IN_RESOLUTION' }).eq('gap_id', gap_id);

    // Step 2: Create resolution attempt record (PENDING until reassessment)
    const attempt_id = _attemptId();
    const { error: attErr } = await _sb().from('gap_resolution_attempts').insert({
        attempt_id,
        gap_id,
        requirement_id,
        strategy,
        evidence_type,
        evidence_source:  evidence_source  || null,
        evidence_ref:     evidence_ref     || null,
        evidence_summary: evidence_summary || null,
        outcome:          'PENDING',
        attempted_by,
        metadata,
    });
    if (attErr) throw new Error(`attemptResolution (insert attempt) failed: ${attErr.message}`);

    // Step 3: Run independent reassessment of this evidence
    const req_id = requirement_id || `_inline_${gap_id}`; // synthetic if no requirement linked
    let assessment_result;

    if (requirement_id) {
        assessment_result = await assessRequirement(requirement_id, {
            evidence_type,
            evidence_source,
            evidence_ref,
            evidence_content: evidence_summary,
            knowledge_type,
            formed_at,
            confidence,
            completeness,
            has_contradictions,
            gap_id,
            phase: ASSESSMENT_PHASES.REASSESSMENT,
            assessed_by: attempted_by,
            metadata: { ...metadata, attempt_id },
        });
    } else {
        // No requirement_id — create inline assessment using a synthetic subject
        // We still write to the assessments table; requirement_id is NOT NULL so we need one.
        // In this case, we compute the outcome without writing to assessments.
        const { determination, reason } = _determineFromEvidence({
            evidence_type,
            freshness_state: null,
            confidence,
            completeness,
            has_contradictions,
        });
        assessment_result = { assessment_id: null, determination, determination_reason: reason, freshness_state: null };
    }

    // Step 4: Map determination → resolution outcome
    const outcomeMap = {
        [DETERMINATIONS.SATISFIED]:      RESOLUTION_OUTCOMES.SUCCESS,
        [DETERMINATIONS.GAP]:            RESOLUTION_OUTCOMES.INSUFFICIENT,
        [DETERMINATIONS.UNCERTAIN]:      RESOLUTION_OUTCOMES.INSUFFICIENT,
        [DETERMINATIONS.INSUFFICIENT]:   RESOLUTION_OUTCOMES.INSUFFICIENT,
        [DETERMINATIONS.CONFLICTING]:    RESOLUTION_OUTCOMES.CONFLICTING,
        [DETERMINATIONS.STALE_EVIDENCE]: RESOLUTION_OUTCOMES.STALE,
    };
    const outcome = outcomeMap[assessment_result.determination] || RESOLUTION_OUTCOMES.FAILED;

    // Step 5: Update resolution attempt with outcome
    const { error: updErr } = await _sb().from('gap_resolution_attempts').update({
        outcome,
        outcome_reason: assessment_result.determination_reason,
        assessment_ref: assessment_result.assessment_id || null,
    }).eq('attempt_id', attempt_id);
    if (updErr) throw new Error(`attemptResolution (update outcome) failed: ${updErr.message}`);

    // Step 6: If SATISFIED → resolve the gap
    let gap_resolved = false;
    if (outcome === RESOLUTION_OUTCOMES.SUCCESS) {
        await _sb().from('knowledge_gaps').update({
            status:           'RESOLVED',
            resolved_at:      new Date().toISOString(),
            resolution_notes: `Resolved by attempt ${attempt_id}: ${assessment_result.determination_reason}`,
            knowledge_ref:    evidence_ref || null,
        }).eq('gap_id', gap_id);

        // Update requirement if linked
        if (requirement_id) {
            await _sb().from('knowledge_requirements').update({
                status:                   'SATISFIED',
                satisfying_knowledge_ref: evidence_ref || null,
                satisfied_at:             new Date().toISOString(),
            }).eq('requirement_id', requirement_id);
        }
        gap_resolved = true;
    } else {
        // Evidence insufficient — revert gap to OPEN, record failure
        await _sb().from('knowledge_gaps').update({ status: 'OPEN' }).eq('gap_id', gap_id);
    }

    return {
        attempt_id,
        assessment_id:  assessment_result.assessment_id,
        determination:  assessment_result.determination,
        outcome,
        gap_resolved,
    };
}

// ── Core: getLifecycleAuditTrail ──────────────────────────────────────────────

/**
 * getLifecycleAuditTrail — Full auditable reconstruction of a requirement's lifecycle.
 *
 * A reviewer can determine:
 *   - What was required and why
 *   - What evidence was available at each phase
 *   - What each determination was and the reason
 *   - What resolution was attempted and whether it succeeded
 *   - Current state
 *
 * @param {string} requirement_id
 * @returns {Promise<{ requirement, assessments, resolution_attempts, current_state }>}
 */
async function getLifecycleAuditTrail(requirement_id) {
    if (!requirement_id) throw new Error('getLifecycleAuditTrail: requirement_id required');

    const [reqResult, assessResult, attemptResult] = await Promise.all([
        _sb().from('knowledge_requirements').select('*').eq('requirement_id', requirement_id).single(),
        _sb().from('knowledge_evidence_assessments').select('*').eq('requirement_id', requirement_id).order('assessed_at', { ascending: true }),
        _sb().from('gap_resolution_attempts').select('*').eq('requirement_id', requirement_id).order('attempted_at', { ascending: true }),
    ]);

    if (reqResult.error) throw new Error(`getLifecycleAuditTrail (requirement): ${reqResult.error.message}`);

    const requirement    = reqResult.data;
    const assessments    = assessResult.data || [];
    const attempts       = attemptResult.data || [];

    // Derive current lifecycle state from most recent assessment
    const latestAssessment = assessments[assessments.length - 1] || null;
    const current_state = {
        requirement_status:    requirement?.status,
        latest_determination:  latestAssessment?.determination || null,
        latest_assessed_at:    latestAssessment?.assessed_at  || null,
        total_assessments:     assessments.length,
        total_attempts:        attempts.length,
        successful_attempts:   attempts.filter(a => a.outcome === 'SUCCESS').length,
        failed_attempts:       attempts.filter(a => a.outcome !== 'PENDING' && a.outcome !== 'SUCCESS').length,
    };

    return { requirement, assessments, resolution_attempts: attempts, current_state };
}

// ── Core: assessKnowledgeRequirements (integration boundary) ─────────────────

/**
 * assessKnowledgeRequirements — KG-02 canonical integration boundary.
 *
 * Accepts an array of requirement declarations, assesses each for current
 * knowledge availability, and returns a structured determination. This is the
 * function future execution phases will call.
 *
 * @param {Array<object>} requirements  — array of declareRequirement-style params
 * @param {object}        context       — optional context (subject prefix, domain, etc.)
 * @returns {Promise<{ requirements_assessed, has_blocking_gaps, overall_sufficient, determinations }>}
 */
async function assessKnowledgeRequirements(requirements = [], context = {}) {
    if (!Array.isArray(requirements)) throw new Error('assessKnowledgeRequirements: requirements must be an array');

    const kge = require('./knowledge-gap-engine');
    const determinations = [];

    for (const req of requirements) {
        const { requirement_id, status, gap_id } = await kge.declareRequirement({
            ...req,
            requester: context.requester || req.requester || 'system',
        });

        if (status === 'SATISFIED') {
            determinations.push({
                requirement_id,
                status:        'SATISFIED',
                determination: DETERMINATIONS.SATISFIED,
                gap_id:        null,
                assessment_id: null,
            });
        } else {
            // No existing knowledge — assess with NONE evidence (detection phase)
            const assessment = await assessRequirement(requirement_id, {
                evidence_type: EVIDENCE_TYPES.NONE,
                gap_id:        gap_id || null,
                phase:         ASSESSMENT_PHASES.INITIAL,
                assessed_by:   context.assessed_by || 'system',
            });
            determinations.push({
                requirement_id,
                status:        'GAP',
                determination: assessment.determination,
                gap_id,
                assessment_id: assessment.assessment_id,
            });
        }
    }

    const has_blocking_gaps = determinations.some(d =>
        d.determination !== DETERMINATIONS.SATISFIED &&
        (requirements.find(r => r.required_subject === d.requirement_id)?.blocks_decision)
    );

    const overall_sufficient = determinations.every(d => d.determination === DETERMINATIONS.SATISFIED);

    return {
        requirements_assessed: determinations.length,
        has_blocking_gaps,
        overall_sufficient,
        determinations,
    };
}

// ── Exports ───────────────────────────────────────────────────────────────────

module.exports = Object.freeze({
    // Constants
    EVIDENCE_TYPES,
    DETERMINATIONS,
    ASSESSMENT_PHASES,
    RESOLUTION_OUTCOMES,
    MIN_CONFIDENCE,
    MIN_COMPLETENESS,

    // Core lifecycle operations
    assessRequirement,
    attemptResolution,
    getLifecycleAuditTrail,
    assessKnowledgeRequirements,

    // Exported helper (testability)
    _determineFromEvidence,
    _assessmentId,
    _attemptId,
});
