'use strict';
// lib/knowledge/knowledge-decision.js — KG-05 Decision Integration
//
// Provides the canonical evaluateKnowledgeDecision() function:
//
//   REQUIRE KNOWLEDGE
//     → BUILD SUFFICIENCY CONTEXT (KG-04)
//     → MAP TO DECISION OUTCOME
//     → PERSIST AUDIT RECORD
//     → RETURN KgDecisionResult
//
// ARCHITECTURE:
//   Callers declare knowledge requirements BEFORE taking consequential actions.
//   This module maps the knowledge sufficiency state to one of four outcomes:
//     PROCEED, PROCEED_WITH_CONDITION, REQUEST_INFORMATION, BLOCKED
//
//   The decision outcome is NOT governance authority. It is NOT constitutional
//   permission. Callers MUST still pass through the constitutional gate and
//   EA runtime for execution authority. KG-05 is a knowledge pre-condition
//   check that runs BEFORE those authorities, not instead of them.
//
// OWNED BY: lib/knowledge/knowledge-gap-engine.js (re-exported through canonical surface)
// DO NOT require this file directly — use kge.evaluateKnowledgeDecision()
//
// INVARIANTS:
//   1. Caller cannot self-certify knowledge sufficiency — all assessments go through canonical KG
//   2. CONTRADICTORY always blocks — regardless of individual blocks_decision flags
//   3. Evaluation failure fails CLOSED: exception → BLOCKED (never silently PROCEED)
//   4. PROCEED does NOT grant constitutional permission — the authority layer above is separate
//   5. BLOCKED means the action MUST NOT proceed due to knowledge inadequacy
//   6. Every evaluation is persisted to knowledge_decision_records (full audit trail)
//   7. No AI model calls — purely deterministic logic over persisted evidence
//   8. No governance/constitutional imports — knowledge authority is separate from execution authority

const crypto                = require('crypto');
const { getSupabaseClient } = require('../clients');

function _sb() { return getSupabaseClient(); }

// ── Decision outcome taxonomy ─────────────────────────────────────────────────

const DECISION_OUTCOMES = Object.freeze({
    PROCEED:                'PROCEED',                // Sufficient; proceed to authority layer
    PROCEED_WITH_CONDITION: 'PROCEED_WITH_CONDITION', // Adequate but imperfect; proceed with awareness
    REQUEST_INFORMATION:    'REQUEST_INFORMATION',    // Mandatory knowledge uncertain; obtain evidence first
    BLOCKED:                'BLOCKED',                // Mandatory knowledge missing/contradictory; cannot proceed
});

// ── Sufficiency state → decision outcome ─────────────────────────────────────
// Consequence-sensitive: outcome depends on whether blocking mandatory gaps exist.

function _mapToDecisionOutcome(sufficiency_state, has_blocking_gaps) {
    // CONTRADICTORY always blocks — contradictory evidence means truth is indeterminate
    if (sufficiency_state === 'CONTRADICTORY') {
        return DECISION_OUTCOMES.BLOCKED;
    }

    switch (sufficiency_state) {
        case 'SUFFICIENT':
            return DECISION_OUTCOMES.PROCEED;

        case 'STALE':
            // Evidence present but aging — proceed with staleness noted
            return DECISION_OUTCOMES.PROCEED_WITH_CONDITION;

        case 'UNCERTAIN':
            // Mandatory uncertain requirements require clarification; non-mandatory may proceed
            return has_blocking_gaps
                ? DECISION_OUTCOMES.REQUEST_INFORMATION
                : DECISION_OUTCOMES.PROCEED_WITH_CONDITION;

        case 'INSUFFICIENT':
            // Mandatory insufficient requirements block; non-mandatory allow conditional proceed
            return has_blocking_gaps
                ? DECISION_OUTCOMES.BLOCKED
                : DECISION_OUTCOMES.PROCEED_WITH_CONDITION;

        default:
            // Unknown sufficiency state — fail closed
            return DECISION_OUTCOMES.BLOCKED;
    }
}

// ── Decision ID generator ─────────────────────────────────────────────────────

function _decisionId() {
    return `KD-${crypto.randomBytes(6).toString('hex').toUpperCase()}`;
}

// ── Outcome reason builder (pure) ────────────────────────────────────────────

function _buildOutcomeReason(outcome, knowledge_context) {
    const state   = knowledge_context.sufficiency_state || 'UNKNOWN';
    const reasons = (knowledge_context.blocking_reasons || []).join('; ');

    switch (outcome) {
        case DECISION_OUTCOMES.PROCEED:
            return `Knowledge sufficient (${state}): all requirements satisfied`;

        case DECISION_OUTCOMES.PROCEED_WITH_CONDITION:
            return `Knowledge adequate but imperfect (${state}): no mandatory requirements blocked; action may proceed with awareness`;

        case DECISION_OUTCOMES.REQUEST_INFORMATION:
            return `Mandatory knowledge uncertain (${state}): ${reasons || 'mandatory requirements need clarification before proceeding'}`;

        case DECISION_OUTCOMES.BLOCKED:
            return `Knowledge insufficient to proceed (${state}): ${reasons || 'mandatory requirements unresolved or contradictory evidence detected'}`;

        default:
            return `Inconclusive outcome (${outcome}): state=${state}`;
    }
}

// ── Persist decision record (fail-soft) ──────────────────────────────────────

async function _persistDecisionRecord({
    decision_id, decision_context, action_type,
    outcome, outcome_reason, can_proceed,
    knowledge_context, requirements, assessed_by,
}) {
    try {
        const { error } = await _sb().from('knowledge_decision_records').insert({
            decision_id,
            decision_context: decision_context || null,
            action_type:      action_type      || null,
            outcome,
            outcome_reason:   outcome_reason   || null,
            can_proceed,
            sufficiency_state:  knowledge_context.sufficiency_state,
            has_blocking_gaps:  knowledge_context.has_blocking_gaps,
            blocking_gap_count: knowledge_context.blocking_gap_count || 0,
            blocking_reasons:   knowledge_context.blocking_reasons   || [],
            requirements:       requirements || [],
            knowledge_context,
            assessed_by,
        });
        if (error) {
            try {
                const logger = require('../logger');
                logger.warn('knowledge-decision', `_persistDecisionRecord failed: ${error.message}`);
            } catch (_) {}
        }
    } catch (_e) {
        // Never rethrow — an audit write failure MUST NOT silently convert BLOCKED to PROCEED
    }
}

// ── evaluateKnowledgeDecision ─────────────────────────────────────────────────

/**
 * evaluateKnowledgeDecision — Assess whether APEX has sufficient knowledge to
 * proceed with a consequential decision or action.
 *
 * CRITICAL: A PROCEED outcome does NOT grant constitutional permission.
 *           BLOCKED means the action MUST NOT proceed due to knowledge inadequacy.
 *           The caller is responsible for checking `can_proceed` before acting.
 *
 * Fails CLOSED: if the evaluation itself throws an exception, the returned
 * outcome is BLOCKED — a broken evaluator never silently permits an action.
 *
 * @param {Array<object>} requirements — knowledge requirement declarations
 *   Each: { required_subject, decision_context, blocks_decision?, urgency?, evidence_refs? }
 * @param {object} [decisionCtx]       — context about the decision being gated
 *   { decision_context, action_type }
 * @param {object} [opts]
 *   { assessed_by, requester }
 *
 * @returns {Promise<KgDecisionResult>}
 *   {
 *     decision_id:       string  — KD-{hex} audit reference
 *     outcome:           PROCEED | PROCEED_WITH_CONDITION | REQUEST_INFORMATION | BLOCKED
 *     can_proceed:       boolean — true when outcome is PROCEED or PROCEED_WITH_CONDITION
 *     sufficiency_state: string  — overall knowledge sufficiency state
 *     has_blocking_gaps: boolean
 *     blocking_reasons:  string[]
 *     outcome_reason:    string  — human-readable explanation
 *     knowledge_context: object  — full buildKnowledgeContext result
 *     assessed_at:       string  — ISO8601
 *   }
 */
async function evaluateKnowledgeDecision(requirements = [], decisionCtx = {}, opts = {}) {
    if (!Array.isArray(requirements)) {
        throw new Error('evaluateKnowledgeDecision: requirements must be an array');
    }

    const assessed_by = opts.assessed_by || 'system';
    const requester   = opts.requester   || assessed_by;

    // Lazy require — breaks any potential circular dependency at module load time
    const kc = require('./knowledge-context');

    // ── Empty requirements → PROCEED ─────────────────────────────────────────
    // No declared requirements = no knowledge blocks. Consistent with KG-04 invariant 6.
    if (requirements.length === 0) {
        const decision_id = _decisionId();
        const emptyCtx    = {
            requirements:          [],
            determinations:        [],
            requirements_assessed: 0,
            overall_sufficient:    true,
            has_blocking_gaps:     false,
            can_proceed:           true,
            sufficiency_state:     'SUFFICIENT',
            blocking_gap_count:    0,
            blocking_reasons:      [],
            assessed_at:           new Date().toISOString(),
        };
        const outcome_reason = 'No knowledge requirements declared; no blocks';
        await _persistDecisionRecord({
            decision_id,
            decision_context: decisionCtx.decision_context || null,
            action_type:      decisionCtx.action_type      || null,
            outcome:          DECISION_OUTCOMES.PROCEED,
            outcome_reason,
            can_proceed:      true,
            knowledge_context: emptyCtx,
            requirements:     [],
            assessed_by,
        });
        return {
            decision_id,
            outcome:           DECISION_OUTCOMES.PROCEED,
            can_proceed:       true,
            sufficiency_state: 'SUFFICIENT',
            has_blocking_gaps: false,
            blocking_reasons:  [],
            outcome_reason,
            knowledge_context: emptyCtx,
            assessed_at:       emptyCtx.assessed_at,
        };
    }

    // ── Evaluate sufficiency — fail closed on exception ───────────────────────
    let knowledge_context;
    try {
        knowledge_context = await kc.buildKnowledgeContext(requirements, {
            assessed_by,
            requester,
        });
    } catch (err) {
        // Fail closed: evaluator exception → BLOCKED
        const decision_id  = _decisionId();
        const failReason   = `Knowledge evaluation failed (fail-closed): ${err.message}`;
        const failCtx      = {
            requirements,
            determinations:        [],
            requirements_assessed: 0,
            overall_sufficient:    false,
            has_blocking_gaps:     true,
            can_proceed:           false,
            sufficiency_state:     'INSUFFICIENT',
            blocking_gap_count:    requirements.length,
            blocking_reasons:      [failReason],
            assessed_at:           new Date().toISOString(),
        };
        await _persistDecisionRecord({
            decision_id,
            decision_context: decisionCtx.decision_context || null,
            action_type:      decisionCtx.action_type      || null,
            outcome:          DECISION_OUTCOMES.BLOCKED,
            outcome_reason:   failReason,
            can_proceed:      false,
            knowledge_context: failCtx,
            requirements,
            assessed_by,
        });
        return {
            decision_id,
            outcome:           DECISION_OUTCOMES.BLOCKED,
            can_proceed:       false,
            sufficiency_state: 'INSUFFICIENT',
            has_blocking_gaps: true,
            blocking_reasons:  [failReason],
            outcome_reason:    failReason,
            knowledge_context: failCtx,
            assessed_at:       failCtx.assessed_at,
        };
    }

    // ── Map sufficiency → decision outcome ────────────────────────────────────
    const outcome      = _mapToDecisionOutcome(
        knowledge_context.sufficiency_state,
        knowledge_context.has_blocking_gaps
    );
    const can_proceed    = outcome === DECISION_OUTCOMES.PROCEED
                        || outcome === DECISION_OUTCOMES.PROCEED_WITH_CONDITION;
    const outcome_reason = _buildOutcomeReason(outcome, knowledge_context);
    const decision_id    = _decisionId();

    // ── Persist audit record (fail-soft) ─────────────────────────────────────
    await _persistDecisionRecord({
        decision_id,
        decision_context: decisionCtx.decision_context || null,
        action_type:      decisionCtx.action_type      || null,
        outcome,
        outcome_reason,
        can_proceed,
        knowledge_context,
        requirements,
        assessed_by,
    });

    return {
        decision_id,
        outcome,
        can_proceed,
        sufficiency_state: knowledge_context.sufficiency_state,
        has_blocking_gaps: knowledge_context.has_blocking_gaps,
        blocking_reasons:  knowledge_context.blocking_reasons || [],
        outcome_reason,
        knowledge_context,
        assessed_at:       knowledge_context.assessed_at,
    };
}

// ── Exports ───────────────────────────────────────────────────────────────────

module.exports = Object.freeze({
    evaluateKnowledgeDecision,
    DECISION_OUTCOMES,
    _mapToDecisionOutcome,
    _decisionId,
    _buildOutcomeReason,
});
