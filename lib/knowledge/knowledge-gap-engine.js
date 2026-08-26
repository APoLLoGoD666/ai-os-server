'use strict';
// lib/knowledge/knowledge-gap-engine.js — KG-01 Foundation
//
// Canonical authority for operational knowledge gaps.
// Answers: what does APEX know, what is missing, what is stale, what blocks decisions.
//
// ARCHITECTURE NOTE — knowledge ≠ memory:
//   Memory (lib/memory/gateway.js) stores what has been observed and recorded.
//   This engine determines the CURRENT STATE of APEX's usable knowledge and
//   identifies where that knowledge is insufficient for reasoning or action.
//
// CANONICAL CHAIN (read-only consumption — this engine does NOT write to the T3 chain):
//   ObservationRecord → EvidenceObject → InterpretationRecord → BeliefObject → KnowledgeClaim
//   (written by reality/fabric.js → knowledge-validator.js → knowledge-claim-registry.js)
//
// THIS ENGINE WRITES TO:
//   knowledge_gaps          (operational gap state)
//   knowledge_requirements  (decision-declared information needs)
//
// THIS ENGINE READS FROM (canonical sources only):
//   constitutional_records  (KnowledgeClaim, RealityGapEntry via constitutional store)
//   knowledge_validation_queue (pending/confirmed claims)
//   temporal_validity_windows  (freshness model)
//   contradiction_reports   (via contradiction-engine)
//   knowledge_decay_assessments (via decay engine)
//   lib/memory/gateway.js   (for context, NOT bypassed)
//
// GOVERNANCE: gap creation and resolution are recorded; constitutional gate not bypassed.
// AUTHORITY: APEX-CONSTITUTION-v1.0; D4 KI-023; O9-12; R9-v1.0 RS-07 RS-10.7.

const crypto                = require('crypto');
const { getSupabaseClient } = require('../clients');

function _sb() { return getSupabaseClient(); }

// ── Gap type taxonomy ─────────────────────────────────────────────────────────

const GAP_TYPES = Object.freeze({
    UNKNOWN:           { severity_default: 'MEDIUM', blocks_default: false, description: 'No information about subject exists' },
    MISSING:           { severity_default: 'HIGH',   blocks_default: false, description: 'Information should be known but is absent from knowledge store' },
    INCOMPLETE:        { severity_default: 'MEDIUM', blocks_default: false, description: 'Partial knowledge exists; key attributes missing' },
    STALE:             { severity_default: 'MEDIUM', blocks_default: false, description: 'Knowledge exists but past freshness window' },
    CONFLICTING:       { severity_default: 'HIGH',   blocks_default: true,  description: 'Contradictory knowledge items exist; cannot determine truth' },
    LOW_CONFIDENCE:    { severity_default: 'LOW',    blocks_default: false, description: 'Knowledge exists but confidence below useful threshold' },
    UNVERIFIED:        { severity_default: 'LOW',    blocks_default: false, description: 'Information present but not passed validation pipeline' },
    CONTEXT_MISSING:   { severity_default: 'MEDIUM', blocks_default: false, description: 'Knowledge exists but context needed to apply it is absent' },
    DECISION_BLOCKING: { severity_default: 'HIGH',   blocks_default: true,  description: 'Specific decision requires knowledge that does not exist' },
    SOURCE_UNAVAILABLE:{ severity_default: 'MEDIUM', blocks_default: false, description: 'Authoritative source for this knowledge is unreachable' },
});

// ── Knowledge state model (maps from DKS levels + gap state) ─────────────────

const KNOWLEDGE_STATES = Object.freeze({
    KNOWN:               'KNOWN',              // DKS-1, fresh, no open gaps
    KNOWN_LOW_CONFIDENCE:'KNOWN_LOW_CONFIDENCE',// DKS-2 or confidence 0.60–0.79
    STALE:               'STALE',              // DKS-4 or past TVW window
    CONFLICTING:         'CONFLICTING',        // DKS-3 or open CONFLICTING gap
    PARTIALLY_KNOWN:     'PARTIALLY_KNOWN',    // some attributes known; INCOMPLETE gap open
    UNKNOWN:             'UNKNOWN',            // no validated claim; UNKNOWN/MISSING gap or nothing
});

// ── Gap scoring ───────────────────────────────────────────────────────────────
// gap_score 0–100: higher = more urgent for resolution attention

const SEVERITY_BASE = Object.freeze({ CRITICAL: 80, HIGH: 60, MEDIUM: 40, LOW: 20 });

function _computeGapScore({ severity, blocks_decision, auto_resolvable }) {
    const base       = SEVERITY_BASE[severity] || 40;
    const blockBonus = blocks_decision   ? 20 : 0;
    const autoPenal  = auto_resolvable   ? -10 : 0;
    return Math.min(100, Math.max(0, base + blockBonus + autoPenal));
}

// ── ID generators ─────────────────────────────────────────────────────────────

function _gapId() {
    return `KG-${crypto.randomBytes(6).toString('hex').toUpperCase()}`;
}

function _requirementId() {
    return `KR-${crypto.randomBytes(6).toString('hex').toUpperCase()}`;
}

// ── Core: detectGap ──────────────────────────────────────────────────────────

/**
 * detectGap — Create a knowledge gap in the operational store.
 *
 * @param {object} params
 * @param {string} params.gap_type        — one of GAP_TYPES keys
 * @param {string} params.subject         — what the gap is about (required)
 * @param {string} [params.description]   — detailed description
 * @param {string} [params.domain_id]     — DOM-000XXX or null
 * @param {string} [params.severity]      — CRITICAL|HIGH|MEDIUM|LOW (defaults from gap_type)
 * @param {boolean}[params.blocks_decision]
 * @param {boolean}[params.auto_resolvable]
 * @param {string} [params.resolution_strategy]
 * @param {string} [params.knowledge_ref] — related KnowledgeClaim.knowledge_id
 * @param {string} [params.requirement_ref]
 * @param {string} [params.reality_gap_ref] — RealityGapEntry.gap_id
 * @param {string} [params.owner]
 * @param {object} [params.metadata]
 * @returns {Promise<string>} gap_id
 */
async function detectGap(params) {
    const {
        gap_type, subject, description, domain_id,
        severity, blocks_decision, auto_resolvable,
        resolution_strategy, knowledge_ref, requirement_ref,
        reality_gap_ref, owner = 'system', metadata = {},
    } = params || {};

    if (!gap_type || !GAP_TYPES[gap_type]) {
        throw new Error(`detectGap: invalid gap_type '${gap_type}'. Valid: ${Object.keys(GAP_TYPES).join(', ')}`);
    }
    if (!subject) throw new Error('detectGap: subject required');

    const defaults    = GAP_TYPES[gap_type];
    const resolvedSev = severity || defaults.severity_default;
    const resolvedBlk = blocks_decision != null ? blocks_decision : defaults.blocks_default;
    const resolvedAuto= auto_resolvable != null ? !!auto_resolvable : false;
    const gap_score   = _computeGapScore({ severity: resolvedSev, blocks_decision: resolvedBlk, auto_resolvable: resolvedAuto });
    const gap_id      = _gapId();

    const { error } = await _sb().from('knowledge_gaps').insert({
        gap_id,
        gap_type,
        subject,
        description:          description || null,
        domain_id:            domain_id || null,
        severity:             resolvedSev,
        blocks_decision:      resolvedBlk,
        auto_resolvable:      resolvedAuto,
        resolution_strategy:  resolution_strategy || null,
        status:               'OPEN',
        gap_score,
        knowledge_ref:        knowledge_ref   || null,
        requirement_ref:      requirement_ref || null,
        reality_gap_ref:      reality_gap_ref || null,
        owner,
        metadata,
    });

    if (error) throw new Error(`detectGap failed: ${error.message}`);
    return gap_id;
}

// ── Core: queryGaps ──────────────────────────────────────────────────────────

/**
 * queryGaps — Retrieve open knowledge gaps, ordered by priority.
 *
 * @param {object} opts
 * @param {string} [opts.domain_id]
 * @param {string} [opts.gap_type]
 * @param {string} [opts.status]       — default 'OPEN'
 * @param {boolean}[opts.blocks_decision]
 * @param {number} [opts.limit]        — default 50
 * @returns {Promise<Array>}
 */
async function queryGaps(opts = {}) {
    const { domain_id, gap_type, status = 'OPEN', blocks_decision, limit = 50 } = opts;

    let q = _sb().from('knowledge_gaps').select('*').eq('status', status)
                 .order('gap_score', { ascending: false }).limit(limit);

    if (domain_id)           q = q.eq('domain_id', domain_id);
    if (gap_type)            q = q.eq('gap_type', gap_type);
    if (blocks_decision != null) q = q.eq('blocks_decision', blocks_decision);

    const { data, error } = await q;
    if (error) throw new Error(`queryGaps failed: ${error.message}`);
    return data || [];
}

// ── Core: resolveGap ─────────────────────────────────────────────────────────

/**
 * resolveGap — Mark a gap as RESOLVED.
 *
 * @param {string} gap_id
 * @param {object} params
 * @param {string} [params.notes]          — resolution notes
 * @param {string} [params.knowledge_ref]  — satisfying knowledge_id
 * @param {string} [params.resolvedBy]
 * @returns {Promise<void>}
 */
async function resolveGap(gap_id, { notes, knowledge_ref, resolvedBy = 'system' } = {}) {
    if (!gap_id) throw new Error('resolveGap: gap_id required');

    const updates = {
        status:           'RESOLVED',
        resolved_at:      new Date().toISOString(),
        resolution_notes: notes || null,
        owner:            resolvedBy,
    };
    if (knowledge_ref) updates.knowledge_ref = knowledge_ref;

    const { error } = await _sb().from('knowledge_gaps').update(updates).eq('gap_id', gap_id);
    if (error) throw new Error(`resolveGap failed: ${error.message}`);
}

// ── Core: acceptGap ──────────────────────────────────────────────────────────

/**
 * acceptGap — Formally accept a gap as permanently unknowable.
 * Transitions to ACCEPTED_UNKNOWN — does not block further progress.
 */
async function acceptGap(gap_id, { notes, acceptedBy = 'system' } = {}) {
    if (!gap_id) throw new Error('acceptGap: gap_id required');
    const { error } = await _sb().from('knowledge_gaps').update({
        status:           'ACCEPTED_UNKNOWN',
        resolved_at:      new Date().toISOString(),
        resolution_notes: notes || 'Formally accepted as permanently unknowable.',
        owner:            acceptedBy,
    }).eq('gap_id', gap_id);
    if (error) throw new Error(`acceptGap failed: ${error.message}`);
}

// ── Core: declareRequirement ─────────────────────────────────────────────────

/**
 * declareRequirement — A decision/reasoning system declares it needs information.
 *
 * Checks existing knowledge_validation_queue for a matching subject. If no
 * satisfying knowledge found, creates a DECISION_BLOCKING gap and links them.
 *
 * @param {object} params
 * @param {string} params.decision_context  — what decision needs this
 * @param {string} params.required_subject  — what information is needed
 * @param {string} [params.domain_id]
 * @param {string} [params.urgency]         — IMMEDIATE|SOON|EVENTUAL
 * @param {boolean}[params.blocks_decision]
 * @param {string} [params.requester]
 * @param {object} [params.metadata]
 * @returns {Promise<{ requirement_id, status, gap_id? }>}
 */
async function declareRequirement(params) {
    const {
        decision_context, required_subject, domain_id,
        urgency = 'EVENTUAL', blocks_decision = false,
        requester = 'system', metadata = {},
    } = params || {};

    if (!decision_context) throw new Error('declareRequirement: decision_context required');
    if (!required_subject) throw new Error('declareRequirement: required_subject required');

    const requirement_id = _requirementId();

    // Check if validated knowledge already exists for this subject
    const { data: existing } = await _sb()
        .from('knowledge_validation_queue')
        .select('validation_id, confidence, status')
        .ilike('lesson_text', `%${required_subject.slice(0, 80)}%`)
        .eq('status', 'validated')
        .limit(1);

    const satisfied = existing && existing.length > 0;

    const { error: reqErr } = await _sb().from('knowledge_requirements').insert({
        requirement_id,
        decision_context,
        required_subject,
        required_domain_id:       domain_id || null,
        urgency,
        blocks_decision,
        status:                   satisfied ? 'SATISFIED' : 'PENDING',
        satisfying_knowledge_ref: satisfied ? existing[0].validation_id : null,
        requester,
        satisfied_at:             satisfied ? new Date().toISOString() : null,
        metadata,
    });
    if (reqErr) throw new Error(`declareRequirement insert failed: ${reqErr.message}`);

    if (satisfied) {
        return { requirement_id, status: 'SATISFIED' };
    }

    // No existing knowledge — create a DECISION_BLOCKING gap if blocks_decision, else MISSING
    const gap_type = blocks_decision ? 'DECISION_BLOCKING' : 'MISSING';
    const severity = blocks_decision ? (urgency === 'IMMEDIATE' ? 'CRITICAL' : 'HIGH') : 'MEDIUM';

    const gap_id = await detectGap({
        gap_type,
        subject: required_subject,
        description: `Required by: ${decision_context}`,
        domain_id,
        severity,
        blocks_decision,
        auto_resolvable: false,
        resolution_strategy: blocks_decision ? 'SEARCH_MEMORY' : 'DEFER',
        requirement_ref: requirement_id,
        owner: requester,
        metadata: { decision_context, urgency },
    });

    // Link gap back to requirement
    await _sb().from('knowledge_requirements').update({
        status:  'GAP_CREATED',
        gap_ref: gap_id,
    }).eq('requirement_id', requirement_id);

    return { requirement_id, status: 'GAP_CREATED', gap_id };
}

// ── Core: assessStaleness ─────────────────────────────────────────────────────

/**
 * _computeStaleness — Pure staleness computation given a TVW window row and age.
 * Exported for direct testability (no DB required).
 */
function _computeStaleness(window, age_seconds) {
    if (!window) return { is_stale: false, is_expired: false };
    const is_expired = window.validity_seconds != null && age_seconds >= window.validity_seconds;
    const stale_threshold = window.validity_seconds != null
        ? window.validity_seconds - (window.staleness_seconds || 0)
        : (window.staleness_seconds != null ? window.staleness_seconds : Infinity);
    const is_stale = is_expired || age_seconds >= stale_threshold;
    return { is_stale, is_expired };
}

/**
 * assessStaleness — Check if a knowledge_type is stale based on TVW.
 * Does NOT modify any state; pure assessment.
 *
 * @param {string} knowledge_type  — e.g. 'FINANCIAL_BALANCE', 'CALENDAR_EVENT'
 * @param {string|Date} formed_at  — when the knowledge claim was formed
 * @returns {Promise<{ is_stale: boolean, is_expired: boolean, window: object|null, age_seconds: number }>}
 */
async function assessStaleness(knowledge_type, formed_at) {
    const { data: tvw } = await _sb()
        .from('temporal_validity_windows')
        .select('*')
        .eq('knowledge_type', knowledge_type)
        .single();

    const age_seconds = Math.floor((Date.now() - new Date(formed_at).getTime()) / 1000);

    if (!tvw) {
        return { is_stale: false, is_expired: false, window: null, age_seconds };
    }

    const { is_stale, is_expired } = _computeStaleness(tvw, age_seconds);
    return { is_stale, is_expired, window: tvw, age_seconds };
}

// ── Core: getKnowledgeState ───────────────────────────────────────────────────

/**
 * getKnowledgeState — Answer: "What does APEX currently know about subject X?"
 *
 * Queries operational state only (knowledge_validation_queue, knowledge_gaps).
 * Does NOT call memory gateway to avoid adding latency; callers needing full
 * context should call gateway.searchMemory() separately.
 *
 * @param {string} subject
 * @param {object} [opts]
 * @param {string} [opts.domain_id]
 * @returns {Promise<{ state, confidence, open_gaps, validated_count, freshness }>}
 */
async function getKnowledgeState(subject, opts = {}) {
    const { domain_id } = opts;

    // 1. Check validated knowledge claims for this subject
    let claimQuery = _sb()
        .from('knowledge_validation_queue')
        .select('validation_id, confidence, status, created_at, domain_id')
        .ilike('lesson_text', `%${subject.slice(0, 80).replace(/%/g, '')}%`)
        .limit(10);
    if (domain_id) claimQuery = claimQuery.eq('domain_id', domain_id);
    const { data: claims } = await claimQuery;

    // 2. Check open gaps for this subject
    let gapQuery = _sb()
        .from('knowledge_gaps')
        .select('gap_id, gap_type, severity, blocks_decision, status')
        .ilike('subject', `%${subject.slice(0, 80).replace(/%/g, '')}%`)
        .eq('status', 'OPEN')
        .limit(20);
    if (domain_id) gapQuery = gapQuery.eq('domain_id', domain_id);
    const { data: openGaps } = await gapQuery;

    const validated  = (claims || []).filter(c => c.status === 'validated');
    const pending    = (claims || []).filter(c => c.status === 'pending' || c.status === 'confirming');
    const gaps       = openGaps || [];
    const hasConflict = gaps.some(g => g.gap_type === 'CONFLICTING');
    const hasBlocking = gaps.some(g => g.blocks_decision);

    // Determine state
    let state, confidence = null;

    if (hasConflict) {
        state = KNOWLEDGE_STATES.CONFLICTING;
    } else if (validated.length > 0) {
        const maxConf = Math.max(...validated.map(c => parseFloat(c.confidence) || 0));
        confidence = maxConf;
        const hasStale = gaps.some(g => g.gap_type === 'STALE');
        if (hasStale) {
            state = KNOWLEDGE_STATES.STALE;
        } else if (maxConf < 0.60) {
            state = KNOWLEDGE_STATES.KNOWN_LOW_CONFIDENCE;
        } else if (gaps.some(g => g.gap_type === 'INCOMPLETE')) {
            state = KNOWLEDGE_STATES.PARTIALLY_KNOWN;
        } else {
            state = KNOWLEDGE_STATES.KNOWN;
        }
    } else if (pending.length > 0) {
        state = KNOWLEDGE_STATES.KNOWN_LOW_CONFIDENCE;
        confidence = 0.30; // In validation pipeline
    } else {
        state = KNOWLEDGE_STATES.UNKNOWN;
    }

    return {
        state,
        confidence,
        open_gaps:        gaps,
        blocks_decision:  hasBlocking,
        validated_count:  validated.length,
        pending_count:    pending.length,
        freshness:        gaps.some(g => g.gap_type === 'STALE') ? 'STALE' : (validated.length > 0 ? 'FRESH' : 'UNKNOWN'),
        subject,
        domain_id:        domain_id || null,
    };
}

// ── Core: getGapStats ─────────────────────────────────────────────────────────

async function getGapStats() {
    const { data: gaps } = await _sb()
        .from('knowledge_gaps')
        .select('gap_type, severity, status, blocks_decision')
        .limit(1000);

    const rows = gaps || [];
    const open = rows.filter(r => r.status === 'OPEN');

    const byType = {};
    for (const g of open) byType[g.gap_type] = (byType[g.gap_type] || 0) + 1;

    const bySeverity = {};
    for (const g of open) bySeverity[g.severity] = (bySeverity[g.severity] || 0) + 1;

    return {
        total:              rows.length,
        open:               open.length,
        resolved:           rows.filter(r => r.status === 'RESOLVED').length,
        accepted:           rows.filter(r => r.status === 'ACCEPTED_UNKNOWN').length,
        in_resolution:      rows.filter(r => r.status === 'IN_RESOLUTION').length,
        blocking_decisions: open.filter(r => r.blocks_decision).length,
        by_type:            byType,
        by_severity:        bySeverity,
    };
}

// ── KG-02 Lifecycle (re-exported from canonical lifecycle module) ─────────────
// All lifecycle functions are canonical through THIS engine — callers must not
// require knowledge-lifecycle.js directly.

const _lifecycle = require('./knowledge-lifecycle');

// ── KG-03 Evidence Evaluator (re-exported through canonical surface) ──────────
// Callers must not require knowledge-evidence-evaluator.js directly.

const _evaluator = require('./knowledge-evidence-evaluator');

// ── KG-04 Knowledge Sufficiency Context (re-exported through canonical surface) ──
// Callers must not require knowledge-context.js directly.

const _ctx = require('./knowledge-context');

// ── KG-05 Decision Integration (re-exported through canonical surface) ─────────
// Callers must not require knowledge-decision.js directly.

const _dec = require('./knowledge-decision');

// ── KG-06 Resolution Engine (re-exported through canonical surface) ────────────
// Callers must not require knowledge-resolution-engine.js directly.

const _res       = require('./knowledge-resolution-engine');
const _integrity = require('./knowledge-integrity');

// ── Exports ───────────────────────────────────────────────────────────────────

module.exports = Object.freeze({
    // Gap taxonomy (read-only reference)
    GAP_TYPES,
    KNOWLEDGE_STATES,
    SEVERITY_BASE,

    // KG-01: Core gap operations
    detectGap,
    queryGaps,
    resolveGap,
    acceptGap,
    declareRequirement,
    assessStaleness,
    getKnowledgeState,
    getGapStats,

    // KG-02: Lifecycle constants
    EVIDENCE_TYPES:      _lifecycle.EVIDENCE_TYPES,
    DETERMINATIONS:      _lifecycle.DETERMINATIONS,
    ASSESSMENT_PHASES:   _lifecycle.ASSESSMENT_PHASES,
    RESOLUTION_OUTCOMES: _lifecycle.RESOLUTION_OUTCOMES,
    MIN_CONFIDENCE:      _lifecycle.MIN_CONFIDENCE,
    MIN_COMPLETENESS:    _lifecycle.MIN_COMPLETENESS,

    // KG-02: Lifecycle operations
    assessRequirement:             _lifecycle.assessRequirement,
    attemptResolution:             _lifecycle.attemptResolution,
    getLifecycleAuditTrail:        _lifecycle.getLifecycleAuditTrail,
    assessKnowledgeRequirements:   _lifecycle.assessKnowledgeRequirements,

    // KG-03: Evidence evaluation
    evaluateEvidenceRef:    _evaluator.evaluateEvidenceRef,
    evaluateEvidenceBundle: _evaluator.evaluateEvidenceBundle,
    detectContradictions:   _evaluator.detectContradictions,
    SOURCE_AUTHORITY:       _evaluator.SOURCE_AUTHORITY,
    FRESHNESS:              _evaluator.FRESHNESS,

    // KG-04: Knowledge sufficiency context
    buildKnowledgeContext:        _ctx.buildKnowledgeContext,
    DETERMINATION_TO_SUFFICIENCY: _ctx.DETERMINATION_TO_SUFFICIENCY,
    SUFFICIENCY_PRIORITY:         _ctx.SUFFICIENCY_PRIORITY,

    // KG-05: Decision integration
    evaluateKnowledgeDecision: _dec.evaluateKnowledgeDecision,
    DECISION_OUTCOMES:         _dec.DECISION_OUTCOMES,

    // KG-06: Resolution engine
    resolveAndDecide:     _res.resolveAndDecide,
    planResolution:       _res.planResolution,
    executeResolutionPlan:_res.executeResolutionPlan,
    RESOLUTION_STRATEGIES:_res.RESOLUTION_STRATEGIES,
    PLAN_STATUSES:        _res.PLAN_STATUSES,

    // KG-07: Longitudinal knowledge integrity
    checkRequirementIntegrity:   _integrity.checkRequirementIntegrity,
    triggerReassessment:         _integrity.triggerReassessment,
    supersedEvidence:            _integrity.supersedEvidence,
    markDecisionForReview:       _integrity.markDecisionForReview,
    scanForExpiredSatisfactions: _integrity.scanForExpiredSatisfactions,
    resolveReassessmentTrigger:  _integrity.resolveReassessmentTrigger,
    REASSESSMENT_TRIGGERS:       _integrity.REASSESSMENT_TRIGGERS,
    INVALIDATION_STATES:         _integrity.INVALIDATION_STATES,

    // Exported helpers (testability; _ prefix = internal)
    _computeGapScore,
    _computeStaleness,
    _gapId,
    _requirementId,
    _determineFromEvidence:       _lifecycle._determineFromEvidence,
    _assessmentId:                _lifecycle._assessmentId,
    _attemptId:                   _lifecycle._attemptId,
    _combineEvaluations:          _evaluator._combineEvaluations,
    _sourceTypeToEvidenceType:    _evaluator._sourceTypeToEvidenceType,
    _sourceTypeToAuthority:       _evaluator._sourceTypeToAuthority,
    _mapToDecisionOutcome:        _dec._mapToDecisionOutcome,
    _buildOutcomeReason:          _dec._buildOutcomeReason,
    _decisionId:                  _dec._decisionId,
    _planId:                      _res._planId,
    _selectStrategy:              _res._selectStrategy,
    _triggerId:                   _integrity._triggerId,
});
