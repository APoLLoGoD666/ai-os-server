'use strict';
// lib/knowledge/knowledge-integrity.js — KG-07 Longitudinal Knowledge Integrity
//
// Detects when previously sufficient knowledge needs reassessment:
//   - evidence expired or became stale
//   - contradicting evidence appeared
//   - evidence was superseded by newer authoritative evidence
//   - the requirement itself changed materially
//   - a prior decision depends on now-invalidated knowledge
//
// WHAT THIS MODULE DOES NOT DO:
//   - Does NOT make final sufficiency decisions (delegates to KG-03/04/05)
//   - Does NOT bypass the constitutional gate
//   - Does NOT make AI model calls
//   - Does NOT delete historical evidence (supersession marks; never deletes)
//   - Does NOT automatically rollback real-world actions
//   - Does NOT create a second memory or knowledge system
//
// Circular dependency: knowledge-gap-engine.js re-exports this module.
// Therefore kge is lazy-required inside function bodies.

const crypto = require('crypto');
const { getSupabaseClient } = require('../clients');

function _sb() { return getSupabaseClient(); }

// ── ID generator ──────────────────────────────────────────────────────────────

function _triggerId() {
    return `KRT-${crypto.randomBytes(6).toString('hex').toUpperCase()}`;
}

// ── Reassessment trigger taxonomy ────────────────────────────────────────────

const REASSESSMENT_TRIGGERS = Object.freeze({
    EXPIRATION:            'EXPIRATION',
    STALENESS:             'STALENESS',
    CONTRADICTION:         'CONTRADICTION',
    REQUIREMENT_CHANGE:    'REQUIREMENT_CHANGE',
    EVIDENCE_SUPERSESSION: 'EVIDENCE_SUPERSESSION',
});

// ── Invalidation state machine ────────────────────────────────────────────────

const INVALIDATION_STATES = Object.freeze({
    REASSESSMENT_REQUIRED:   'REASSESSMENT_REQUIRED',
    KNOWLEDGE_INVALIDATED:   'KNOWLEDGE_INVALIDATED',
    DECISION_REQUIRES_REVIEW:'DECISION_REQUIRES_REVIEW',
    RESOLVED:                'RESOLVED',
});

// ── Persistence helpers (fail-soft) ──────────────────────────────────────────

async function _persistTrigger(record) {
    try {
        const { error } = await _sb().from('knowledge_reassessment_triggers').insert(record);
        if (error) console.warn('[KG-07] _persistTrigger error:', error.message);
    } catch (e) {
        console.warn('[KG-07] _persistTrigger exception:', e.message);
    }
}

// ── Core: checkRequirementIntegrity ──────────────────────────────────────────

/**
 * checkRequirementIntegrity — Determine whether a previously satisfied requirement
 * is still valid, without modifying any state.
 *
 * Checks (in order):
 *   1. Requirement change — if new_required_subject differs materially
 *   2. Evidence supersession — satisfying ref has status='superseded'
 *   3. Expiration — evidence has passed its temporal validity window
 *   4. Staleness — evidence is approaching expiration
 *   5. Contradiction — open contradictions detected in canonical stores
 *   6. Confidence degradation — evidence confidence fell below threshold
 *
 * Returns `still_valid: true` only when all checks pass.
 * Does NOT write any records — pure check function.
 *
 * @param {string} requirement_id
 * @param {object} [opts]
 * @param {string} [opts.knowledge_type]         — for TVW freshness lookup
 * @param {string} [opts.domain_id]              — for domain-scoped contradiction check
 * @param {string} [opts.new_required_subject]   — if requirement changed, compare here
 * @returns {Promise<IntegrityCheckResult>}
 */
async function checkRequirementIntegrity(requirement_id, opts = {}) {
    if (!requirement_id) throw new Error('checkRequirementIntegrity: requirement_id required');

    const { knowledge_type = null, domain_id = null, new_required_subject = null } = opts;

    // Load requirement
    const { data: req, error: reqErr } = await _sb()
        .from('knowledge_requirements')
        .select('*')
        .eq('requirement_id', requirement_id)
        .single();

    if (reqErr || !req) {
        throw new Error(`checkRequirementIntegrity: requirement not found: ${requirement_id}`);
    }

    // If requirement is not SATISFIED, longitudinal check is not applicable
    if (req.status !== 'SATISFIED') {
        return {
            still_valid:              false,
            requirement_id,
            current_status:           req.status,
            trigger_type:             null,
            reason:                   `Requirement not currently satisfied (status=${req.status})`,
            satisfying_knowledge_ref: req.satisfying_knowledge_ref || null,
            freshness_state:          null,
        };
    }

    // 1. Requirement change check
    if (new_required_subject && new_required_subject !== req.required_subject) {
        return {
            still_valid:              false,
            requirement_id,
            current_status:           req.status,
            trigger_type:             REASSESSMENT_TRIGGERS.REQUIREMENT_CHANGE,
            reason:                   `Required subject changed: "${req.required_subject}" → "${new_required_subject}"`,
            satisfying_knowledge_ref: req.satisfying_knowledge_ref || null,
            freshness_state:          null,
        };
    }

    const ref = req.satisfying_knowledge_ref;
    if (!ref) {
        return {
            still_valid:              false,
            requirement_id,
            current_status:           req.status,
            trigger_type:             REASSESSMENT_TRIGGERS.EXPIRATION,
            reason:                   'Satisfied requirement has no satisfying_knowledge_ref — currency cannot be verified',
            satisfying_knowledge_ref: null,
            freshness_state:          null,
        };
    }

    // Evaluate the evidence reference through the canonical evaluator (KG-03)
    const kge = require('./knowledge-gap-engine');
    const evalResult = await kge.evaluateEvidenceRef(ref, {
        subject:        req.required_subject,
        knowledge_type: knowledge_type || null,
    });

    // 2. Evidence supersession check
    if (evalResult.status === 'superseded') {
        return {
            still_valid:              false,
            requirement_id,
            current_status:           req.status,
            trigger_type:             REASSESSMENT_TRIGGERS.EVIDENCE_SUPERSESSION,
            reason:                   `Evidence ${ref} has status='superseded' and is no longer authoritative`,
            satisfying_knowledge_ref: ref,
            freshness_state:          evalResult.freshness_state || null,
        };
    }

    // 3. Expiration check
    if (evalResult.freshness_state === 'EXPIRED') {
        return {
            still_valid:              false,
            requirement_id,
            current_status:           req.status,
            trigger_type:             REASSESSMENT_TRIGGERS.EXPIRATION,
            reason:                   `Evidence ${ref} has expired (freshness_state=EXPIRED); cannot satisfy current requirements`,
            satisfying_knowledge_ref: ref,
            freshness_state:          'EXPIRED',
        };
    }

    // 4. Staleness check (evidence approaching expiration — needs refresh)
    if (evalResult.freshness_state === 'STALE') {
        return {
            still_valid:              false,
            requirement_id,
            current_status:           req.status,
            trigger_type:             REASSESSMENT_TRIGGERS.STALENESS,
            reason:                   `Evidence ${ref} is stale (freshness_state=STALE); should be refreshed before next evaluation`,
            satisfying_knowledge_ref: ref,
            freshness_state:          'STALE',
        };
    }

    // 5. Contradiction check
    const { has_contradictions, sources: contradiction_sources } = await kge.detectContradictions(
        req.required_subject,
        domain_id
    );
    if (has_contradictions) {
        return {
            still_valid:              false,
            requirement_id,
            current_status:           req.status,
            trigger_type:             REASSESSMENT_TRIGGERS.CONTRADICTION,
            reason:                   `Contradictions detected for "${req.required_subject}": ${contradiction_sources.join(', ')}`,
            satisfying_knowledge_ref: ref,
            freshness_state:          evalResult.freshness_state || null,
        };
    }

    // 6. Confidence degradation check (evidence quality deteriorated)
    if (evalResult.found && evalResult.derived_confidence < kge.MIN_CONFIDENCE) {
        return {
            still_valid:              false,
            requirement_id,
            current_status:           req.status,
            trigger_type:             REASSESSMENT_TRIGGERS.EXPIRATION,
            reason:                   `Evidence confidence ${evalResult.derived_confidence?.toFixed(3)} fell below threshold ${kge.MIN_CONFIDENCE}`,
            satisfying_knowledge_ref: ref,
            freshness_state:          evalResult.freshness_state || null,
        };
    }

    // All checks passed — knowledge still valid
    return {
        still_valid:              true,
        requirement_id,
        current_status:           req.status,
        trigger_type:             null,
        reason:                   'Knowledge remains valid: evidence is current, not superseded, no contradictions detected',
        satisfying_knowledge_ref: ref,
        freshness_state:          evalResult.freshness_state || null,
    };
}

// ── Core: triggerReassessment ─────────────────────────────────────────────────

/**
 * triggerReassessment — Record that a previously satisfied requirement needs
 * reassessment due to a longitudinal change.
 *
 * Effects:
 *   1. Inserts a knowledge_reassessment_triggers record
 *   2. Reopens the associated gap (if RESOLVED/IN_RESOLUTION and gap_id found)
 *   3. Updates requirement status back to PENDING (requires re-evaluation)
 *
 * @param {string} requirement_id
 * @param {string} trigger_type   — one of REASSESSMENT_TRIGGERS keys
 * @param {object} [opts]
 * @returns {Promise<{ trigger_id, gap_id, requirement_id }>}
 */
async function triggerReassessment(requirement_id, trigger_type, opts = {}) {
    if (!requirement_id) throw new Error('triggerReassessment: requirement_id required');
    if (!REASSESSMENT_TRIGGERS[trigger_type]) {
        throw new Error(`triggerReassessment: invalid trigger_type '${trigger_type}'. Valid: ${Object.keys(REASSESSMENT_TRIGGERS).join(', ')}`);
    }

    const {
        trigger_reason          = null,
        prior_determination     = null,
        prior_assessment_id     = null,
        superseded_evidence_ref = null,
        new_evidence_ref        = null,
        kg_decision_id_ref      = null,
    } = opts;

    // Load requirement to find linked gap
    const { data: req } = await _sb()
        .from('knowledge_requirements')
        .select('gap_ref, satisfying_knowledge_ref, status')
        .eq('requirement_id', requirement_id)
        .single();

    const gap_id = req?.gap_ref || null;
    const trigger_id = _triggerId();
    const now = new Date().toISOString();

    await _persistTrigger({
        trigger_id,
        requirement_id,
        gap_id,
        trigger_type,
        trigger_reason,
        prior_determination,
        prior_assessment_id,
        superseded_evidence_ref,
        new_evidence_ref,
        kg_decision_id_ref,
        invalidation_state: INVALIDATION_STATES.REASSESSMENT_REQUIRED,
        created_at: now,
        updated_at: now,
    });

    // Reopen the associated gap if it was resolved (best-effort, fail-soft)
    if (gap_id) {
        try {
            await _sb().from('knowledge_gaps').update({
                status:           'OPEN',
                resolution_notes: `Reopened by KG-07 trigger ${trigger_id}: ${trigger_type} — ${trigger_reason || 'longitudinal integrity trigger'}`,
                resolved_at:      null,
            }).eq('gap_id', gap_id).in('status', ['RESOLVED', 'IN_RESOLUTION']);
        } catch (e) {
            console.warn('[KG-07] triggerReassessment: gap reopen failed:', e.message);
        }
    }

    // Update requirement to PENDING — it needs re-evaluation
    if (req?.status === 'SATISFIED') {
        try {
            await _sb().from('knowledge_requirements').update({
                status:                   'PENDING',
                satisfying_knowledge_ref: null,
                satisfied_at:             null,
            }).eq('requirement_id', requirement_id);
        } catch (e) {
            console.warn('[KG-07] triggerReassessment: requirement update failed:', e.message);
        }
    }

    return { trigger_id, gap_id, requirement_id };
}

// ── Core: supersedEvidence ────────────────────────────────────────────────────

/**
 * supersedEvidence — Mark old evidence as superseded by newer authoritative evidence.
 *
 * CRITICAL INVARIANTS:
 *   - The old record is NOT deleted; status changes to 'superseded' (provenance preserved)
 *   - KC- constitutional records cannot be superseded this way (immutable by design)
 *   - A reassessment trigger is created to record the supersession event
 *   - If requirement_id provided, the requirement is updated to PENDING
 *
 * @param {string} old_ref          — evidence ref being superseded (KVQ validation_id)
 * @param {string} new_ref          — new evidence that supersedes the old
 * @param {object} [opts]
 * @param {string} [opts.requirement_id]     — affected requirement (optional)
 * @param {string} [opts.supersession_reason]
 * @returns {Promise<{ trigger_id, old_ref, new_ref, constitutional_record }>}
 */
async function supersedEvidence(old_ref, new_ref, opts = {}) {
    if (!old_ref) throw new Error('supersedEvidence: old_ref required');
    if (!new_ref) throw new Error('supersedEvidence: new_ref required');
    if (old_ref === new_ref) throw new Error('supersedEvidence: old_ref and new_ref must be different');

    const { requirement_id = null, supersession_reason = null } = opts;

    // KC- constitutional records are immutable — they cannot be superseded via this path
    const constitutional_record = old_ref.startsWith('KC-');
    if (!constitutional_record) {
        // Mark old KVQ entry as superseded — record REMAINS in DB (provenance preserved)
        try {
            const { error } = await _sb()
                .from('knowledge_validation_queue')
                .update({ status: 'superseded' })
                .eq('validation_id', old_ref);
            if (error) console.warn('[KG-07] supersedEvidence: KVQ update failed:', error.message);
        } catch (e) {
            console.warn('[KG-07] supersedEvidence: KVQ update exception:', e.message);
        }
    }

    // Create supersession trigger record
    const trigger_id = _triggerId();
    const now = new Date().toISOString();

    await _persistTrigger({
        trigger_id,
        requirement_id:         requirement_id || null,
        gap_id:                 null,
        trigger_type:           REASSESSMENT_TRIGGERS.EVIDENCE_SUPERSESSION,
        trigger_reason:         supersession_reason || `Evidence ${old_ref} superseded by ${new_ref}`,
        prior_determination:    null,
        prior_assessment_id:    null,
        superseded_evidence_ref: old_ref,
        new_evidence_ref:       new_ref,
        kg_decision_id_ref:     null,
        invalidation_state:     INVALIDATION_STATES.REASSESSMENT_REQUIRED,
        created_at:             now,
        updated_at:             now,
    });

    // Update affected requirement to PENDING if satisfied (best-effort, fail-soft)
    if (requirement_id) {
        try {
            const { data: req } = await _sb()
                .from('knowledge_requirements')
                .select('status')
                .eq('requirement_id', requirement_id)
                .single();

            if (req?.status === 'SATISFIED') {
                await _sb().from('knowledge_requirements').update({
                    status:                   'PENDING',
                    satisfying_knowledge_ref: null,
                    satisfied_at:             null,
                }).eq('requirement_id', requirement_id);
            }
        } catch (e) {
            console.warn('[KG-07] supersedEvidence: requirement update failed:', e.message);
        }
    }

    return { trigger_id, old_ref, new_ref, constitutional_record };
}

// ── Core: markDecisionForReview ───────────────────────────────────────────────

/**
 * markDecisionForReview — Link a prior KG-05 decision to a reassessment trigger
 * to signal it may be outdated.
 *
 * CRITICAL: This does NOT rollback, delete, or reverse the decision.
 *           The prior decision remains as an immutable historical record.
 *           This function records that the decision's knowledge basis has changed
 *           and the decision SHOULD be reviewed before being acted upon again.
 *
 * @param {string} kg_decision_id  — knowledge_decision_records.decision_id
 * @param {string} trigger_id      — knowledge_reassessment_triggers.trigger_id
 * @param {string} [reason]
 * @returns {Promise<{ trigger_id, kg_decision_id, invalidation_state }>}
 */
async function markDecisionForReview(kg_decision_id, trigger_id, reason) {
    if (!kg_decision_id) throw new Error('markDecisionForReview: kg_decision_id required');
    if (!trigger_id) throw new Error('markDecisionForReview: trigger_id required');

    try {
        const { error } = await _sb()
            .from('knowledge_reassessment_triggers')
            .update({
                kg_decision_id_ref: kg_decision_id,
                invalidation_state: INVALIDATION_STATES.DECISION_REQUIRES_REVIEW,
                trigger_reason:     reason || `Decision ${kg_decision_id} requires review: knowledge basis has changed`,
                updated_at:         new Date().toISOString(),
            })
            .eq('trigger_id', trigger_id);

        if (error) console.warn('[KG-07] markDecisionForReview error:', error.message);
    } catch (e) {
        console.warn('[KG-07] markDecisionForReview exception:', e.message);
    }

    return {
        trigger_id,
        kg_decision_id,
        invalidation_state: INVALIDATION_STATES.DECISION_REQUIRES_REVIEW,
    };
}

// ── Core: scanForExpiredSatisfactions ────────────────────────────────────────

/**
 * scanForExpiredSatisfactions — Batch-scan satisfied requirements for longitudinal
 * integrity problems.
 *
 * Queries all requirements with status=SATISFIED and checks each via
 * checkRequirementIntegrity(). Returns those that need reassessment.
 *
 * This is a READ-ONLY operation — it does NOT create triggers or modify state.
 * Callers should call triggerReassessment() for each result to act on findings.
 *
 * @param {object} [opts]
 * @param {number} [opts.limit]          — max requirements to scan (default 50)
 * @param {string} [opts.knowledge_type] — restrict freshness check to this type
 * @param {string} [opts.domain_id]      — restrict contradiction check to this domain
 * @returns {Promise<{ scanned, needs_reassessment, requirements }>}
 */
async function scanForExpiredSatisfactions(opts = {}) {
    const { limit = 50, knowledge_type = null, domain_id = null } = opts;

    const { data: satisfied, error } = await _sb()
        .from('knowledge_requirements')
        .select('requirement_id, required_subject, satisfying_knowledge_ref, required_domain_id, satisfied_at')
        .eq('status', 'SATISFIED')
        .not('satisfying_knowledge_ref', 'is', null)
        .limit(limit);

    if (error) throw new Error(`scanForExpiredSatisfactions: ${error.message}`);
    const rows = satisfied || [];
    const needsReassessment = [];

    for (const req of rows) {
        try {
            const integrity = await checkRequirementIntegrity(req.requirement_id, {
                knowledge_type,
                domain_id: domain_id || req.required_domain_id || null,
            });
            if (!integrity.still_valid) {
                needsReassessment.push({
                    requirement_id:           req.requirement_id,
                    required_subject:         req.required_subject,
                    satisfying_knowledge_ref: req.satisfying_knowledge_ref,
                    satisfied_at:             req.satisfied_at,
                    trigger_type:             integrity.trigger_type,
                    reason:                   integrity.reason,
                    freshness_state:          integrity.freshness_state,
                });
            }
        } catch (e) {
            // Skip requirements that fail integrity check (likely DB issue) — continue scan
            console.warn(`[KG-07] scanForExpiredSatisfactions: skipping ${req.requirement_id}:`, e.message);
        }
    }

    return {
        scanned:             rows.length,
        needs_reassessment:  needsReassessment.length,
        requirements:        needsReassessment,
    };
}

// ── Core: resolveReassessmentTrigger ─────────────────────────────────────────

/**
 * resolveReassessmentTrigger — Close a trigger after reassessment is complete.
 *
 * Called after successful re-evaluation via KG-03/04/05 confirms the knowledge
 * is once again sufficient. The trigger record is preserved as audit history.
 *
 * @param {string} trigger_id
 * @param {object} [opts]
 * @param {string} [opts.resolved_by]
 * @returns {Promise<{ trigger_id, invalidation_state }>}
 */
async function resolveReassessmentTrigger(trigger_id, opts = {}) {
    if (!trigger_id) throw new Error('resolveReassessmentTrigger: trigger_id required');

    const { resolved_by = 'system' } = opts;

    const { error } = await _sb()
        .from('knowledge_reassessment_triggers')
        .update({
            invalidation_state: INVALIDATION_STATES.RESOLVED,
            resolved_at:        new Date().toISOString(),
            resolved_by,
            updated_at:         new Date().toISOString(),
        })
        .eq('trigger_id', trigger_id);

    if (error) throw new Error(`resolveReassessmentTrigger: ${error.message}`);
    return { trigger_id, invalidation_state: INVALIDATION_STATES.RESOLVED };
}

// ── Exports ───────────────────────────────────────────────────────────────────

module.exports = Object.freeze({
    REASSESSMENT_TRIGGERS,
    INVALIDATION_STATES,
    checkRequirementIntegrity,
    triggerReassessment,
    supersedEvidence,
    markDecisionForReview,
    scanForExpiredSatisfactions,
    resolveReassessmentTrigger,
    _triggerId,
});
