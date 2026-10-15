'use strict';
// lib/knowledge/evidence-object-registry.js
// T3-10: EvidenceObject Formation Registry.
//
// Authority: APEX-CONSTITUTION-v1.0; R9-v1.0 RS-07 RS-10; A0-v1.1.1 §3.10;
//            D3 Epistemic Chain Stage 2; D5 §3.2 Stage 4; KI-017;
//            D8 INV-4 (Reality Grounding); RT09-INV-1; RT09-INV-2;
//            T3-10-PHASE-0-AUDIT.md (AUTHORIZED).
//
// CONSTITUTIONAL LIMITATIONS (T3-10-PHASE-0-AUDIT.md §4):
// L-01: lifecycle_state = 'FORMING' — RT-03 Gate admission not yet implemented.
// L-02: temporal_validity_metadata = bootstrap JSON — RT09-PROC-06 not implemented.
// L-03: Non-canonical domain names skip EvidenceObject formation (logged warning).
// L-04: Fire-and-forget — no synchronous success confirmation to callers.
//
// Called from lib/reality/fabric.js setImmediate after constitutionalStore.write(obsRecord).

const { EvidenceObject }        = require('../constitutional-types/knowledge-record');
const epistemicProtocolRegistry  = require('../epistemics/epistemic-protocol-registry');
const { DOMAIN_MAP }             = require('../../civilisation/domain-loader');
const constitutionalStore        = require('../runtime/constitutional-store');

// Inverted DOMAIN_MAP: domain name -> DOM-ID (e.g. 'knowledge' -> 'DOM-000008')
const _DOMAIN_ID_BY_NAME = Object.freeze(
    Object.fromEntries(Object.entries(DOMAIN_MAP).map(([id, name]) => [name, id]))
);

async function formEvidence({ obsRecordId, domainName, uncertaintySrc, uncertaintyConf, uncertaintyLims, uncertaintyTs, uncertaintyCap }) {
    try {
        const domainId = _DOMAIN_ID_BY_NAME[domainName];
        if (!domainId) {
            console.warn(`[evidence-object-registry] unknown domain '${domainName}' — EvidenceObject formation skipped (L-03)`);
            return null;
        }

        const protocol = epistemicProtocolRegistry.getProtocolForDomain(domainId, 'INTERPRETATION');
        if (!protocol) {
            console.error(`[evidence-object-registry] no INTERPRETATION protocol for ${domainId} — EvidenceObject formation skipped`);
            return null;
        }

        const formationTimestamp = new Date().toISOString();
        const evidenceId         = `EVO-${obsRecordId}`;
        const rt09OperationId    = `RT09-OP-${obsRecordId}`;

        const temporalValidityMetadata = JSON.stringify({
            validity_basis:      'bootstrap',
            limitation:          'L-02: RT09-PROC-06 (Temporal Validity Tracking) not yet implemented. Temporal expiration conditions undefined.',
            formation_timestamp: formationTimestamp,
            authority:           'APEX-CONSTITUTION-v1.0; T3-10-PHASE-0-AUDIT.md §L-02',
        });

        const record = EvidenceObject.create({
            evidence_id:                    evidenceId,
            observation_projection_ref:     obsRecordId,
            rt09_operation_id:              rt09OperationId,
            interpretation_protocol_ref:    protocol.protocol_id,
            protocol_version:               protocol.protocol_version,
            uncertainty_source:             uncertaintySrc  || '',
            uncertainty_confidence:         uncertaintyConf || '',
            uncertainty_limitations:        uncertaintyLims || '[]',
            uncertainty_timestamp:          uncertaintyTs   || formationTimestamp,
            uncertainty_observer_capability: uncertaintyCap || '{}',
            domain_classification:          domainId,
            temporal_validity_metadata:     temporalValidityMetadata,
            formation_timestamp:            formationTimestamp,
            lifecycle_state:                'FORMING',
        });

        record.__wave               = 'W3-T3-10';
        record.__structural_immutable = true;

        await constitutionalStore.write(record);
        return evidenceId;
    } catch (err) {
        console.error('[evidence-object-registry] EvidenceObject formation failed:', err?.message);
        return null;
    }
}

module.exports = Object.freeze({ formEvidence, _DOMAIN_ID_BY_NAME });
