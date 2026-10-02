'use strict';
// lib/knowledge/knowledge-resolution-engine.js — KG-06
//
// Gap-resolution orchestration. Acquires evidence through authorised mechanisms,
// then re-evaluates through KG-03/04/05. Never shortcuts to PROCEED itself.
//
// Entry point: resolveAndDecide(requirements, decisionCtx, opts)
//
// Circular dependency: knowledge-gap-engine.js re-exports this module.
// Therefore kge is lazy-required inside function bodies.

const crypto = require('crypto');
const { getSupabaseClient } = require('../clients');

function _sb() { return getSupabaseClient(); }

// ── Resolution strategy taxonomy ──────────────────────────────────────────────

const RESOLUTION_STRATEGIES = Object.freeze({
    USE_EXISTING_KNOWLEDGE:   'USE_EXISTING_KNOWLEDGE',
    QUERY_CANONICAL_MEMORY:   'QUERY_CANONICAL_MEMORY',
    SUBMIT_FOR_VALIDATION:    'SUBMIT_FOR_VALIDATION',
    REQUEST_USER_INFORMATION: 'REQUEST_USER_INFORMATION',
    BLOCK_ACTION:             'BLOCK_ACTION',
});

// ── Plan status taxonomy ──────────────────────────────────────────────────────

const PLAN_STATUSES = Object.freeze({
    PLANNED:               'PLANNED',
    RESOLVING:             'RESOLVING',
    EVIDENCE_ACQUIRED:     'EVIDENCE_ACQUIRED',
    REASSESSMENT_REQUIRED: 'REASSESSMENT_REQUIRED',
    RESOLVED:              'RESOLVED',
    BLOCKED:               'BLOCKED',
    ABANDONED:             'ABANDONED',
});

// ── ID generator ──────────────────────────────────────────────────────────────

function _planId() {
    return `KRP-${crypto.randomBytes(6).toString('hex').toUpperCase()}`;
}

// ── Strategy selector (pure) ──────────────────────────────────────────────────

function _selectStrategy(requirement, opts = {}) {
    if (opts.resolution_strategy && RESOLUTION_STRATEGIES[opts.resolution_strategy]) {
        return opts.resolution_strategy;
    }
    if (opts.evidence_text && opts.evidence_text.length >= 10) {
        return RESOLUTION_STRATEGIES.SUBMIT_FOR_VALIDATION;
    }
    return RESOLUTION_STRATEGIES.USE_EXISTING_KNOWLEDGE;
}

// ── Plan persistence helpers (fail-soft) ─────────────────────────────────────

async function _persistPlan(record) {
    try {
        const { error } = await _sb().from('knowledge_resolution_plans').insert(record);
        if (error) console.warn('[KG-06] _persistPlan error:', error.message);
    } catch (e) {
        console.warn('[KG-06] _persistPlan exception:', e.message);
    }
}

async function _updatePlan(plan_id, updates) {
    try {
        const { error } = await _sb()
            .from('knowledge_resolution_plans')
            .update({ ...updates, updated_at: new Date().toISOString() })
            .eq('plan_id', plan_id);
        if (error) console.warn('[KG-06] _updatePlan error:', error.message);
    } catch (e) {
        console.warn('[KG-06] _updatePlan exception:', e.message);
    }
}

// ── Core: planResolution ──────────────────────────────────────────────────────

async function planResolution(gap_id, requirement_id, opts = {}) {
    const {
        resolution_strategy = RESOLUTION_STRATEGIES.USE_EXISTING_KNOWLEDGE,
        max_attempts = 3,
        requested_by = 'system',
        question = null,
    } = opts;

    if (!RESOLUTION_STRATEGIES[resolution_strategy]) {
        throw new Error(`planResolution: invalid resolution_strategy '${resolution_strategy}'`);
    }

    const plan_id = _planId();
    const now = new Date().toISOString();

    await _persistPlan({
        plan_id,
        gap_id:                gap_id          || null,
        requirement_id:        requirement_id  || null,
        resolution_strategy,
        status:                PLAN_STATUSES.PLANNED,
        max_attempts,
        attempts_used:         0,
        started_at:            now,
        evidence_provenance:   [],
        user_request_question: question,
        requested_by,
        created_at:            now,
        updated_at:            now,
    });

    return plan_id;
}

// ── Acquisition strategy implementations ──────────────────────────────────────

async function _useExistingKnowledge(requirement) {
    const kge = require('./knowledge-gap-engine');
    const subject = requirement.required_subject || requirement.subject || '';
    if (!subject) {
        return { acquired: false, evidence_ref: null, source: 'existing_knowledge', detail: 'No subject' };
    }
    const state = await kge.getKnowledgeState(subject);
    if (!state || state.validated_count === 0) {
        return { acquired: false, evidence_ref: null, source: 'existing_knowledge', detail: 'No validated knowledge found' };
    }
    return {
        acquired:      true,
        evidence_ref:  `existing:${subject.slice(0, 40)}`,
        evidence_type: 'RETRIEVED',
        source:        'existing_knowledge',
        detail:        `${state.validated_count} validated claims; state=${state.state}`,
    };
}

async function _queryCanonicalMemory(requirement) {
    const gateway   = require('../memory/gateway');
    const validator = require('../intelligence/knowledge-validator');

    const subject = requirement.required_subject || requirement.subject || '';
    let results;
    try {
        results = await gateway.searchMemory({
            query:            subject,
            layers:           [2, 7],
            limit:            3,
            requestingEntity: 'knowledge-resolution-engine',
        });
    } catch (e) {
        return { acquired: false, evidence_ref: null, source: 'canonical_memory', detail: `searchMemory failed: ${e.message}` };
    }

    if (!results || !results.length) {
        return { acquired: false, evidence_ref: null, source: 'canonical_memory', detail: 'No memory results' };
    }

    const top = results[0];
    const lessonText = top.content || top.text || top.lesson_text || JSON.stringify(top).slice(0, 500);
    let validationId = null;
    try {
        validationId = await validator.submitLesson(lessonText, {
            sourceType: 'memory_retrieval',
            domainId:   requirement.domain_id || null,
        });
    } catch (e) {
        console.warn('[KG-06] submitLesson (memory) failed:', e.message);
    }

    return {
        acquired:      !!validationId,
        evidence_ref:  validationId || null,
        evidence_type: 'RETRIEVED',
        source:        'canonical_memory',
        detail:        validationId
            ? `Retrieved from memory, submitted as ${validationId}`
            : 'Memory found but validation submission failed',
    };
}

async function _submitForValidation(requirement, opts) {
    const validator  = require('../intelligence/knowledge-validator');
    const lessonText = opts.evidence_text || '';
    if (lessonText.length < 10) {
        return { acquired: false, evidence_ref: null, source: 'validation_submission', detail: 'evidence_text too short or missing' };
    }
    let validationId = null;
    try {
        validationId = await validator.submitLesson(lessonText, {
            sourceType: 'resolution_submission',
            domainId:   requirement.domain_id || null,
        });
    } catch (e) {
        return { acquired: false, evidence_ref: null, source: 'validation_submission', detail: `submitLesson failed: ${e.message}` };
    }
    return {
        acquired:      !!validationId,
        evidence_ref:  validationId || null,
        evidence_type: 'INFERRED',
        source:        'validation_submission',
        detail:        validationId ? `Submitted for validation: ${validationId}` : 'Submission returned null',
    };
}

async function _requestUserInformation(requirement, opts, plan_id) {
    const subject  = requirement.required_subject || requirement.subject || 'unknown subject';
    const question = opts.question || `APEX needs clarification about: ${subject}`;

    let notification_id = null;
    try {
        const { data } = await _sb().from('apex_notifications').insert({
            type:       'knowledge_request',
            title:      `Knowledge Request: ${subject.slice(0, 80)}`,
            body:       question,
            read:       false,
            created_at: new Date().toISOString(),
        }).select('id').single();
        notification_id = data?.id != null ? String(data.id) : null;
    } catch (e) {
        console.warn('[KG-06] apex_notifications insert failed:', e.message);
    }

    await _updatePlan(plan_id, {
        user_notification_id:  notification_id,
        user_request_sent_at:  new Date().toISOString(),
        user_request_question: question,
    });

    return {
        acquired:       false,
        evidence_ref:   null,
        source:         'user_request',
        detail:         `User notified (notification_id=${notification_id}); awaiting response`,
        user_requested: true,
        notification_id,
    };
}

// ── Core: executeResolutionPlan ───────────────────────────────────────────────

async function executeResolutionPlan(plan_id, requirement, opts = {}) {
    if (!plan_id) throw new Error('executeResolutionPlan: plan_id required');
    if (!requirement) throw new Error('executeResolutionPlan: requirement required');

    let plan;
    try {
        const { data } = await _sb()
            .from('knowledge_resolution_plans')
            .select('*')
            .eq('plan_id', plan_id)
            .single();
        plan = data;
    } catch (e) {
        return { plan_id, success: false, error: e.message };
    }

    if (!plan) {
        return { plan_id, success: false, error: 'plan not found' };
    }

    if (plan.attempts_used >= plan.max_attempts) {
        await _updatePlan(plan_id, {
            status:       PLAN_STATUSES.ABANDONED,
            completed_at: new Date().toISOString(),
        });
        return { plan_id, success: false, error: 'max_attempts exceeded' };
    }

    await _updatePlan(plan_id, {
        status:        PLAN_STATUSES.RESOLVING,
        attempts_used: plan.attempts_used + 1,
    });

    // Execute acquisition strategy
    let acquisition;
    try {
        switch (plan.resolution_strategy) {
            case RESOLUTION_STRATEGIES.USE_EXISTING_KNOWLEDGE:
                acquisition = await _useExistingKnowledge(requirement);
                break;
            case RESOLUTION_STRATEGIES.QUERY_CANONICAL_MEMORY:
                acquisition = await _queryCanonicalMemory(requirement);
                break;
            case RESOLUTION_STRATEGIES.SUBMIT_FOR_VALIDATION:
                acquisition = await _submitForValidation(requirement, opts);
                break;
            case RESOLUTION_STRATEGIES.REQUEST_USER_INFORMATION:
                acquisition = await _requestUserInformation(requirement, opts, plan_id);
                break;
            case RESOLUTION_STRATEGIES.BLOCK_ACTION:
            default:
                acquisition = {
                    acquired:     false,
                    evidence_ref: null,
                    source:       'block_action',
                    detail:       'BLOCK_ACTION strategy: no acquisition attempted',
                };
                break;
        }
    } catch (e) {
        acquisition = {
            acquired:     false,
            evidence_ref: null,
            source:       plan.resolution_strategy || 'unknown',
            detail:       `Strategy threw: ${e.message}`,
        };
    }

    // Build provenance entry
    const provenanceEntry = {
        acquired_at:   new Date().toISOString(),
        strategy:      plan.resolution_strategy,
        source:        acquisition.source,
        evidence_ref:  acquisition.evidence_ref,
        evidence_type: acquisition.evidence_type || null,
        acquired:      acquisition.acquired,
        detail:        acquisition.detail,
        attempt:       plan.attempts_used + 1,
    };

    // If evidence acquired, submit to KG-02/03 via attemptResolution
    let assessment_id = null;
    if (acquisition.acquired && acquisition.evidence_ref && plan.gap_id) {
        try {
            const kge = require('./knowledge-gap-engine');
            const result = await kge.attemptResolution(plan.gap_id, {
                strategy:      plan.resolution_strategy,
                evidence_type: acquisition.evidence_type || 'RETRIEVED',
                evidence_ref:  acquisition.evidence_ref,
                evidence_source: acquisition.source,
                attempted_by:  opts.requested_by || 'system',
                metadata:      { plan_id },
            });
            assessment_id = result?.assessment_id || null;
            provenanceEntry.assessment_id = assessment_id;
        } catch (e) {
            console.warn('[KG-06] attemptResolution failed:', e.message);
            provenanceEntry.resolution_error = e.message;
        }
    }

    const updatedProvenance = [...(plan.evidence_provenance || []), provenanceEntry];

    const newStatus = acquisition.acquired
        ? PLAN_STATUSES.EVIDENCE_ACQUIRED
        : (plan.resolution_strategy === RESOLUTION_STRATEGIES.REQUEST_USER_INFORMATION
            ? PLAN_STATUSES.REASSESSMENT_REQUIRED
            : PLAN_STATUSES.BLOCKED);

    await _updatePlan(plan_id, {
        status:              newStatus,
        evidence_provenance: updatedProvenance,
    });

    return {
        plan_id,
        success:        acquisition.acquired,
        strategy:       plan.resolution_strategy,
        evidence_ref:   acquisition.evidence_ref,
        assessment_id,
        provenance:     provenanceEntry,
        user_requested: acquisition.user_requested || false,
    };
}

// ── Core: resolveAndDecide ────────────────────────────────────────────────────

async function resolveAndDecide(requirements, decisionCtx, opts = {}) {
    if (!Array.isArray(requirements)) {
        throw new Error('resolveAndDecide: requirements must be an array');
    }

    const kge = require('./knowledge-gap-engine');
    const {
        max_attempts       = 3,
        requested_by       = 'system',
        evidence_text,
        question,
        resolution_strategy,
    } = opts;

    // Phase 1: Initial evaluation — KG-04 → KG-05
    const initial = await kge.evaluateKnowledgeDecision(requirements, decisionCtx, {
        assessed_by: requested_by,
    });

    if (initial.can_proceed) {
        return { ...initial, resolution_attempted: false, plans: [] };
    }

    // Phase 2: Plan and execute resolution for each requirement
    const plans = [];
    const targetReqs = requirements.length > 0 ? requirements : [];

    for (const req of targetReqs) {
        const subject = req.required_subject || req.subject || '';
        if (!subject) continue;

        // Declare the requirement to get/create a gap_id
        let gap_id = null;
        try {
            const ctxStr = typeof decisionCtx === 'string'
                ? decisionCtx
                : (decisionCtx?.decision_context || 'KG-06 resolveAndDecide');
            const declared = await kge.declareRequirement({
                decision_context: ctxStr,
                required_subject: subject,
                blocks_decision:  req.blocks_decision !== false,
                urgency:          req.urgency || 'SOON',
                requester:        requested_by,
            });
            gap_id = declared.gap_id || null;
        } catch (e) {
            console.warn('[KG-06] declareRequirement failed:', e.message);
        }

        const strategy = _selectStrategy(req, { resolution_strategy, evidence_text });

        let plan_id;
        try {
            plan_id = await planResolution(gap_id, null, {
                resolution_strategy: strategy,
                max_attempts,
                requested_by,
                question: question || null,
            });
        } catch (e) {
            plans.push({ gap_id, plan_id: null, success: false, error: e.message });
            continue;
        }

        let execResult;
        try {
            execResult = await executeResolutionPlan(plan_id, req, {
                requested_by,
                evidence_text,
                question,
            });
        } catch (e) {
            execResult = { plan_id, success: false, error: e.message };
        }

        plans.push({ gap_id, ...execResult });
    }

    // Phase 3: Re-evaluate after resolution — KG-04 → KG-05
    const final = await kge.evaluateKnowledgeDecision(requirements, decisionCtx, {
        assessed_by: requested_by,
    });

    // Close plans based on final outcome
    const finalPlanStatus = final.can_proceed ? PLAN_STATUSES.RESOLVED : PLAN_STATUSES.BLOCKED;
    for (const p of plans) {
        if (p.plan_id && p.success !== false) {
            await _updatePlan(p.plan_id, {
                status:                finalPlanStatus,
                completed_at:          new Date().toISOString(),
                outcome_determination: final.outcome,
                outcome_reason:        final.outcome_reason,
                kg_decision_id:        final.decision_id || null,
            });
        }
    }

    return { ...final, resolution_attempted: true, plans };
}

// ── Exports ───────────────────────────────────────────────────────────────────

module.exports = Object.freeze({
    RESOLUTION_STRATEGIES,
    PLAN_STATUSES,
    planResolution,
    executeResolutionPlan,
    resolveAndDecide,
    _planId,
    _selectStrategy,
});
