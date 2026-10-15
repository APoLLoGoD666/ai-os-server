'use strict';
// lib/knowledge/belief-object-registry.js
// T3-10C: BeliefObject Formation Registry.
//
// Authority: APEX-CONSTITUTION-v1.0; R9-v1.0 RS-07 RS-10; A0-v1.1.1 §3.10;
//            D3 Epistemic Chain Stage 4; D5 §3.4; KI-007; KI-016; RT09-INV-5;
//            D8 INV-4; D8 PROH-6; T3-10C-PHASE-0-AUDIT.md (AUTHORIZED).
//
// CONSTITUTIONAL LIMITATIONS (T3-10C-PHASE-0-AUDIT.md §4):
// L-01: lifecycle_state = 'FORMING' — RT-03 Gate admission not yet implemented.
// L-02: temporal_validity_metadata = bootstrap JSON — RT09-PROC-06 not implemented.
// L-03: Non-canonical domain names skip BeliefObject formation (logged warning).
// L-04: Fire-and-forget — no synchronous success confirmation to callers.
// L-05: BeliefObject cannot advance beyond 'FORMING' until InterpretationRecord is ADMITTED.
// L-07: confidence_basis = bootstrap JSON documenting D5 measurement basis.
//       Full confidence adjudication deferred to operational RT-09.
// L-08: belief_content = bootstrap JSON. Full belief proposition derivation deferred.
//
// Called from lib/reality/fabric.js setImmediate after formInterpretation() returns interpretationId.

const { BeliefObject }   = require('../constitutional-types/knowledge-record');
const { DOMAIN_MAP }      = require('../../civilisation/domain-loader');
const constitutionalStore = require('../runtime/constitutional-store');

// Inverted DOMAIN_MAP: domain name -> DOM-ID
const _DOMAIN_ID_BY_NAME = Object.freeze(
    Object.fromEntries(Object.entries(DOMAIN_MAP).map(([id, name]) => [name, id]))
);

async function formBelief({ interpretationId, domainName, obsRecordId, uncertaintyConf }) {
    try {
        if (!interpretationId) {
            console.warn('[belief-object-registry] interpretationId absent — BeliefObject formation skipped');
            return null;
        }

        const domainId = _DOMAIN_ID_BY_NAME[domainName];
        if (!domainId) {
            console.warn(`[belief-object-registry] unknown domain '${domainName}' — BeliefObject formation skipped (L-03)`);
            return null;
        }

        const formationTimestamp = new Date().toISOString();
        const beliefId           = `BELF-${interpretationId}`;
        const rt09OperationId    = `RT09-OP-BELF-${interpretationId}`;

        // RT09-INV-5 / D8 PROH-6: confidence_basis must document actual basis — not fabricated.
        // Basis: D5 uncertainty_confidence captured at ObservationRecord formation (KI-017 chain).
        const confidenceBasis = JSON.stringify({
            basis:            'bootstrap',
            source:           'D5 §3.4 uncertainty_confidence captured at ObservationRecord formation',
            uncertainty_ref:  obsRecordId || null,
            confidence_value: uncertaintyConf || '0.0',
            limitation:       'L-07: Full confidence adjudication (D5 §3.4 attributes fully evaluated) deferred to operational RT-09. Bootstrap inherits D5 measurement directly.',
            authority:        'APEX-CONSTITUTION-v1.0; T3-10C-PHASE-0-AUDIT.md §L-07; KI-017; D5 §3.4',
        });

        // belief_content: honest bootstrap record — not a fabricated proposition.
        const beliefContent = JSON.stringify({
            basis:               'bootstrap',
            interpretation_ref:  interpretationId,
            observation_ref:     obsRecordId || null,
            limitation:          'L-08: Full belief proposition (derived from InterpretationRecord product by applying INFERENCE protocol output) deferred to operational RT-09.',
            authority:           'APEX-CONSTITUTION-v1.0; T3-10C-PHASE-0-AUDIT.md §L-08',
        });

        const temporalValidityMetadata = JSON.stringify({
            validity_basis:      'bootstrap',
            limitation:          'L-02: RT09-PROC-06 (Temporal Validity Tracking) not yet implemented. Temporal expiration conditions undefined.',
            formation_timestamp: formationTimestamp,
            authority:           'APEX-CONSTITUTION-v1.0; T3-10C-PHASE-0-AUDIT.md §L-02',
        });

        const record = BeliefObject.create({
            belief_id:                  beliefId,
            interpretation_record_ref:  interpretationId,
            rt09_operation_id:          rt09OperationId,
            epistemic_confidence_level: uncertaintyConf || '0.0',
            confidence_basis:           confidenceBasis,
            belief_content:             beliefContent,
            domain_classification:      domainId,
            temporal_validity_metadata: temporalValidityMetadata,
            formation_timestamp:        formationTimestamp,
            lifecycle_state:            'FORMING',
        });

        record.__wave               = 'W3-T3-10C';
        record.__structural_immutable = true;

        await constitutionalStore.write(record);
        return beliefId;
    } catch (err) {
        console.error('[belief-object-registry] BeliefObject formation failed:', err?.message);
        return null;
    }
}

module.exports = Object.freeze({ formBelief, _DOMAIN_ID_BY_NAME });
