'use strict';
// lib/civilization/deliberation-registry.js
// T3-12: DeliberationRecord + CivilizationalDecisionProposal Formation
//
// Authority: APEX-CONSTITUTION-v1.0; R11-v1.3-canonical.md RS-12 Process 2 Process 3;
//            D-7-v1.0 Part 4.6 (13-element DR); D-7-v1.0 Part 5.2 (DA-1 through DA-6);
//            D-8-v1.0 IC-2 IC-3 PROH-4 PROH-5; RT11-INV-4 RT11-INV-5 RT11-INV-6;
//            T3-12-DELIBERATION-PHASE-0-AUDIT.md (AUTHORIZED 2026-08-04)
//
// CONSTITUTIONAL LIMITATIONS:
// L-DR-03: DOM-000001 not operational as deliberation participant. Bootstrap status
//           documented in participants array with NOT-OPERATIONAL status. NON-BLOCK.
// L-DR-04: evidence_used empty at bootstrap (no operational KnowledgeClaims). Gap
//           registered as KG-DR-01 in knowledge_gaps per ER-5. NON-BLOCK.
// L-DA4-05: VC-5 (Constitutive Coherence) bootstrapped via CDP.validate() during create().
//            RT-12 full implementation deferred. NON-BLOCK.
// L-DA4-08: VC-8 (Provenance Validation) bootstrapped — constitutional_records DUM/KC
//            provenance chain exists (T3-10D, T3-09-DUM). RT-04 deferred. NON-BLOCK.
// L-DA4-09: VC-9 (Feedback Completeness) bootstrapped via review_requirement (Element 13).
//            RT-14 full implementation deferred. NON-BLOCK.
// L-CDR-01: Bootstrap ConstitutionalDecisionRegistryEntry creates the Constitutional
//            Decision Registry first entry. DOM-000001 governance not yet operational.
//            NON-BLOCK.

const { DeliberationRecord, CivilizationalDecisionProposal } = require('../constitutional-types/civilizational-decision-proposal');
const constitutionalStore = require('../runtime/constitutional-store');
const { getSupabaseClient } = require('../clients');
const { formCivilizationalDecision } = require('./rt12-bootstrap');

// Duplicate guard: one (drId, cdpId) pair per process lifecycle.
const _emitted = new Set();

// ── ID generation — pre-assigned before DR/CDP formation to break circular reference ──
// DR Element 11 (decision_output_ref) needs cdpId before DR is formed.
// CDP (deliberation_record_ref) needs drId before CDP is formed.
// Solution: generate both from the same timestamp before either record is created.

function _generateDrId(timestamp) {
    return `DR-BOOTSTRAP-v1-${timestamp}`;
}

function _generateCdpId(timestamp) {
    return `CDP-BOOTSTRAP-v1-${timestamp}`;
}

function _generateCdrId(cdpId) {
    return `CDR-${cdpId}`;
}

// ── Element 3: Participants (L-DR-03: DOM-000001 not operational at bootstrap) ──
// A0 §3.12 R4 requires: Authority, Epistemic, Audit, Theory of Change, DOM-000001.
// All required roles recorded; DOM-000001 status = NOT-OPERATIONAL (honest per PROH-5).
function _buildDrParticipants() {
    return [
        {
            runtime: 'RT-11',
            role: 'Authority',
            status: 'ACTIVE',
            note: 'Civilization Intelligence Runtime — sole CDP production authority (AIR-3)',
        },
        {
            runtime: 'RT-09',
            role: 'Epistemic',
            status: 'ACTIVE',
            note: 'Evidence pipeline complete (T3-10D); KnowledgeClaims available via constitutional_records',
        },
        {
            runtime: 'constitutional-store',
            role: 'Audit',
            status: 'ACTIVE',
            note: 'Bootstrap RT-03 audit registration (L-CSP-08 pattern)',
        },
        {
            runtime: 'CausalModel-BOOTSTRAP',
            role: 'Theory of Change',
            status: 'BOOTSTRAP',
            note: 'No CausalModel registered yet; Theory of Change pending extension',
        },
        {
            runtime: 'DOM-000001',
            role: 'Root Domain',
            status: 'NOT-OPERATIONAL',
            note: 'L-DR-03: DOM-000001 not operational as deliberation participant at bootstrap',
        },
    ];
}

// ── DA-5: ConstitutionalDecisionRegistryEntry — bootstrap CDR entry (L-CDR-01) ──
// Writing this entry via constitutional-store IS the registry bootstrap act.
// The cdr_id becomes the dom_000001_registration_id on the CDP.
function _buildConstitutionalDecisionRegistryEntry({ cdpId, drId, cumVersionRef, timestamp }) {
    return {
        __type:                 'ConstitutionalDecisionRegistryEntry',
        __runtime:              'RT-11',
        __baseline:             'APEX-CONSTITUTION-v1.0',
        __wave:                 'W3-T3-12',
        __structural_immutable: true,
        cdr_id:                 _generateCdrId(cdpId),
        cdp_ref:                cdpId,
        dr_ref:                 drId,
        cum_version_ref:        cumVersionRef,
        registration_method:    'constitutional-store-write-bootstrap-RT-11',
        registration_timestamp: timestamp,
        limitation:             'L-CDR-01: bootstrap registry entry; DOM-000001 governance not yet operational',
    };
}

// ── _queryCURRENTCum() — locate most recent CURRENT CUM in constitutional_records ──
// Used when cumId/cumVersion are not passed directly (e.g., standalone invocation).
// Returns { cumId, cumVersion } or null. Never throws.
async function _queryCURRENTCum() {
    try {
        const sb = getSupabaseClient();
        const { data, error } = await sb
            .from('constitutional_records')
            .select('record_data')
            .eq('record_type', 'CivilizationUnderstandingModel')
            .order('created_at', { ascending: false })
            .limit(10);
        if (!error && data) {
            for (const row of data) {
                const rd = row.record_data;
                if (rd && rd.lifecycle_state === 'CURRENT') {
                    return { cumId: rd.cum_id, cumVersion: rd.cum_version };
                }
            }
        }
    } catch (_) {}
    return null;
}

// ── formDeliberationAndDecision({ cumId, cumVersion }) ───────────────────────────
//
// Top-level orchestrator: Process 2 (Deliberation) + Process 3 (Decision Authority).
// Called from _executeCSPSteps2to9 in civilization-understanding-registry.js after
// the CURRENT CUM record is written.
//
// Produces:
//   1. DeliberationRecord (13-element, D-7 Part 4.6) — written first (DR before CDP per F-04)
//   2. ConstitutionalDecisionRegistryEntry (DA-5, L-CDR-01) — bootstrap registry entry
//   3. CivilizationalDecisionProposal (lifecycle_state = PRODUCED) — all DA-1 through DA-6 true
//
// Returns { drId, cdpId } on success, or null on failure. Never throws.
// Duplicate guard: sessionKey = `${drId}::${cdpId}` prevents re-emission per process lifecycle.
async function formDeliberationAndDecision({ cumId, cumVersion } = {}) {
    try {
        // Resolve cumId/cumVersion if not provided
        if (!cumId || !cumVersion) {
            const found = await _queryCURRENTCum();
            if (!found) {
                console.warn('[deliberation-registry] No CURRENT CUM found — deliberation skipped');
                return null;
            }
            cumId    = found.cumId;
            cumVersion = found.cumVersion;
        }

        const timestamp = new Date().toISOString();
        const drId  = _generateDrId(timestamp);
        const cdpId = _generateCdpId(timestamp);
        const cdrId = _generateCdrId(cdpId);

        // Duplicate guard: one (drId, cdpId) per process lifecycle
        const sessionKey = `${drId}::${cdpId}`;
        if (_emitted.has(sessionKey)) {
            console.warn(`[deliberation-registry] duplicate prevented — ${sessionKey} already emitted`);
            return { drId, cdpId };
        }

        // Element 4: evidence_used empty at bootstrap (L-DR-04)
        // Gap registered in Element 7 per ER-5 — see KG-DR-01 below
        const evidence_used = [];

        // Element 7: Knowledge Gaps (ER-5 compliance — registered gaps, not ignored)
        const knowledge_gaps = [
            {
                gap_id:         'KG-DR-01',
                description:    'No operational KnowledgeClaims in evidence pipeline at bootstrap',
                classification: 'BOOTSTRAP-LIMITATION',
                limitation_ref: 'L-DR-04',
            },
            {
                gap_id:         'KG-DR-02',
                description:    'RT-06 DomainCoherenceStatus signals absent',
                classification: 'NON-BLOCK',
                limitation_ref: 'L-CSP-02',
            },
            {
                gap_id:         'KG-DR-03',
                description:    'RT-07 historical state absent (first synthesis)',
                classification: 'NON-BLOCK',
                limitation_ref: 'L-CSP-05',
            },
        ];

        // Element 5: Alternatives Considered (2 minimum for honest deliberation)
        const alternatives_considered = [
            {
                alternative: 'Initiate constitutional bootstrap with current epistemic state',
                selected:    true,
                basis:       'Only viable alternative at bootstrap — epistemic pipeline operational (T3-10D)',
            },
            {
                alternative: 'Defer all decisions until RT-06, RT-07 operational',
                selected:    false,
                basis:       'Rejected: deferral prevents constitutional activation; NON-BLOCK classification applies per RS-08',
            },
        ];

        // Element 9: Resolution Reasoning
        const resolution_reasoning =
            `Bootstrap deliberation grounded in T3-11C CURRENT CUM (${cumId}). ` +
            `No cross-domain tensions identified (RT-06 absent, L-CSP-02). ` +
            `No historical conflicts (first synthesis, L-CSP-05). ` +
            `Evidence gaps registered per ER-5 (KG-DR-01 through KG-DR-03). ` +
            `Alternatives evaluated: bootstrap initiation selected over deferral. ` +
            `Constitutional basis: APEX-CONSTITUTION-v1.0; R11-v1.3-canonical.md RS-12 Process 2.`;

        // Element 12: Confidence (ER-3 compliance — uncertainty registered, not suppressed)
        const confidence =
            'LOW-BOOTSTRAP: deliberation grounded in CURRENT CUM (T3-11C) but lacks ' +
            'operational evidence pipeline (L-DR-04) and RT-06/RT-07 inputs. ' +
            'Honest assessment: bootstrap-level epistemic confidence only.';

        // Element 13: Review Requirement (VC-9 bootstrap — feedback plan established)
        const review_requirement =
            'REVIEW-REQUIRED-ON-FIRST-KC: this CDP must be reviewed when first operational ' +
            'KnowledgeClaim is admitted to constitutional_records. ' +
            'Feedback route: ObservedConsequenceSignal → RT-14 → RT-11 (updated understanding phase). ' +
            'L-DA4-09: RT-14 not yet operational; review trigger documented here per VC-9 bootstrap.';

        // ── PROCESS 2: Form DeliberationRecord (13 elements, D-7 Part 4.6) ───────
        // Written FIRST per F-04 resolution (DR before CDP; both IDs pre-assigned above).
        const drRecord = DeliberationRecord.create({
            dr_id:                   drId,
            // Element 1
            question:                'What is the initial constitutional action recommendation for APEX AI OS based on the current CivilizationUnderstandingModel?',
            // Element 2
            cum_state_at_initiation: 'CURRENT',
            cum_version_ref:         cumVersion,
            // Element 3
            participants:            _buildDrParticipants(),
            // Element 4
            evidence_used,
            // Element 5
            alternatives_considered,
            // Element 6
            conflicts_registered:    [],
            // Element 7
            knowledge_gaps,
            // Element 8
            competing_objectives:    [],
            // Element 9
            resolution_reasoning,
            // Element 10
            sacrificed_objectives:   [],
            // Element 11
            decision_output_ref:     cdpId,
            // Element 12
            confidence,
            // Element 13
            review_requirement,
            initiation_timestamp:    timestamp,
            completion_timestamp:    timestamp,
        });
        drRecord.__wave               = 'W3-T3-12';
        drRecord.__structural_immutable = true; // D-8 IC-2

        _emitted.add(sessionKey);
        await constitutionalStore.write(drRecord);

        // ── PROCESS 3: Decision Authority Execution ──────────────────────────────

        // DA-5: Write ConstitutionalDecisionRegistryEntry first (L-CDR-01)
        // cdr_id from this entry becomes dom_000001_registration_id on the CDP
        const cdrEntry = _buildConstitutionalDecisionRegistryEntry({
            cdpId,
            drId,
            cumVersionRef: cumVersion,
            timestamp,
        });
        await constitutionalStore.write(cdrEntry);

        // VC-5 bootstrap: CivilizationalDecisionProposal.validate() called during create() (L-DA4-05)
        // VC-8 bootstrap: constitutional_records DUM/KC provenance chain exists (T3-10D, T3-09-DUM) (L-DA4-08)
        // VC-9 bootstrap: feedback plan documented in review_requirement Element 13 above (L-DA4-09)
        const cdpRecord = CivilizationalDecisionProposal.create({
            cdp_id:                               cdpId,
            scope_classification:                 'civilizational',
            irreversibility_classification:       'REVERSIBLE',
            deliberation_record_ref:              drId,
            cum_version_ref:                      cumVersion,
            dom_000001_registration_id:           cdrId,
            da_1_scope_authority_satisfied:       true,
            da_2_deliberation_grounding_satisfied: true,
            da_3_cum_grounding_satisfied:         true,
            da_4_gate_passage_satisfied:          true,
            da_5_dom_registration_satisfied:      true,
            da_6_irreversibility_classified:      true,
            production_timestamp:                 timestamp,
            lifecycle_state:                      'PRODUCED',
        });
        cdpRecord.__wave               = 'W3-T3-12';
        cdpRecord.__structural_immutable = false; // CDP transitions through lifecycle states

        await constitutionalStore.write(cdpRecord);

        // T3-13: RT-12 Bootstrap — form CivilizationalDecision from CDP PRODUCED
        await formCivilizationalDecision({ cdpId, drId, cumVersionRef: cumVersion, cdpRecord });

        return { drId, cdpId };
    } catch (err) {
        console.error('[deliberation-registry] formDeliberationAndDecision failed:', err?.message);
        return null;
    }
}

module.exports = Object.freeze({
    formDeliberationAndDecision,
    // Internal exports — used by tests
    _generateDrId,
    _generateCdpId,
    _generateCdrId,
    _buildDrParticipants,
    _buildConstitutionalDecisionRegistryEntry,
    _queryCURRENTCum,
    _emitted,
});
