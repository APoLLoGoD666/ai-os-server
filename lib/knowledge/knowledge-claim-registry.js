'use strict';
// lib/knowledge/knowledge-claim-registry.js
// T3-10D: KnowledgeClaim Formation Registry (RT-09 Stage 5).
//
// Authority: APEX-CONSTITUTION-v1.0; R9-v1.0 RS-07 RS-10; A0-v1.1.1 §3.10;
//            D3 Epistemic Chain Stage 5 (EP-T4 Validation Gate); D3 EP-T4;
//            D5 §3.2 Stage 5; D8 INV-4 (Reality Grounding); RT09-INV-1;
//            RT09-INV-4; RT09-INV-5; KI-007; KI-010; KI-016;
//            IDR-W3-10D-001 Option A; T3-10D-PHASE-0-AUDIT.md (AUTHORIZED).
//
// CONSTITUTIONAL LIMITATIONS:
// L-01: lifecycle_state = 'FORMING' — RT-03 Gate admission not yet implemented.
// L-02: temporal_validity_metadata = bootstrap JSON — RT09-PROC-06 not implemented.
// L-04: Fire-and-forget — no synchronous success confirmation to callers.
// L-09: domain_classification = DOM-000008 (knowledge). knowledge_validation_queue
//       has no domain column. Lesson-derived KnowledgeClaims are classified in the
//       knowledge domain constitutionally. Full per-observation domain classification
//       requires a domain column in knowledge_validation_queue (future work).
// L-10: Requires item.obs_record_id (T3-P2 column). Pre-T3-P2 queue items
//       (obs_record_id = null) are skipped — chain reconstruction requires authentic
//       ObservationRecord ID; fabrication prohibited (D8 INV-4).
// L-11: belief_object_ref, evidence_record_ref reference FORMING-state constitutional
//       records from T3-10/10B/10C. For obs_record_ids predating T3-10 deployment,
//       chain records may not exist in constitutional_records. IDs remain honest
//       (deterministic from authentic obsRecordId; D8 INV-4 not violated).
//
// WIRING SITE RATIONALE (IDR-W3-10D-001 Option A; T3-10D-PHASE-0-AUDIT.md Attempts 1-15):
// formKnowledgeClaim() is called ONLY from knowledge-validator.js _promoteToKnowledge()
// after _processValidationItem() has verified ALL D3 EP-T4 gate conditions:
//   confirmations >= MIN_CONFIRMATIONS (2)
//   confidence    >= MIN_CONFIDENCE    (0.60)
//   contradictions.length === 0
// This is the ONLY location where ep_t4_validation_gate_satisfied = true is a
// constitutionally honest attestation. All other wiring sites are prohibited.

const { KnowledgeClaim }  = require('../constitutional-types/knowledge-record');
const constitutionalStore = require('../runtime/constitutional-store');

// Duplicate guard: prevents concurrent cron runs from emitting duplicate KnowledgeClaims
// for the same obsRecordId within a single process lifecycle.
const _emitted = new Set();

// formKnowledgeClaim({ obsRecordId, item, confidence })
//
//   obsRecordId — item.obs_record_id from knowledge_validation_queue (T3-P2 column).
//                 Must be the authentic ObservationRecord ID (OBS-{claimUUID}-{ts}).
//   item        — full knowledge_validation_queue row: { validation_id, confirmations,
//                 min_confirmations, obs_record_id, ... }
//   confidence  — float from _processValidationItem() at EP-T4 satisfaction moment.
//
// Returns knowledgeId string on success. Returns null on failure or skip. Never throws.
async function formKnowledgeClaim({ obsRecordId, item, confidence }) {
    try {
        // L-10: obs_record_id required — cannot reconstruct chain without authentic ID.
        if (!obsRecordId) {
            console.warn('[knowledge-claim-registry] obsRecordId absent — KnowledgeClaim skipped (L-10)');
            return null;
        }

        // Chain ID reconstruction — all IDs deterministic from obsRecordId (D8 INV-4).
        // Formulas match the T3-10 / T3-10B / T3-10C chain exactly.
        const evidenceId       = `EVO-${obsRecordId}`;        // T3-10 EvidenceObject
        const interpretationId = `INTP-${evidenceId}`;        // T3-10B InterpretationRecord
        const beliefId         = `BELF-${interpretationId}`;  // T3-10C BeliefObject
        const knowledgeId      = `KC-${beliefId}`;            // T3-10D KnowledgeClaim
        const rt09OperationId  = `RT09-OP-KC-${beliefId}`;    // A1 §6.2 provenance anchor

        // Duplicate guard.
        if (_emitted.has(knowledgeId)) {
            console.warn(`[knowledge-claim-registry] duplicate prevented — ${knowledgeId} already emitted`);
            return knowledgeId;
        }

        const formationTimestamp = new Date().toISOString();

        // domain_classification: DOM-000008 (knowledge domain) — L-09.
        const domainId = 'DOM-000008';

        // validation_attributes: documents the actual EP-T4 gate state.
        // All values derive from genuine _processValidationItem() outputs — no fabrication.
        const validationAttributes = JSON.stringify({
            ep_t4_gate_conditions: 'confirmations >= MIN_CONFIRMATIONS && confidence >= MIN_CONFIDENCE && contradictions.length === 0',
            confirmations:         item.confirmations,
            min_confirmations:     item.min_confirmations || 2,
            confidence:            parseFloat(confidence.toFixed(3)),
            min_confidence:        0.60,
            contradictions_count:  0,
            validation_id:         item.validation_id,
            ep_t4_satisfied_at:    formationTimestamp,
            ep_validation_protocol: `EP-${domainId}-VALID-v1.0`,
            authority:             'D3 EP-T4; APEX-CONSTITUTION-v1.0; knowledge-validator.js _promoteToKnowledge()',
        });

        // justification: RT09-INV-5 / D8 PROH-6 — explicit basis for stage advancement.
        const justification = JSON.stringify({
            basis:              'D3 EP-T4 Validation Gate genuinely satisfied',
            confirmations:      item.confirmations,
            confidence:         parseFloat(confidence.toFixed(3)),
            validation_id:      item.validation_id,
            obs_record_id:      obsRecordId,
            evidence_ref:       evidenceId,
            interpretation_ref: interpretationId,
            belief_ref:         beliefId,
            wiring_site:        'knowledge-validator.js _promoteToKnowledge()',
            limitation:         'L-09 L-11 — see knowledge-claim-registry.js header',
            authority:          'APEX-CONSTITUTION-v1.0; D3 EP-T4; RT09-INV-5; D8 PROH-6; IDR-W3-10D-001 Option A',
        });

        const temporalValidityMetadata = JSON.stringify({
            validity_basis:      'bootstrap',
            limitation:          'L-02: RT09-PROC-06 (Temporal Validity Tracking) not yet implemented.',
            formation_timestamp: formationTimestamp,
            authority:           'APEX-CONSTITUTION-v1.0; T3-10D',
        });

        const record = KnowledgeClaim.create({
            knowledge_id:                    knowledgeId,
            belief_object_ref:               beliefId,
            evidence_record_ref:             evidenceId,
            rt09_operation_id:               rt09OperationId,
            justification:                   justification,
            validation_attributes:           validationAttributes,
            ep_t4_validation_gate_satisfied: true,
            domain_classification:           domainId,
            temporal_validity_metadata:      temporalValidityMetadata,
            formation_timestamp:             formationTimestamp,
            lifecycle_state:                 'FORMING',
        });

        record.__wave               = 'W3-T3-10D';
        record.__structural_immutable = true;

        _emitted.add(knowledgeId);
        await constitutionalStore.write(record);
        return knowledgeId;
    } catch (err) {
        console.error('[knowledge-claim-registry] KnowledgeClaim formation failed:', err?.message);
        return null;
    }
}

module.exports = Object.freeze({ formKnowledgeClaim, _emitted });
