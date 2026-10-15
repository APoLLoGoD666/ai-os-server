'use strict';
// lib/civilization/rt11-bootstrap.js
// T4-02: CausalModel + AssumptionRegister Bootstrap (RT-11)
//
// Authority: A0-v1.1.1 §3.12 R8 (CausalModel + AssumptionRegister owned by RT-11);
//            R11-v1.3-canonical.md RS-07 RS-05 R8;
//            D-7-v1.0 Part 8 (Theory of Change: TOC-3 TOC-4 TOC-5);
//            WAVE-4-RECOMPUTED-EXECUTION-ROADMAP.md §8 (T4-02 definition);
//            T4-01-CERTIFICATION.md (T4-01 complete — RTR with rt11_triggered=true issued)
//
// CONSTITUTIONAL LIMITATIONS:
// L-RT11-01: CausalModel bootstrapped without operational deliberation-grounded causal
//             analysis; causal_chain_description documents bootstrap priors only; full
//             causal chain requires operational RT-11 synthesis with deliberation evidence.
//             NON-BLOCK.
// L-RT11-02: AssumptionRegister assumptions list contains bootstrap-level priors only;
//             full assumption set requires operational TheoryOfChange deliberation participant
//             (gap documented in deliberation-registry.js line 74 — 'No CausalModel
//             registered yet; Theory of Change pending extension'). NON-BLOCK.
// L-RT11-03: TOC-4 (CausalModel revision) and TOC-5 (AssumptionRegister revision) deferred;
//             initial lifecycle_state=REGISTERED (not yet CURRENT); will transition to
//             CURRENT on first operational deliberation with real causal analysis. NON-BLOCK.
// L-RT11-04: ReflectionTriggerRecord (RT14-INV-5; T4-01) is the constitutional trigger for
//             CausalModel updates (PAIR 42: RT-14 → RT-11); bootstrap CausalModel initialized
//             without triggering RTR — RTR-triggered TOC-4 updates deferred to operational
//             RT-14 reflection cycle. NON-BLOCK.
// L-RT11-05: deliberation-registry.js CausalModel-BOOTSTRAP placeholder resolved when
//             formCausalModel() returns cm_id; BOOTSTRAP status replaced by ACTIVE when
//             cm_id available (T4-02 wiring). NON-BLOCK.

const {
    CausalModel,
    AssumptionRegister,
} = require('../constitutional-types/civilizational-decision-proposal');
const constitutionalStore = require('../runtime/constitutional-store');

// Duplicate guard: one bootstrap per drId
const _emitted = new Set();

// ── ID generation ─────────────────────────────────────────────────────────────
// Both arId and cmId pre-assigned from same timestamp (F-04 resolution pattern):
// CausalModel.assumption_register_ref needs arId before CM created;
// AssumptionRegister.causal_model_ref needs cmId before AR created.

function _generateArId(timestamp) {
    return `AR-RT11-BOOTSTRAP-v1-${timestamp}`;
}

function _generateCmId(timestamp) {
    return `CM-RT11-BOOTSTRAP-v1-${timestamp}`;
}

// ── Bootstrap assumptions ──────────────────────────────────────────────────────
// L-RT11-02: bootstrap-level priors only; full set requires operational TheoryOfChange.
const BOOTSTRAP_ASSUMPTIONS = Object.freeze([
    {
        assumption_id:    'BOOT-ASM-01',
        description:      'CivilizationUnderstandingModel (CUM) synthesis produces actionable epistemic state for deliberation grounding',
        basis:            'T3-11C CUM bootstrap certified; RT-09 KnowledgeClaims available via constitutional_records',
        revision_trigger: 'First observed consequence divergence via RT-14 reflect() (RT14-INV-2)',
    },
    {
        assumption_id:    'BOOT-ASM-02',
        description:      'Bootstrap CivilizationalDecision (T3-13) is constitutionally sound given current evidence pipeline limitations',
        basis:            'L-DR-04 registered; alternatives evaluated (T3-12 deliberation); bootstrap initiation selected over deferral',
        revision_trigger: 'Operational KnowledgeClaims admitted to constitutional_records',
    },
    {
        assumption_id:    'BOOT-ASM-03',
        description:      'ActionProjection halted at CIVILIZATIONAL_ACTION (T3-15) represents valid pre-Stage-4 causal pathway',
        basis:            'L-RT13-01 through L-RT13-06 documented; Stage 4 crossing deferred pending RT-02 + RT-03 operationalization',
        revision_trigger: 'First actual Stage 4 crossing produces ProjectionBoundaryCrossingRecord',
    },
]);

// ── formCausalModel ───────────────────────────────────────────────────────────
//
// RT-11 Bootstrap: creates CausalModel and AssumptionRegister as the first
// instantiated RT-11 constitutional records. Resolves deliberation-registry.js
// CausalModel-BOOTSTRAP placeholder.
//
// Sequence (F-04 circular reference resolution: arId and cmId pre-assigned):
//   1. AssumptionRegister (AR) — causal_model_ref forward-references pre-assigned cmId
//   2. CausalModel (CM) — assumption_register_ref references arId from STEP 1
//
// Returns { cmId, arId } on success, null on failure. Never throws.
// Duplicate guard: _emitted.add(drId) BEFORE constitutionalStore.write().
async function formCausalModel({ drId, cumVersionRef } = {}) {
    try {
        const timestamp = new Date().toISOString();

        // Duplicate guard — one bootstrap CausalModel per drId
        const guardKey = drId || `STANDALONE-${timestamp}`;
        if (_emitted.has(guardKey)) {
            console.warn(`[rt11-bootstrap] duplicate prevented — causal model for ${guardKey} already formed`);
            return null;
        }
        _emitted.add(guardKey);

        // F-04 resolution: pre-assign both IDs before either record is created
        const arId = _generateArId(timestamp);
        const cmId = _generateCmId(timestamp);

        // ── STEP 1: AssumptionRegister (L-RT11-02) ────────────────────────────
        // Initialized with bootstrap priors (BOOT-ASM-01 through BOOT-ASM-03).
        // causal_model_ref forward-references cmId (pre-assigned; CM created in STEP 2).
        // lifecycle_state=ACTIVE: assumption set is current (TOC-5 revisions deferred, L-RT11-03).
        const arRecord = AssumptionRegister.create({
            ar_id:                  arId,
            causal_model_ref:       cmId,              // forward ref — F-04 resolution
            assumptions:            Array.from(BOOTSTRAP_ASSUMPTIONS),
            registration_timestamp: timestamp,
            lifecycle_state:        'ACTIVE',          // initial; TOC-5 deferred (L-RT11-03)
        });
        arRecord.__wave               = 'W4-T4-02';
        arRecord.__structural_immutable = false;       // AR revised by TOC-4/TOC-5 (A0 §3.12 R8)
        await constitutionalStore.write(arRecord);

        // ── STEP 2: CausalModel (L-RT11-01) ───────────────────────────────────
        // Bootstrapped with civilization-level priors (L-RT11-01).
        // assumption_register_ref references arId from STEP 1.
        // scope_classification='civilizational': RS-35 PROH-R8 (no sub-civilizational CM).
        // lifecycle_state=REGISTERED: not yet operational (TOC-3 transition deferred, L-RT11-03).
        const causalChain =
            `Bootstrap causal model for APEX AI OS constitutional operation. ` +
            `Wave 3 causal pathway: CivilizationUnderstandingModel synthesis (RT-10) → ` +
            `DeliberationRecord (RT-11) → CivilizationalDecisionProposal (RT-11) → ` +
            `CivilizationalDecision (RT-12, AUTHORIZED) → ActionProjection (RT-13, ` +
            `CIVILIZATIONAL_ACTION) → EffectExpectationRecord (RT-13, pre-Stage-4). ` +
            `RT-14 Reflection Runtime now operational (T4-01); constitutional loop ` +
            `closure pathway: Stage 4 → COR (RT-08) → reflect() → OCR + RTR + OAR-TSR. ` +
            `TOC-3 comparison (RT-14) triggers TOC-4/TOC-5 revision of this model ` +
            `when first ObservedConsequenceRecord with divergence_detected=true is formed. ` +
            `Grounded in DR ${drId || 'DR-BOOTSTRAP-INITIAL'} (T3-12) and CUM ${cumVersionRef || 'CURRENT'} (T3-11C). ` +
            `L-RT11-01: bootstrap priors only; full causal analysis deferred to operational RT-11.`;

        const cmRecord = CausalModel.create({
            cm_id:                  cmId,
            causal_chain_description: causalChain,
            assumption_register_ref: arId,             // STEP 1 AR
            scope_classification:   'civilizational', // RS-35 PROH-R8
            registration_timestamp: timestamp,
            lifecycle_state:        'REGISTERED',      // initial; TOC-3 → CURRENT (L-RT11-03)
        });
        cmRecord.__wave               = 'W4-T4-02';
        cmRecord.__structural_immutable = false;       // CM revised by TOC-4/TOC-5
        await constitutionalStore.write(cmRecord);

        return { cmId, arId };
    } catch (err) {
        console.error('[rt11-bootstrap] formCausalModel failed:', err?.message);
        return null;
    }
}

module.exports = Object.freeze({
    formCausalModel,
    _generateArId,
    _generateCmId,
    _emitted,
    BOOTSTRAP_ASSUMPTIONS,
});
