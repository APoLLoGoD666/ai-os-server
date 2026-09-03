'use strict';
// lib/learning/domain-understanding-registry.js
// T3-09-DUM: DomainUnderstandingModel Formation Registry (RT-10).
//
// Authority: APEX-CONSTITUTION-v1.0; R10-v1.1-canonical.md RS-10.1 (RT10-OBJ-01);
//            A0-v1.1.1 §3.11; D7 CUM-1 through CUM-5; A1 §6.2 (provenance);
//            D8 INV-4 (Reality Grounding); D8 INV-5 (Temporal Awareness);
//            D-2 §VII; D6 §4.3 AIR-2; RT10-INV-1; RT10-INV-2; RT10-INV-3;
//            IDR-W3-09-DUM-001 (RESOLVED); T3-09-DUM-PHASE-0-AUDIT-REEVAL.md (AUTHORIZED);
//            T3-P5-DOMAIN-PROVENANCE-PHASE-0-AUDIT.md (AUTHORIZED 2026-08-03).
//
// CONSTITUTIONAL LIMITATIONS:
// L-DUM-01: dks_source_classification = 'UNCERTAIN' (DKS-2). No KnowledgeState object
//            exists yet. 'UNCERTAIN' is honest at bootstrap: KnowledgeClaim formed but
//            formal KnowledgeState grounding not yet implemented. RT10-INV-4 not triggered
//            (applies only to CONTESTED/DEGRADED).
// L-DUM-02: uncertainty_attributes captures validation-stage confidence and obs_record_id.
//            Full D5 attribute propagation (source, limitations, timestamp, observer_capability)
//            from source ObservationRecord deferred until those fields are added to
//            knowledge_validation_queue. Not collapsed to zero — RT10-INV-2 / CUM-3 satisfied
//            with documented limitation.
// L-DUM-03: temporal_validity_metadata = bootstrap object. RT10-PROC-01 step 5 temporal
//            validity tracking not yet implemented. CUM-4 acknowledged.
// L-DUM-04: domain_id = DOM-000008 (knowledge domain) for all current DUMs. Cascades from
//            T3-10D L-09: knowledge_validation_queue has no domain column; all KnowledgeClaims
//            classified as DOM-000008. DUM formation for domains 1-7 and 9-12 requires
//            domain-aware KnowledgeClaims (future work).
// L-DUM-05: lifecycle_state = 'FORMING'. RT-03 Gate admission not yet implemented.
// L-DUM-06: Fire-and-forget semantics inherited from _promoteToKnowledge() context.
//
// WIRING SITE RATIONALE (T3-09-DUM-PHASE-0-AUDIT-REEVAL.md Attempt 10):
// formDomainUnderstanding() is called ONLY from knowledge-validator.js _promoteToKnowledge()
// after formKnowledgeClaim() returns a valid knowledgeId. RT10-PROC-01 trigger condition
// ("Receipt of admitted Knowledge Record from RT-09") is constitutionally satisfied at
// this site. KnowledgeClaim is in FORMING state — consistent with T3-10 through T3-10D
// bootstrap precedent.

const { DomainUnderstandingModel } = require('../constitutional-types/learning-record');
const inferenceProtocolRegistry     = require('../inference/inference-protocol-registry');
const constitutionalStore           = require('../runtime/constitutional-store');
const { DOMAIN_MAP }                = require('../../civilisation/domain-loader');

// Duplicate guard: one DUM per knowledgeId per process lifecycle.
const _emitted = new Set();

// Domain: DOM-000008 (knowledge) — L-DUM-04 documented limitation.
// Wired to the single domain available at _promoteToKnowledge() until domain column added.
const _DUM_DOMAIN_ID = 'DOM-000008';

// formDomainUnderstanding({ knowledgeId, obsRecordId, domainId, item, confidence })
//
//   knowledgeId — authentic KnowledgeClaim ID returned by formKnowledgeClaim().
//                 Used as knowledge_record_ref (RT10-INV-1; A1 §6.2 provenance anchor).
//   obsRecordId — item.obs_record_id (T3-P2 column; source ObservationRecord ID).
//   domainId    — caller-asserted constitutional domain ID (T3-P5; optional).
//                 Must be a registered key in DOMAIN_MAP (D8 INV-4: no fabricated domains).
//                 Defaults to _DUM_DOMAIN_ID ('DOM-000008') when absent (L-P5-02).
//   item        — full knowledge_validation_queue row { validation_id, confirmations, ... }
//   confidence  — float from _processValidationItem() at EP-T4 satisfaction moment.
//
// Returns dumId string on success. Returns null on skip or failure. Never throws.
async function formDomainUnderstanding({ knowledgeId, obsRecordId, domainId, item, confidence }) {
    try {
        if (!knowledgeId) {
            console.warn('[domain-understanding-registry] knowledgeId absent — DUM formation skipped');
            return null;
        }

        // D8 INV-4: validate caller-provided domainId against constitutional DOMAIN_MAP.
        // Invalid IDs are rejected (not silently corrected); RT10-INV-3 compliance improved.
        // null/undefined → DOM-000008 default (L-P5-02 backward compatibility).
        const effectiveDomainId = (domainId && DOMAIN_MAP[domainId]) ? domainId : _DUM_DOMAIN_ID;

        const dumId           = `DUM-${effectiveDomainId}-${knowledgeId}`;
        const rt10OperationId = `RT10-OP-DUM-${knowledgeId}`;

        // Duplicate guard: one DUM per knowledgeId per process lifecycle.
        if (_emitted.has(dumId)) {
            console.warn(`[domain-understanding-registry] duplicate prevented — ${dumId} already emitted`);
            return dumId;
        }

        // InferenceProtocol lookup — RT10-INV-3: only registered protocols may be applied.
        const protocol = inferenceProtocolRegistry.getProtocolForDomain(effectiveDomainId);
        if (!protocol) {
            console.error(`[domain-understanding-registry] no InferenceProtocol for ${effectiveDomainId} — DUM skipped`);
            return null;
        }

        const formationTimestamp = new Date().toISOString();

        // domain_understanding_content: honest bootstrap record — not a fabricated synthesis.
        // Documents the protocol application and Knowledge Record source. D-2 §VII: interpretable.
        const domainUnderstandingContent = JSON.stringify({
            basis:                'bootstrap',
            applied_protocol:     protocol.protocol_id,
            knowledge_record_ref: knowledgeId,
            obs_record_id:        obsRecordId || null,
            domain_id:            effectiveDomainId,
            limitation:           'L-DUM-06: Full inference synthesis (applying InferenceProtocol to admitted Knowledge Record) deferred to operational RT-10. Bootstrap records the protocol application intent and provenance.',
            authority:            'APEX-CONSTITUTION-v1.0; T3-09-DUM; R10-v1.1 RT10-PROC-01; D-2 §VII',
        });

        // uncertainty_attributes (object, not string) — RT10-INV-2 / CUM-3 preservation.
        // Captures available uncertainty data at the validation site without collapse (L-DUM-02).
        const uncertaintyAttributes = {
            basis:             'bootstrap',
            confidence:        parseFloat(confidence.toFixed(3)),
            confirmations:     item.confirmations,
            min_confirmations: item.min_confirmations || 2,
            obs_record_id:     obsRecordId || null,
            limitation:        'L-DUM-02: D5 uncertainty attributes (source, limitations, timestamp, observer_capability) from source ObservationRecord not propagated at knowledge_validation_queue level. Full propagation requires domain + D5 columns in knowledge_validation_queue. Validation-stage confidence preserved without collapse (RT10-INV-2; CUM-3).',
            authority:         'APEX-CONSTITUTION-v1.0; T3-09-DUM; RT10-INV-2; CUM-3; D6 §4.3 AIR-2',
        };

        // temporal_validity_metadata (object, not string) — CUM-4 / D8 INV-5 (L-DUM-03).
        const temporalValidityMetadata = {
            validity_basis:      'bootstrap',
            limitation:          'L-DUM-03: RT10-PROC-01 step 5 (Temporal Validity Tracking) not yet implemented. CUM-4 temporal validity metadata structure documented; expiration conditions undefined.',
            formation_timestamp: formationTimestamp,
            authority:           'APEX-CONSTITUTION-v1.0; T3-09-DUM; CUM-4; D8 INV-5',
        };

        const record = DomainUnderstandingModel.create({
            dum_id:                       dumId,
            domain_id:                    effectiveDomainId,
            rt10_operation_id:            rt10OperationId,
            knowledge_record_ref:         knowledgeId,
            inference_protocol_ref:       protocol.protocol_id,
            inference_protocol_version:   protocol.protocol_version,
            domain_understanding_content: domainUnderstandingContent,
            dks_source_classification:    'UNCERTAIN',      // L-DUM-01: DKS-2 honest at bootstrap
            uncertainty_attributes:       uncertaintyAttributes,
            temporal_validity_metadata:   temporalValidityMetadata,
            formation_timestamp:          formationTimestamp,
            lifecycle_state:              'FORMING',        // L-DUM-05: RT-03 admission not implemented
            rt10_inv1_provenance_satisfied: true,           // HONEST: knowledge_record_ref populated ✓
            rt10_inv2_uncertainty_preserved: true,          // HONEST: uncertainty preserved (L-DUM-02) ✓
        });

        record.__wave               = 'W3-T3-09-DUM';
        record.__structural_immutable = false;  // DUM is updatable per constitutional spec

        _emitted.add(dumId);
        await constitutionalStore.write(record);
        return dumId;
    } catch (err) {
        console.error('[domain-understanding-registry] DomainUnderstandingModel formation failed:', err?.message);
        return null;
    }
}

module.exports = Object.freeze({ formDomainUnderstanding, _emitted, _DUM_DOMAIN_ID });
