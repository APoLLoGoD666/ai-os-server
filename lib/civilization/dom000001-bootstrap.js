'use strict';
// lib/civilization/dom000001-bootstrap.js
// T4-05: DOM-000001 Operationalization Bootstrap (RT-15 Domain Runtime)
//
// Authority: A0-v1.1.1 §3.16 (RT-15 Domain Runtime — canonical seat;
//              roadmap cites RT-05/§3.5 — same off-by-one artifact as other runtimes);
//            R15-v1.0-canonical.md RS-07 RS-10; W2-06 (DomainProfile certified);
//            T4-04-CERTIFICATION.md (RT-04 AuditRecord exists);
//            WAVE-4-RECOMPUTED-EXECUTION-ROADMAP.md §8 (T4-05 definition);
//            RT15-INV-1 (DomainProfile NEVER DELETED);
//            RT15-PROH-07 (no unassigned execution — bootstrap uses founding authority);
//            RT15-PROH-08 (no hidden authority pathways)
//
// CONSTITUTIONAL LIMITATIONS:
// L-T4-05-01: DOM-000001 operationalization scoped to constitutional_records
//              decision filtering only; full domain governance deferred. Full RT-15
//              activation requires Phase 2 prerequisites: RT-05, RT-06, RT-07 operational
//              (R15-v1.0-canonical.md RS-34.2 D8 §9.9 MVCS). NON-BLOCK.
// L-T4-05-02: audit_record_ref declared by reference ('CAR-RT04-BOOTSTRAP') — T4-04
//              carId is timestamp-based and not predictable at T4-05 bootstrap call time;
//              full reference resolution deferred to operational audit channel. NON-BLOCK.
// L-T4-05-03: AIR authority arrays remain empty at bootstrap (W2-06 L1); no RT-02
//              authority grants assigned to DOM-000001 at bootstrap. NON-BLOCK.
// L-T4-05-04: DomainCoherenceAssessment, DomainKnowledgeChain, DomainActorProfileRegistry
//              not produced at bootstrap — Phase 2 prerequisites not met (W2-06 L7).
//              NON-BLOCK.

const constitutionalStore = require('../runtime/constitutional-store');

// Duplicate guard: one bootstrap operationalization per drId
const _emitted = new Set();

// ── Constants ────────────────────────────────────────────────────────────────

// The primary governance domain being operationalized
const BOOTSTRAP_DOMAIN_ID = 'DOM-000001';

// DomainProfile reference — W2-06 certified; written by inject() at startup
// Format: 'dp-' + dom.id per W2-06 implementation record
const DOM_PROFILE_REF = 'dp-DOM-000001';

// Operationalization level — scoped per L-T4-05-01
const BOOTSTRAP_OPER_LEVEL = 'BOOTSTRAP-DECISION-FILTER';

// Audit record reference declared by provenance (L-T4-05-02)
const AUDIT_RECORD_REF_BOOTSTRAP = 'CAR-RT04-BOOTSTRAP';

// ── ID generation ────────────────────────────────────────────────────────────

function _generateDomOperRef(timestamp) {
    return `DOM-OPER-BOOTSTRAP-v1-${timestamp}`;
}

// ── formDom000001Operationalization ──────────────────────────────────────────
//
// T4-05 Bootstrap: creates a DomainBootstrapOperationalizationRecord that:
//   - Attests DOM-000001 DomainProfile (dp-DOM-000001) is accepted as an
//     operational participant in the constitutional decision pipeline
//   - Provides the reference (domOperRef) that deliberation-registry.js uses
//     to upgrade DOM-000001 participant status from NOT-OPERATIONAL → OPERATIONAL
//   - Resolves limitation L-DR-03 (DOM-000001 not operational as deliberation
//     participant) for all subsequent formDeliberationAndDecision invocations
//
// "DOM-000001 executable configuration" (WAVE-4-RECOMPUTED-EXECUTION-ROADMAP §8)
//   = the DomainBootstrapOperationalizationRecord produced here
//
// "DomainProfile wired to RT-12 decision filter" = deliberation-registry.js
//   consuming domOperRef to set DOM-000001 participant status = OPERATIONAL
//
// Bootstrap limitations applied:
//   L-T4-05-01: constitutional_records decision filtering only; full RT-15 deferred
//   L-T4-05-02: audit_record_ref declared by reference (timestamp-based carId unknown)
//   L-T4-05-03: AIR arrays remain empty (RT-02 Wave 3 scope)
//   L-T4-05-04: DomainCoherenceAssessment/DomainKnowledgeChain/DomainActorProfileRegistry deferred
//
// RT15-INV-1: DomainProfile NEVER DELETED — this bootstrap does not delete or modify dp-DOM-000001
// RT15-PROH-07: no unassigned execution — operationalization by APEX founding authority
// RT15-PROH-08: no hidden authority pathways — authority documented in constitutional_records
//
// Returns { domOperRef } on success, null on failure. Never throws.
// Duplicate guard: _emitted.add(guardKey) BEFORE constitutionalStore.write().
async function formDom000001Operationalization({ drId, cdpId } = {}) {
    try {
        const timestamp = new Date().toISOString();

        // Duplicate guard — one bootstrap operationalization per drId
        const guardKey = drId || `STANDALONE-${timestamp}`;
        if (_emitted.has(guardKey)) {
            console.warn(`[dom000001-bootstrap] duplicate prevented — operationalization for ${guardKey} already formed`);
            return null;
        }
        _emitted.add(guardKey);

        const domOperRef = _generateDomOperRef(timestamp);

        // DomainBootstrapOperationalizationRecord — raw constitutional record
        // (no formal constitutional-type schema; follows ConstitutionalDecisionRegistryEntry
        // pattern from T3-12 deliberation-registry.js L-CDR-01)
        //
        // This record IS the "DOM-000001 executable configuration" per WAVE-4 §8 T4-05 outputs.
        // It attests that DOM-000001's DomainProfile is accepted as an operational participant
        // in the constitutional decision pipeline (constitutional_records decision filter, L-T4-05-01).
        const record = {
            __type:                 'DomainBootstrapOperationalizationRecord',
            __runtime:              'RT-15',
            __baseline:             'APEX-CONSTITUTION-v1.0',
            __wave:                 'W4-T4-05',
            __structural_immutable: false,  // updated when L-T4-05-01 through L-T4-05-04 resolved

            dom_oper_ref:                     domOperRef,
            domain_id:                        BOOTSTRAP_DOMAIN_ID,
            domain_profile_ref:               DOM_PROFILE_REF,
            deliberation_ref:                 drId  || 'DR-BOOTSTRAP-INITIAL',
            civilizational_decision_proposal_ref: cdpId || 'CDP-BOOTSTRAP-INITIAL',
            // L-T4-05-02: audit_record_ref declared by reference — T4-04 carId is
            // timestamp-based and unknown at bootstrap call time
            audit_record_ref:                 AUDIT_RECORD_REF_BOOTSTRAP,
            operationalization_level:         BOOTSTRAP_OPER_LEVEL,
            constitutional_basis:
                `A0-v1.1.1 §3.16 (RT-15 Domain Runtime); ` +
                `R15-v1.0-canonical.md RS-07 RS-10 (DomainProfile root object; NEVER DELETED); ` +
                `W2-06 (DomainProfile dp-DOM-000001 certified; inject() wiring VERIFIED); ` +
                `T4-04-CERTIFICATION.md (RT-04 AuditRecord CAR-RT04-BOOTSTRAP-v1 formed); ` +
                `PAIR 53 (RT-15 ↔ RT-12 bidirectional: domain compliance status reporting).`,
            limitation_ref:
                `L-T4-05-01: constitutional_records decision filtering only; full RT-15 governance deferred. ` +
                `L-T4-05-02: audit_record_ref declared by reference (L-T4-05-02 applies). ` +
                `L-T4-05-03: AIR authority arrays empty (RT-02 Wave 3 scope; W2-06 L1). ` +
                `L-T4-05-04: DomainCoherenceAssessment/DomainKnowledgeChain/DomainActorProfileRegistry deferred.`,
            operationalization_timestamp: timestamp,
        };

        await constitutionalStore.write(record);

        return { domOperRef };
    } catch (err) {
        console.error('[dom000001-bootstrap] formDom000001Operationalization failed:', err?.message);
        return null;
    }
}

module.exports = Object.freeze({
    formDom000001Operationalization,
    _generateDomOperRef,
    _emitted,
    BOOTSTRAP_DOMAIN_ID,
    DOM_PROFILE_REF,
    BOOTSTRAP_OPER_LEVEL,
    AUDIT_RECORD_REF_BOOTSTRAP,
});
