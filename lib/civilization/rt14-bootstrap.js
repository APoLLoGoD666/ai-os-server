'use strict';
// lib/civilization/rt14-bootstrap.js
// T4-01: Reflection Runtime Bootstrap (RT-14)
//
// Authority: A0-v1.1.1 §3.15 (RT-14 Owned Objects: ObservedConsequenceRecord,
//            CausalModelDivergenceRecord, OpenActionRegisterTerminalStatusRecord,
//            ReflectionTriggerRecord);
//            R14-v1.0-canonical.md RS-07 RS-09 RS-11;
//            D5-v1.0-canonical.md Part 8 (Reality Feedback Loop) PI-7 PI-12;
//            D7-v1.0-canonical.md Part 8 (TOC-3 TOC-4 TOC-5);
//            D8-v1.0 INV-6 CLI-2 CLI-3 PROH-5 TI-2 TI-5;
//            RT14-INV-1 through RT14-INV-6; RT12-INV-5;
//            T4-INV-DECISION-RECORD.md (AUTHORIZED 2026-08-20)
//
// CONSTITUTIONAL LIMITATIONS:
// L-RT14-01: RT-09 Knowledge State trigger — deferred; ReflectionTriggerRecord written
//             with rt09_triggered=true as bootstrap attestation; actual RT-09 notification
//             deferred pending RT-09 operationalization. NON-BLOCK.
// L-RT14-02: RT-11 CUM revision trigger — deferred; ReflectionTriggerRecord written
//             with rt11_triggered=true as bootstrap attestation; actual RT-11 notification
//             deferred pending RT-11 operationalization. NON-BLOCK.
// L-RT14-03: RT-15 domain update trigger — deferred; rt15_triggered absent at bootstrap;
//             RT-15 instances not yet operational (T4-01 scope boundary). NON-BLOCK.
// L-RT14-04: RT-03 gate processing before fabric admission — deferred; constitutional-
//             store.write() is bootstrap equivalent (same pattern as L-RT12-05,
//             L-RT13-04). NON-BLOCK.
// L-RT14-05: terminal_state determination — bootstrapped from COR.divergence_flag:
//             false → COMPLETE (expected effects realized), true → PARTIAL (divergence
//             detected); FAILED/LOST require operational escalation systems (D5 §8.4
//             BFP-1–4; effect observation window expiry). NON-BLOCK.
// L-RT14-06: divergence_magnitude — MODERATE default at bootstrap; full magnitude
//             assessment (MINOR/SIGNIFICANT/CRITICAL) requires operational RT-11 causal
//             model comparison unavailable at bootstrap level. NON-BLOCK.

const {
    ObservedConsequenceRecord,
    CausalModelDivergenceRecord,
    OpenActionRegisterTerminalStatusRecord,
    ReflectionTriggerRecord,
} = require('../constitutional-types/observed-consequence-record');
const constitutionalStore = require('../runtime/constitutional-store');

// Duplicate guard: one reflection per COR (RT14-INV-1: one OCR per Projection Boundary crossing)
const _emitted = new Set();

// ── ID generation ─────────────────────────────────────────────────────────────

function _generateOcrId(timestamp) {
    return `OCR-RT14-BOOTSTRAP-v1-${timestamp}`;
}

function _generateCmdrId(ocrId) {
    return `CMDR-${ocrId}`;
}

function _generateOarTsrId(oarEntryId, timestamp) {
    return `OARTSR-${oarEntryId}-${timestamp}`;
}

function _generateRtrId(ocrId) {
    return `RTR-${ocrId}`;
}

// ── reflect ───────────────────────────────────────────────────────────────────
//
// RT-14 Bootstrap: receives COR (RT-08 owned) + EER (RT-13 owned) after consequence
// observation. Produces all 4 RT-14 owned objects.
//
// Inputs:
//   cor        — ConsequenceObservationRecord (RT-08 owned)
//   eer        — EffectExpectationRecord (RT-13 owned)
//   oarEntryId — string: OAR entry to close (RT-12 owned; RT12-INV-5)
//
// Sequence (RT14-INV-4 enforces OCR-first order):
//   1. ObservedConsequenceRecord (OCR) — primary output; COR vs EER comparison
//   2. OpenActionRegisterTerminalStatusRecord (OAR-TSR) — closes OAR after OCR
//   3. ReflectionTriggerRecord (RTR) — MANDATORY AND UNCONDITIONAL (RT14-INV-5)
//   4. CausalModelDivergenceRecord (CMDR) — only if divergence_detected (RT14-INV-2)
//
// Returns { ocrId, oarTsrId, rtrId, cmdrId? } on success, null on failure. Never throws.
// Duplicate guard: _emitted.add(cor.record_id) BEFORE constitutionalStore.write().
async function reflect({ cor, eer, oarEntryId }) {
    try {
        const timestamp = new Date().toISOString();

        // Duplicate guard — RT14-INV-1: one OCR per COR (Projection Boundary crossing)
        const corId = cor.record_id;
        if (_emitted.has(corId)) {
            console.warn(`[rt14-bootstrap] duplicate prevented — COR ${corId} already reflected`);
            return null;
        }
        _emitted.add(corId);

        const divergenceDetected = !!cor.divergence_flag;

        // ── STEP 1: ObservedConsequenceRecord (RT14-INV-1) ───────────────────
        // Primary output of RT-14 comparison (A0 §3.15 R3). Every Projection Boundary
        // crossing receives exactly one OCR — the Constitutional Loop is always closed.
        // RT14-INV-3 (D5 PI-7): divergence_detected=true triggers understanding revision,
        // never reality record revision. deletion_prohibited=true: D8 PROH-5.
        const ocrId = _generateOcrId(timestamp);
        const ocrRecord = ObservedConsequenceRecord.create({
            ocr_id:                      ocrId,
            action_projection_ref:       cor.action_ref,
            effect_expectation_ref:      cor.expectation_ref || eer.eer_id,
            consequence_observation_ref: cor.record_id,
            divergence_detected:         divergenceDetected,
            comparison_timestamp:        timestamp,
            deletion_prohibited:         true,  // D8 PROH-5: must always be true
        });
        ocrRecord.__wave               = 'W4-T4-01';
        ocrRecord.__structural_immutable = true;
        await constitutionalStore.write(ocrRecord);

        // ── STEP 2: OpenActionRegisterTerminalStatusRecord (RT14-INV-4) ──────
        // OAR entry closed ONLY AFTER OCR formed (RT14-INV-4: sequencing invariant).
        // RT12-INV-5: terminal states assigned exclusively by RT-14, never by RT-12.
        // L-RT14-05: terminal_state bootstrapped from COR.divergence_flag.
        const oarTsrId = _generateOarTsrId(oarEntryId, timestamp);
        const oarTsrRecord = OpenActionRegisterTerminalStatusRecord.create({
            oar_tsr_id:                  oarTsrId,
            oar_entry_ref:               oarEntryId,
            terminal_state:              divergenceDetected ? 'PARTIAL' : 'COMPLETE',
            observed_consequence_ref:    ocrId,   // RT14-INV-4: references STEP 1 OCR
            assignment_timestamp:        timestamp,
            issuing_runtime_attestation: true,    // RT12-INV-5: RT-14 is issuing runtime
        });
        oarTsrRecord.__wave               = 'W4-T4-01';
        oarTsrRecord.__structural_immutable = true;
        await constitutionalStore.write(oarTsrRecord);

        // ── STEP 3: ReflectionTriggerRecord (RT14-INV-5) ─────────────────────
        // MANDATORY AND UNCONDITIONAL for every OCR (RT14-INV-5; D8 INV-6).
        // rt09_triggered=true: Knowledge State update trigger attested (A0 §3.15 R5; L-RT14-01).
        // rt11_triggered=true: CUM revision trigger attested (A0 §3.15 R6; L-RT14-02).
        // L-RT14-03: rt15_triggered absent — RT-15 trigger deferred at bootstrap.
        // causal_model_divergence_ref forward-assigned when divergence detected (CMDR in STEP 4).
        const rtrId   = _generateRtrId(ocrId);
        const cmdrId  = divergenceDetected ? _generateCmdrId(ocrId) : undefined;
        const rtrData = {
            rtr_id:                   rtrId,
            observed_consequence_ref:  ocrId,
            rt09_triggered:           true,  // RT14-INV-5: mandatory; L-RT14-01
            rt11_triggered:           true,  // RT14-INV-5: mandatory; L-RT14-02
            trigger_timestamp:        timestamp,
        };
        if (cmdrId) {
            rtrData.causal_model_divergence_ref = cmdrId;
        }
        const rtrRecord = ReflectionTriggerRecord.create(rtrData);
        rtrRecord.__wave               = 'W4-T4-01';
        rtrRecord.__structural_immutable = true;
        await constitutionalStore.write(rtrRecord);

        // ── STEP 4: CausalModelDivergenceRecord (RT14-INV-2) ─────────────────
        // Produced UNCONDITIONALLY when divergence_detected=true (RT14-INV-2).
        // RT14-INV-3: records understanding revision obligation — never reality revision.
        // D5 PI-7: reality is the truth; causal model is revised to align with reality.
        // L-RT14-06: divergence_magnitude=MODERATE at bootstrap.
        if (divergenceDetected) {
            const affectedDomain = cor.domain_attribution || 'APEX-AI-OS-BOOTSTRAP';
            const cmdrRecord = CausalModelDivergenceRecord.create({
                cmdr_id:                  cmdrId,
                action_projection_ref:    cor.action_ref,
                observed_consequence_ref: ocrId,
                divergence_description:
                    `RT-14 Bootstrap Divergence: ` +
                    `EER ${eer.eer_id} expected effects diverged from ` +
                    `COR ${cor.record_id} observed outcome. ` +
                    `Expected: ${eer.expected_effects_description || '[not provided]'}. ` +
                    `Observed: ${cor.observed_outcome || '[not provided]'}. ` +
                    `D5 PI-7: understanding revision triggered — reality is the truth ` +
                    `(RT14-INV-3). RT-11 TOC-4/TOC-5 trigger attested via RTR ${rtrId} ` +
                    `(L-RT14-02). Bootstrap magnitude: MODERATE (L-RT14-06).`,
                divergence_magnitude:    'MODERATE',  // L-RT14-06
                affected_domain:         affectedDomain,
                registration_timestamp:  timestamp,
            });
            cmdrRecord.__wave               = 'W4-T4-01';
            cmdrRecord.__structural_immutable = true;
            await constitutionalStore.write(cmdrRecord);
        }

        const result = { ocrId, oarTsrId, rtrId };
        if (cmdrId) result.cmdrId = cmdrId;
        return result;
    } catch (err) {
        console.error('[rt14-bootstrap] reflect failed:', err?.message);
        return null;
    }
}

module.exports = Object.freeze({
    reflect,
    _generateOcrId,
    _generateCmdrId,
    _generateOarTsrId,
    _generateRtrId,
    _emitted,
});
