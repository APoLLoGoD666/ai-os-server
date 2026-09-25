'use strict';
// lib/knowledge/interpretation-record-registry.js
// T3-10B: InterpretationRecord Formation Registry.
//
// Authority: APEX-CONSTITUTION-v1.0; R9-v1.0 RS-07 RS-10; A0-v1.1.1 §3.10;
//            D3 Epistemic Chain Stage 3; D5 §3.2 Stage 5; KI-007; KI-017;
//            D8 INV-4 (Reality Grounding); RT09-INV-1; RT09-INV-2;
//            T3-10B-PHASE-0-AUDIT.md (AUTHORIZED).
//
// CONSTITUTIONAL LIMITATIONS (T3-10B-PHASE-0-AUDIT.md §4):
// L-01: lifecycle_state = 'FORMING' — RT-03 Gate admission not yet implemented.
// L-02: temporal_validity_metadata = bootstrap JSON — RT09-PROC-06 not implemented.
// L-03: Non-canonical domain names skip InterpretationRecord formation (logged warning).
// L-04: Fire-and-forget — no synchronous success confirmation to callers.
// L-05: InterpretationRecord cannot be ADMITTED until EvidenceObject is ADMITTED (KI-007).
//       EvidenceObject ADMISSION requires RT-03.
// L-06: interpretation_content = bootstrap JSON. Full inference execution deferred to
//       operational RT-09.
//
// Called from lib/reality/fabric.js setImmediate after formEvidence() returns evidenceId.

const { InterpretationRecord } = require('../constitutional-types/knowledge-record');
const epistemicProtocolRegistry  = require('../epistemics/epistemic-protocol-registry');
const { DOMAIN_MAP }             = require('../../civilisation/domain-loader');
const constitutionalStore        = require('../runtime/constitutional-store');

// Inverted DOMAIN_MAP: domain name -> DOM-ID (e.g. 'knowledge' -> 'DOM-000008')
const _DOMAIN_ID_BY_NAME = Object.freeze(
    Object.fromEntries(Object.entries(DOMAIN_MAP).map(([id, name]) => [name, id]))
);

async function formInterpretation({ evidenceId, domainName, obsRecordId, uncertaintyConf }) {
    try {
        if (!evidenceId) {
            console.warn('[interpretation-record-registry] evidenceId absent — InterpretationRecord formation skipped');
            return null;
        }

        const domainId = _DOMAIN_ID_BY_NAME[domainName];
        if (!domainId) {
            console.warn(`[interpretation-record-registry] unknown domain '${domainName}' — InterpretationRecord formation skipped (L-03)`);
            return null;
        }

        const protocol = epistemicProtocolRegistry.getProtocolForDomain(domainId, 'INFERENCE');
        if (!protocol) {
            console.error(`[interpretation-record-registry] no INFERENCE protocol for ${domainId} — InterpretationRecord formation skipped`);
            return null;
        }

        const formationTimestamp   = new Date().toISOString();
        const interpretationId     = `INTP-${evidenceId}`;
        const rt09OperationId      = `RT09-OP-INTP-${evidenceId}`;

        const interpretationContent = JSON.stringify({
            basis:            'bootstrap',
            applied_protocol: protocol.protocol_id,
            evidence_ref:     evidenceId,
            observation_ref:  obsRecordId || null,
            limitation:       'L-06: Full inference execution (applying INFERENCE protocol to EvidenceObject) deferred to operational RT-09. Bootstrap records the protocol application intent.',
            authority:        'APEX-CONSTITUTION-v1.0; T3-10B-PHASE-0-AUDIT.md §L-06',
        });

        const temporalValidityMetadata = JSON.stringify({
            validity_basis:      'bootstrap',
            limitation:          'L-02: RT09-PROC-06 (Temporal Validity Tracking) not yet implemented. Temporal expiration conditions undefined.',
            formation_timestamp: formationTimestamp,
            authority:           'APEX-CONSTITUTION-v1.0; T3-10B-PHASE-0-AUDIT.md §L-02',
        });

        const record = InterpretationRecord.create({
            interpretation_id:          interpretationId,
            evidence_record_ref:        evidenceId,
            rt09_operation_id:          rt09OperationId,
            inference_protocol_ref:     protocol.protocol_id,
            inference_protocol_version: protocol.protocol_version,
            epistemic_confidence:       uncertaintyConf || '0.0',
            interpretation_content:     interpretationContent,
            domain_classification:      domainId,
            temporal_validity_metadata: temporalValidityMetadata,
            formation_timestamp:        formationTimestamp,
            lifecycle_state:            'FORMING',
        });

        record.__wave               = 'W3-T3-10B';
        record.__structural_immutable = true;

        await constitutionalStore.write(record);
        return interpretationId;
    } catch (err) {
        console.error('[interpretation-record-registry] InterpretationRecord formation failed:', err?.message);
        return null;
    }
}

module.exports = Object.freeze({ formInterpretation, _DOMAIN_ID_BY_NAME });
