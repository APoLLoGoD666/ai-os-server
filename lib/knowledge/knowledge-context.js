'use strict';
// lib/knowledge/knowledge-context.js — KG-04 Knowledge Sufficiency Context
//
// Assembles a structured knowledge_context object for consumption by
// downstream reasoning and decision systems.
//
// Called from lib/memory/gateway.js:getContext() when knowledge requirements
// are declared, and from explicit callers before taking knowledge-dependent actions.
//
// ARCHITECTURE:
//   Callers supply knowledge requirements (what must be known before acting).
//   This module assesses them via the canonical KG engine and returns a
//   structured sufficiency context that includes:
//     - sufficiency_state  (SUFFICIENT | UNCERTAIN | INSUFFICIENT | STALE | CONTRADICTORY)
//     - can_proceed        (false when mandatory requirements are unresolved)
//     - per-requirement determinations with evidence traceability
//
// OWNED BY: lib/knowledge/knowledge-gap-engine.js (re-exported through canonical surface)
// DO NOT require this file directly — use kge.buildKnowledgeContext()
//
// INVARIANTS:
//   1. Caller cannot fabricate sufficiency — all assessments go through canonical evaluator
//   2. CONTRADICTORY is the highest-severity state — always propagates
//   3. Mandatory requirement (blocks_decision=true) that is not SATISFIED → can_proceed=false
//   4. UNCERTAIN does NOT auto-convert to SATISFIED
//   5. STALE evidence does NOT block (KG-02 semantic: SATISFIED with staleness warning)
//   6. Empty requirements → SUFFICIENT, can_proceed=true (no declared requirements = no blocks)
//   7. KNOWLEDGE ≠ GOVERNANCE: sufficiency does not grant execution authority — a separate permission layer handles that

// ── Sufficiency state priority (worst wins across all requirements) ─────────────
// Lower rank = worse state. CONTRADICTORY is worst; SUFFICIENT is best.
const SUFFICIENCY_PRIORITY = Object.freeze({
    CONTRADICTORY: 0,
    INSUFFICIENT:  1,
    STALE:         2,
    UNCERTAIN:     3,
    SUFFICIENT:    4,
});

// ── Map lifecycle determinations → sufficiency states ─────────────────────────
const DETERMINATION_TO_SUFFICIENCY = Object.freeze({
    'SATISFIED':      'SUFFICIENT',
    'GAP':            'INSUFFICIENT',
    'UNCERTAIN':      'UNCERTAIN',
    'INSUFFICIENT':   'INSUFFICIENT',
    'CONFLICTING':    'CONTRADICTORY',
    'STALE_EVIDENCE': 'STALE',
});

// ── buildKnowledgeContext ─────────────────────────────────────────────────────

/**
 * buildKnowledgeContext — Assess a list of knowledge requirements and return
 * a structured sufficiency context.
 *
 * Each requirement declares what the system must know before acting and how
 * critical that knowledge is. This function:
 *   1. Runs canonical assessKnowledgeRequirements() from KG-02/03
 *   2. Maps each determination to a sufficiency state
 *   3. Computes the overall worst-case state
 *   4. Returns can_proceed=false when mandatory requirements are unresolved
 *
 * @param {Array<object>} requirements — knowledge requirement declarations
 * @param {string}  requirements[].required_subject  — what information is needed
 * @param {string}  requirements[].decision_context  — why it is needed
 * @param {boolean} [requirements[].blocks_decision] — whether unresolved = block
 * @param {string}  [requirements[].urgency]         — IMMEDIATE|SOON|EVENTUAL
 * @param {string[]}[requirements[].evidence_refs]   — canonical refs for KG-03 evaluation
 *
 * @param {object} [opts]
 * @param {string} [opts.assessed_by]  — who is requesting assessment (for audit)
 * @param {string} [opts.requester]    — requester identity
 *
 * @returns {Promise<KnowledgeContext>}
 */
async function buildKnowledgeContext(requirements = [], opts = {}) {
    // No requirements declared → no blocks; proceed subject to the authority layer above
    if (!Array.isArray(requirements) || requirements.length === 0) {
        return {
            requirements:       [],
            determinations:     [],
            requirements_assessed: 0,
            overall_sufficient: true,
            has_blocking_gaps:  false,
            can_proceed:        true,
            sufficiency_state:  'SUFFICIENT',
            blocking_gap_count: 0,
            blocking_reasons:   [],
            assessed_at:        new Date().toISOString(),
        };
    }

    // Validate inputs: each requirement must have required_subject and decision_context
    for (let i = 0; i < requirements.length; i++) {
        const r = requirements[i];
        if (!r || typeof r !== 'object') {
            throw new Error(`buildKnowledgeContext: requirements[${i}] must be an object`);
        }
        if (!r.required_subject) {
            throw new Error(`buildKnowledgeContext: requirements[${i}].required_subject is required`);
        }
        if (!r.decision_context) {
            throw new Error(`buildKnowledgeContext: requirements[${i}].decision_context is required`);
        }
    }

    // Lazy require to avoid module-load circular dependency
    const kge = require('./knowledge-gap-engine');
    const result = await kge.assessKnowledgeRequirements(requirements, {
        assessed_by: opts.assessed_by || 'system',
        requester:   opts.requester   || 'system',
    });

    // Zip determinations with original requirements — same order guaranteed by assessKnowledgeRequirements.
    // Fix KG-02 bug: has_blocking_gaps in assessKnowledgeRequirements wrongly compared
    // requirement_id (KR-*) with required_subject (text). We correct this here.
    const determinations = result.determinations.map((det, i) => {
        const req = requirements[i] || {};
        const sufficiency_state = DETERMINATION_TO_SUFFICIENCY[det.determination] || 'INSUFFICIENT';
        return {
            requirement_id:  det.requirement_id,
            required_subject: req.required_subject || null,
            decision_context: req.decision_context || null,
            blocks_decision:  req.blocks_decision  || false,
            urgency:          req.urgency          || 'EVENTUAL',
            status:           det.status,
            determination:    det.determination,
            gap_id:           det.gap_id           || null,
            assessment_id:    det.assessment_id    || null,
            sufficiency_state,
        };
    });

    // Overall sufficiency: worst state across all requirements wins
    let worst = 'SUFFICIENT';
    for (const d of determinations) {
        const rank = SUFFICIENCY_PRIORITY[d.sufficiency_state] ?? 4;
        if (rank < (SUFFICIENCY_PRIORITY[worst] ?? 4)) {
            worst = d.sufficiency_state;
        }
    }

    // Blocking gaps: mandatory requirements (blocks_decision=true) that are not SATISFIED
    const blockingDets = determinations.filter(
        d => d.blocks_decision && d.determination !== 'SATISFIED'
    );
    const has_blocking_gaps  = blockingDets.length > 0;
    const can_proceed        = !has_blocking_gaps;

    return {
        requirements,
        determinations,
        requirements_assessed: result.requirements_assessed,
        overall_sufficient:    result.overall_sufficient,
        has_blocking_gaps,
        can_proceed,
        sufficiency_state:     worst,
        blocking_gap_count:    blockingDets.length,
        blocking_reasons:      blockingDets.map(d =>
            `[${d.urgency}] '${d.required_subject}': ${d.determination} — mandatory knowledge unresolved`
        ),
        assessed_at: new Date().toISOString(),
    };
}

// ── Exports ───────────────────────────────────────────────────────────────────

module.exports = Object.freeze({
    buildKnowledgeContext,
    DETERMINATION_TO_SUFFICIENCY,
    SUFFICIENCY_PRIORITY,
});
