'use strict';
// lib/civilization/rt13-bootstrap.js
// T3-15: ActionProjection + EffectExpectationRecord Bootstrap (RT-13)
//
// Authority: A0-v1.1.1 §3.14 (RT-13 Owned Objects: ActionProjection,
//            EffectExpectationRecord, IrreversibilityClassificationRecord,
//            ProjectionResponsibilityRecord, ProjectionBoundaryCrossingRecord);
//            R13-v1.0-canonical.md RS-07 RS-08 RS-09 RS-10 RS-11;
//            D5-v1.0-canonical.md §4.2 (seven-stage APL) PI-2 PI-8 PI-11;
//            D8-v1.0 INV-1 INV-2 INV-5 PROH-3 PROH-4 PROH-5 IC-3;
//            RT13-INV-1 through RT13-INV-7;
//            IDR-W2-05-001 (blockers 1/2/3 all resolved — T3-13 + T3-15);
//            T3-15-ACTION-PROJECTION-PHASE-0-AUDIT.md (AUTHORIZED 2026-08-04)
//
// CONSTITUTIONAL LIMITATIONS:
// L-RT13-01: RT-13 full pipeline operationalization deferred; bootstrap ActionProjection
//             formed via schema validation only at CIVILIZATIONAL_ACTION stage. NON-BLOCK.
// L-RT13-02: authority_resolution_ref bootstrapped — AUTH-RT13-BOOTSTRAP-v1-${timestamp};
//             RT-02 full Projection Authority verification deferred. NON-BLOCK.
// L-RT13-03: effect_observation_window bootstrapped — observation window documented as
//             bootstrap placeholder pending RT-14 operationalization. NON-BLOCK.
// L-RT13-04: ProjectionResponsibilityRecord formation deferred — RT13-INV-4 not triggered
//             at bootstrap (Stage 4 EXTERNAL_ACTION_PROJECTION not crossed; AP halted at
//             CIVILIZATIONAL_ACTION). PRR.projection_boundary_crossing_ref is REQUIRED;
//             no PBCR exists at bootstrap; fabrication prohibited (D8 PROH-4).
//             PRR formation pending first actual Projection Boundary crossing. NON-BLOCK.
// L-RT13-05: AP lifecycle progression (DECISION_RECEIPT → CIVILIZATIONAL_ACTION) written
//             as successive constitutional_records INSERTs (same pattern as L-RT12-04). NON-BLOCK.
// L-RT13-06: ProjectionBoundaryCrossingRecord not formed at bootstrap; no actual Stage 4
//             crossing has occurred; D5 PI-2 and RT13-INV-6 prohibit conflating Reality Fabric
//             writes with Projection Boundary crossings into external reality. NON-BLOCK.

const {
    ActionProjection,
    EffectExpectationRecord,
    IrreversibilityClassificationRecord,
} = require('../constitutional-types/effect-expectation-record');
const constitutionalStore = require('../runtime/constitutional-store');

// Duplicate guard: one apId per formActionProjection() call
const _emitted = new Set();

// ── ID generation — pre-assigned from same timestamp (F-04 resolution pattern) ──
// apId, eerId, icrId pre-assigned before any record created to break circular refs.

function _generateApId(timestamp) {
    return `AP-BOOTSTRAP-v1-${timestamp}`;
}

function _generateEerId(apId) {
    return `EER-${apId}`;
}

function _generateIcrId(apId) {
    return `ICR-${apId}`;
}

// L-RT13-02: bootstrap Projection Authority resolution reference
function _generateAuthResRef(timestamp) {
    return `AUTH-RT13-BOOTSTRAP-v1-${timestamp}`;
}

// Bootstrap domain — primary domain for APEX AI OS constitutional initialization
const BOOTSTRAP_DOMAIN = 'APEX-AI-OS-BOOTSTRAP';

// ── formActionProjection ──────────────────────────────────────────────────────
//
// RT-13 Bootstrap: receives CivilizationalDecision data from rt12-bootstrap.js
// after Decision written at AUTHORIZED state (T3-13). Forms pre-Stage-4 RT-13
// objects: ActionProjection, IrreversibilityClassificationRecord, EffectExpectationRecord.
//
// IDR-W2-05-001 Resolution:
//   Blocker 1 (wrong wiring file): resolved — wiring at rt12-bootstrap.js,
//                                  not execution-evaluator.js
//   Blocker 2 (no CivilizationalDecision): resolved — T3-13 decisionId available
//   Blocker 3 (EER honesty post-execution): resolved — formed BEFORE Stage 4 crossing;
//             pre-crossing context from DR/CDP/CUM is honest (D5 PI-7)
//
// Sequence:
//   1. AP → DECISION_RECEIPT (initial formation, L-RT13-05)
//   2. IrreversibilityClassificationRecord (RT13-INV-1 pre-Stage-4)
//   3. EffectExpectationRecord (RT13-INV-2 pre-Stage-4)
//   4. AP → CIVILIZATIONAL_ACTION with ICR + EER refs (successive INSERT, L-RT13-05)
//   5. PRR NOT formed (L-RT13-04: Stage 4 not crossed; RT13-INV-4 not triggered)
//   6. PBCR NOT formed (L-RT13-06: no actual Stage 4 crossing; D5 PI-2 prohibits conflation)
//
// Returns { apId } on success, null on failure. Never throws.
// Duplicate guard: _emitted.add(apId) BEFORE constitutionalStore.write().
async function formActionProjection({ decisionId, drId, cumVersionRef }) {
    try {
        const timestamp  = new Date().toISOString();
        const apId       = _generateApId(timestamp);
        const eerId      = _generateEerId(apId);
        const icrId      = _generateIcrId(apId);
        const authResRef = _generateAuthResRef(timestamp);

        // Duplicate guard — added before first write per fire-and-forget semantics
        if (_emitted.has(apId)) {
            console.warn(`[rt13-bootstrap] duplicate prevented — ${apId} already emitted`);
            return { apId };
        }
        _emitted.add(apId);

        // ── STEP 1: AP → DECISION_RECEIPT (initial formation, L-RT13-05) ─────
        // Stage 1: authorized CivilizationalDecision received from RT-12 (A0 §3.14 R1).
        // D8 INV-1: decision_ref traces to T3-13 decisionId — IDR-W2-05-001 Blocker 2 resolved.
        // is_cross_domain = false: single domain; RT13-INV-7 scope check satisfied.
        const apDecisionReceipt = ActionProjection.create({
            action_projection_id: apId,
            decision_ref:         decisionId,    // T3-13 decisionId — D8 INV-1
            lifecycle_stage:      'DECISION_RECEIPT',
            domain:               BOOTSTRAP_DOMAIN,
            formation_timestamp:  timestamp,
            is_cross_domain:      false,
            authority_resolution_ref: authResRef, // L-RT13-02
        });
        apDecisionReceipt.__wave               = 'W3-T3-15';
        apDecisionReceipt.__structural_immutable = false;
        await constitutionalStore.write(apDecisionReceipt);

        // ── STEP 2: IrreversibilityClassificationRecord (RT13-INV-1) ─────────
        // Must be formed BEFORE Stage 4 (D5 PI-8; RT13-INV-1). Classification is
        // constitutional and non-deferred. REVERSIBLE: T3-13 CivilizationalDecision
        // classified REVERSIBLE; bootstrap writes are within the Reality Fabric only.
        const icrRecord = IrreversibilityClassificationRecord.create({
            icr_id:                       icrId,
            action_projection_ref:        apId,
            reversibility_classification: 'REVERSIBLE',
            classification_basis:
                `Bootstrap CivilizationalDecision (${decisionId}) classified REVERSIBLE ` +
                `(T3-13: CivilizationalDecision.irreversibility_classification = REVERSIBLE). ` +
                `Bootstrap constitutional pipeline initialization produces constitutional_records ` +
                `writes within the governed Reality Fabric — no irreversible external commitments. ` +
                `D5 PI-8: classification is constitutional and non-deferred. ` +
                `RT13-INV-1: ICR formed before Stage 4 crossing (AP at DECISION_RECEIPT).`,
            classification_timestamp:     timestamp,
        });
        icrRecord.__wave               = 'W3-T3-15';
        icrRecord.__structural_immutable = true; // D8 PROH-5; D5 PI-8
        await constitutionalStore.write(icrRecord);

        // ── STEP 3: EffectExpectationRecord (RT13-INV-2) ─────────────────────
        // Must be registered BEFORE Stage 4 (RT13-INV-2). IDR-W2-05-001 Blocker 3
        // resolved: EER formed at decision formation time — BEFORE Stage 4 crossing.
        // Context is from DR/CDP/CUM at authorization; this is pre-crossing, honest.
        // D5 PI-7: reality is truth; this records pre-crossing expectations only.
        // L-RT13-03: effect_observation_window bootstrapped pending RT-14 operationalization.
        const eerRecord = EffectExpectationRecord.create({
            eer_id:               eerId,
            action_projection_ref: apId,
            expected_effects_description:
                `Bootstrap constitutional pipeline initialization for APEX AI OS. ` +
                `Expected effects from CivilizationalDecision ${decisionId}: ` +
                `(1) CivilizationUnderstandingModel ${cumVersionRef} admitted to ` +
                `constitutional_records at CURRENT lifecycle state; ` +
                `(2) DeliberationRecord ${drId} present, referencing authorized CUM; ` +
                `(3) CivilizationalDecision ${decisionId} written at AUTHORIZED lifecycle state; ` +
                `(4) RT-13 ActionProjection pipeline constitutionally initialized at ` +
                `CIVILIZATIONAL_ACTION stage, pre-Stage-4 invariants satisfied. ` +
                `No external Projection Boundary crossing expected at bootstrap level ` +
                `(L-RT13-06: PBCR constitutionally unjustified). ` +
                `RT13-INV-2: EER formed before Stage 4 crossing.`,
            effect_observation_window:
                `BOOTSTRAP-OBSERVATION-WINDOW-RT13-v1: L-RT13-03: RT-14 not yet operational. ` +
                `Observation window activates on first operational RT-14 feedback cycle. ` +
                `D8 INV-6 (Feedback Requirement) anchored here per VC-9 bootstrap pattern ` +
                `(T3-12 review_requirement Element 13). ` +
                `RT14-INV-1 deferred pending RT-14 operationalization.`,
            formation_timestamp:  timestamp,
        });
        eerRecord.__wave               = 'W3-T3-15';
        eerRecord.__structural_immutable = true; // D5 PI-7: immutable after formation
        await constitutionalStore.write(eerRecord);

        // ── STEP 4: AP → CIVILIZATIONAL_ACTION (successive INSERT, L-RT13-05) ─
        // RT13-INV-1 satisfied: ICR formed (Step 2).
        // RT13-INV-2 satisfied: EER formed (Step 3).
        // RT13-INV-3 not triggered: Stage 4 not crossed at bootstrap (L-RT13-01).
        // AP constitutionally halted at CIVILIZATIONAL_ACTION pending first full
        // Stage 4 authorization with operational RT-03 six-gate processing.
        const apCivilizationalAction = ActionProjection.create({
            action_projection_id:              apId,
            decision_ref:                      decisionId,
            lifecycle_stage:                   'CIVILIZATIONAL_ACTION',
            domain:                            BOOTSTRAP_DOMAIN,
            formation_timestamp:               timestamp,
            is_cross_domain:                   false,
            authority_resolution_ref:          authResRef,   // L-RT13-02
            irreversibility_classification_ref: icrId,       // RT13-INV-1 satisfied
            effect_expectation_ref:            eerId,        // RT13-INV-2 satisfied
        });
        apCivilizationalAction.__wave               = 'W3-T3-15';
        apCivilizationalAction.__structural_immutable = false;
        await constitutionalStore.write(apCivilizationalAction);

        // STEP 5: PRR NOT formed (L-RT13-04)
        // ProjectionResponsibilityRecord.projection_boundary_crossing_ref is REQUIRED.
        // No ProjectionBoundaryCrossingRecord at bootstrap (L-RT13-06).
        // RT13-INV-4 not yet triggered — Stage 4 not crossed.
        // PRR formation deferred pending first actual Projection Boundary crossing.

        // STEP 6: PBCR NOT formed (L-RT13-06)
        // D5 PI-2 and RT13-INV-6: AP is never the external effect.
        // Bootstrap writes are within the governed Reality Fabric, not crossings
        // into external reality. Constitutionally unjustified at bootstrap level.

        return { apId };
    } catch (err) {
        console.error('[rt13-bootstrap] formActionProjection failed:', err?.message);
        return null;
    }
}

module.exports = Object.freeze({
    formActionProjection,
    _generateApId,
    _generateEerId,
    _generateIcrId,
    _generateAuthResRef,
    _emitted,
    BOOTSTRAP_DOMAIN,
});
