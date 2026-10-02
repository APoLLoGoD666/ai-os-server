'use strict';
// lib/civilization/rt16-bootstrap.js
// T4-03: AmendmentProposal + AmendmentRegistry Bootstrap (RT-16)
//
// Authority: A0-v1.1.1 §3.17 (RT-16 Amendment Runtime owned objects);
//            R16-v1.0-canonical.md RS-07 RS-08 RS-09 RS-10 RS-11;
//            D7-v1.0 Part 12 §12.1–§12.6 (Constitutional Amendment Architecture);
//            D7 §12.3 AP-1–AP-6; D7 §12.4 Stage 1–6; D7 §12.5 Classes I–IV;
//            RT16-INV-1 through RT16-INV-6;
//            WAVE-4-RECOMPUTED-EXECUTION-ROADMAP.md §8 (T4-03 definition);
//            T4-02-CERTIFICATION.md (T4-02 complete — CausalModel + AssumptionRegister bootstrapped)
//
// CONSTITUTIONAL LIMITATIONS:
// L-RT16-01: AmendmentProposal bootstrapped as placeholder; lifecycle_state=AP_VERIFICATION;
//             no actual constitution change at bootstrap; DELIBERATION, PRESERVATION_AUDIT,
//             AWAITING_AUTHORIZATION, and RATIFIED stages deferred until operational RT-04,
//             RT-11 deliberation on amendment, and founding-level human authorization exist.
//             NON-BLOCK.
// L-RT16-02: RT-04 Preservation Audit deferred; bootstrap AP cannot transition to
//             PRESERVATION_AUDIT state (RT16-INV-2 precondition: PreservationAuditRecord
//             from RT-04 required; RT-04 not yet operational as constitutional type).
//             NON-BLOCK.

const {
    AmendmentProposal,
    AmendmentRegistry,
} = require('../constitutional-types/amendment-proposal');
const constitutionalStore = require('../runtime/constitutional-store');

// Duplicate guard: one bootstrap per drId
const _emitted = new Set();

// ── ID generation ─────────────────────────────────────────────────────────────

function _generateApId(timestamp) {
    return `AP-RT16-BOOTSTRAP-v1-${timestamp}`;
}

function _generateAmregId(apId) {
    return `AMREG-${apId}`;
}

// ── BOOTSTRAP_AP_CLASS ────────────────────────────────────────────────────────
// CLASS_I: Operational amendment — no D-2 terminal commitment effect (D7 §12.5).
// RT16-INV-6: Class IV amendments (Terminal Modification) are constitutionally
//   inadmissible and immediately rejected without deliberation.
// Bootstrap AP is CLASS_I: procedural infrastructure initialization only.
const BOOTSTRAP_AP_CLASS = 'CLASS_I';

// ── formAmendmentBootstrap ────────────────────────────────────────────────────
//
// RT-16 Bootstrap: creates AmendmentProposal and AmendmentRegistry entry as the
// first instantiated RT-16 constitutional records. Establishes the constitutional
// amendment pathway without performing an actual constitution change (L-RT16-01).
//
// Sequence:
//   1. AmendmentProposal (AP) — lifecycle_state=AP_VERIFICATION; CLASS_I;
//      AP-1 through AP-6 satisfied with bootstrap content (RT16-INV-4);
//      RT-16 self-initiation FORBIDDEN (A1 §14.3); proposer is APEX founding authority.
//   2. AmendmentRegistry (AMREG) — tracks AP; rt16_inv5_no_silent_drop_attested=true
//      (RT16-INV-5: proposals never silently dropped).
//
// Returns { apId, amregId } on success, null on failure. Never throws.
// Duplicate guard: _emitted.add(guardKey) BEFORE constitutionalStore.write().
async function formAmendmentBootstrap({ drId, cmId } = {}) {
    try {
        const timestamp = new Date().toISOString();

        // Duplicate guard — one bootstrap AmendmentProposal per drId
        const guardKey = drId || `STANDALONE-${timestamp}`;
        if (_emitted.has(guardKey)) {
            console.warn(`[rt16-bootstrap] duplicate prevented — amendment bootstrap for ${guardKey} already formed`);
            return null;
        }
        _emitted.add(guardKey);

        const apId    = _generateApId(timestamp);
        const amregId = _generateAmregId(apId);

        // ── STEP 1: AmendmentProposal (L-RT16-01) ─────────────────────────────
        // Bootstrap pathway initialization — CLASS_I, lifecycle_state=AP_VERIFICATION.
        // All six AP requirements (AP-1 through AP-6, D7 §12.3) satisfied with
        // bootstrap content. RT16-INV-4: all six fields present and substantive.
        // RT16-INV-6: CLASS_I — no D-2 terminal commitment affected; immediate
        //   rejection path NOT triggered (D7 §12.1 Constitutional Continuity Principle upheld).
        // proposer_identity_ref: APEX constitutional founding authority (bootstrap;
        //   RT-01 ActorProfile not yet operational — identity documented by reference).
        const apRecord = AmendmentProposal.create({
            amendment_proposal_id:      apId,
            proposal_class:             BOOTSTRAP_AP_CLASS,  // CLASS_I — RT16-INV-6 safe
            lifecycle_state:            'AP_VERIFICATION',    // L-RT16-01: no ratification at bootstrap
            ap1_identification:
                `APEX-CONSTITUTION-v1.0 §3.17 RT-16 Amendment Runtime pathway; ` +
                `Wave 4 T4-03 bootstrap initialization; no specific provision amended at bootstrap; ` +
                `amendment_proposal_id: ${apId}; constitutional stack version: APEX-CONSTITUTION-v1.0.`,
            ap2_justification:
                `Wave 4 bootstrap requires RT-16 constitutional amendment pathway to be operationally ` +
                `instantiated as a constitutional record. No actual constitutional inadequacy triggers ` +
                `this proposal — it is a pathway bootstrap per T4-03 (L-RT16-01). ` +
                `Actual amendments require observed consequence divergence (RT-14 RTR → RT-11 → RT-16 ` +
                `via PAIR 59) followed by deliberation-grounded justification. ` +
                `Grounded in CausalModel ${cmId || 'CM-BOOTSTRAP-INITIAL'} (T4-02) and ` +
                `DeliberationRecord ${drId || 'DR-BOOTSTRAP-INITIAL'} (T3-12).`,
            ap3_preservation_assessment:
                `No D-2 terminal commitment is affected by this bootstrap pathway initialization. ` +
                `D-2 (Forbidden Assumption): civilization cannot govern its own evolution without ` +
                `human oversight — this commitment is terminal and fully preserved. ` +
                `This CLASS_I proposal modifies no constitutional text and introduces no new ` +
                `governance authority. RT16-INV-6 not triggered: no terminal commitment effect. ` +
                `D7 §12.1 Constitutional Continuity Principle: upheld.`,
            ap4_precedence_analysis:
                `A0-v1.1.1 §3.17: RT-16 Amendment Runtime is the constitutional seat for this ` +
                `bootstrap. R16-v1.0-canonical.md RS-07: AmendmentProposal production authorized. ` +
                `D7 Part 12 §12.3: AP-1 through AP-6 satisfied. PAIR 59: RT-11 → RT-16 is the ` +
                `authorized initiating channel (this bootstrap documents the pathway; full operational ` +
                `proposals will be received from RT-11 per PAIR 59). No precedence conflicts identified ` +
                `in D-series, A-series, or R-series constitutional stack.`,
            ap5_implementation_pathway:
                `Bootstrap instantiation only — no existing operations transition at bootstrap. ` +
                `Future operational amendments: AP lifecycle transitions through RS-11 state machine ` +
                `(PROPOSAL_RECEIVED → AP_VERIFICATION → DELIBERATION → PRESERVATION_AUDIT → ` +
                `AWAITING_AUTHORIZATION → RATIFIED) require: (1) RT-11 deliberation (RT16-INV-1), ` +
                `(2) RT-04 Preservation Audit PASS (RT16-INV-2; L-RT16-02 deferred), ` +
                `(3) founding-level human authorization (RT16-INV-3). ` +
                `D7 §12.4 Stage 6 Transition: affected runtimes notified upon ratification ` +
                `via RT-03 commitment (PAIR 61). L-RT16-01: full pathway deferred.`,
            ap6_reversibility_assessment:
                `CLASS_I reversible: no constitutional text modified at bootstrap. ` +
                `This bootstrap record does not alter any D-series, A-series, or R-series document. ` +
                `Operational amendment reversibility is assessed per-proposal at AP_VERIFICATION ` +
                `stage (RT16-INV-4). Class III (Foundational) and Class II (Structural) proposals ` +
                `carry heightened irreversibility requirements per AP-6 and D8 INV-1; CLASS_I ` +
                `bootstrap poses no irreversibility concern.`,
            proposer_identity_ref:      'APEX-CONSTITUTION-v1.0-FOUNDING-AUTHORITY-BOOTSTRAP',
            proposal_receipt_timestamp: timestamp,
        });
        apRecord.__wave               = 'W4-T4-03';
        apRecord.__structural_immutable = false;  // lifecycle-stateful (RS-11 state machine)
        await constitutionalStore.write(apRecord);

        // ── STEP 2: AmendmentRegistry (RT16-INV-5) ────────────────────────────
        // Tracks the bootstrap AP through its lifecycle.
        // rt16_inv5_no_silent_drop_attested=true: RT-16 constitutional attestation that
        //   this AmendmentProposal will not be silently dropped — it will progress to a
        //   terminal state (RATIFIED, REJECTED, or CLASS_IV_REJECTED) with an explicit record.
        // tracked_proposal_state=AP_VERIFICATION: mirrors AP lifecycle_state (STEP 1).
        const amregRecord = AmendmentRegistry.create({
            registry_entry_id:                 amregId,
            amendment_proposal_ref:            apId,
            tracked_proposal_state:            'AP_VERIFICATION',  // mirrors AP lifecycle_state
            state_last_updated:                timestamp,
            rt16_inv5_no_silent_drop_attested: true,               // RT16-INV-5 attestation
        });
        amregRecord.__wave               = 'W4-T4-03';
        amregRecord.__structural_immutable = false;  // state-updated as AP progresses
        await constitutionalStore.write(amregRecord);

        return { apId, amregId };
    } catch (err) {
        console.error('[rt16-bootstrap] formAmendmentBootstrap failed:', err?.message);
        return null;
    }
}

module.exports = Object.freeze({
    formAmendmentBootstrap,
    _generateApId,
    _generateAmregId,
    _emitted,
    BOOTSTRAP_AP_CLASS,
});
