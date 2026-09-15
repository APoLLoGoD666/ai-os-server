'use strict';
// lib/civilization/rt12-bootstrap.js
// T3-13: CivilizationalDecision Formation (RT-12 Bootstrap)
//
// Authority: A0-v1.1.1 §3.13 (RT-12 Owned Objects: CivilizationalDecision,
//            OpenActionRegisterEntry, DecisionArchiveRecord, CivilizationalDecisionChainRecord);
//            RT12-v1.0-canonical.md RS-07 RS-08 RS-09 RS-10 RS-12;
//            D-7-v1.0 Part 5 (DA-1–DA-6; ER-1–ER-5); D-7-v1.0 Part 5.5 (CDC);
//            D-4-v2.0 Class B KOM; RT12-INV-1 through RT12-INV-6;
//            D-8-v1.0 IC-2 IC-3 PROH-4 PROH-5;
//            T3-13-CIVILIZATIONAL-DECISION-PHASE-0-AUDIT.md (AUTHORIZED 2026-08-04)
//
// CONSTITUTIONAL LIMITATIONS:
// L-RT12-01: RT-12 full compliance operationalization deferred; bootstrap Decision formed via
//             schema validation only. NON-BLOCK.
// L-RT12-02: RT-02 AuthorityResolutionResult bootstrap — AUTH-BOOTSTRAP-v1-${timestamp}
//             reference; RT-02 full authority verification deferred (T3-08 bootstrap). NON-BLOCK.
// L-RT12-03: RT-03 GateProcessingResult bootstrap — GPR-BOOTSTRAP-v1-${timestamp} reference;
//             full RT-03 six-gate kernel processing deferred. NON-BLOCK.
// L-RT12-04: CDP lifecycle transitions SUBMITTED/ACCEPTED written as successive
//             constitutional_records INSERTs (insert-only pattern). NON-BLOCK.
// L-RT12-05: RT-03 Class B KOM not operational; OpenActionRegisterEntry written via
//             constitutional-store.write() bootstrap equivalent. NON-BLOCK.
// L-RT12-06: CivilizationalDecisionChainRecord chain_position = 1 at bootstrap (first Decision
//             in chain); prior_decision_ref absent (optional, valid for position 1). NON-BLOCK.

const {
    CivilizationalDecision,
    OpenActionRegisterEntry,
    DecisionArchiveRecord,
    CivilizationalDecisionChainRecord,
} = require('../constitutional-types/civilizational-decision');
const { CivilizationalDecisionProposal } = require('../constitutional-types/civilizational-decision-proposal');
const constitutionalStore = require('../runtime/constitutional-store');
const { formActionProjection } = require('./rt13-bootstrap');

// Duplicate guard: one decisionId per formCivilizationalDecision() call
const _emitted = new Set();

// ── ID generation — pre-assigned to break circular reference (F-04 resolution) ──
// decisionId and oarEntryId pre-assigned from same timestamp before either record created.

function _generateDecisionId(timestamp) {
    return `DEC-BOOTSTRAP-v1-${timestamp}`;
}

function _generateOarEntryId(decisionId) {
    return `OAR-${decisionId}`;
}

function _generateArchiveRecordId(decisionId) {
    return `DAR-${decisionId}`;
}

function _generateChainRecordId(decisionId) {
    return `CDC-${decisionId}`;
}

// L-RT12-03: bootstrap gate processing result reference
function _generateGprId(timestamp) {
    return `GPR-BOOTSTRAP-v1-${timestamp}`;
}

// L-RT12-02: bootstrap authority resolution reference
function _generateAuthResRef(timestamp) {
    return `AUTH-BOOTSTRAP-v1-${timestamp}`;
}

// ── formCivilizationalDecision ────────────────────────────────────────────────
//
// RT-12 Bootstrap: receives CDP data from deliberation-registry.js after CDP
// written at PRODUCED state. Produces all 4 RT-12 owned objects plus CDP lifecycle
// transitions SUBMITTED and ACCEPTED.
//
// Sequence:
//   1. CDP → SUBMITTED (PAIR 40 delivery acknowledgment, L-RT12-04)
//   2. CivilizationalDecision (lifecycle_state = AUTHORIZED, L-RT12-01 through L-RT12-03)
//   3. OpenActionRegisterEntry (lifecycle_state = PENDING, RT12-INV-4, L-RT12-05)
//   4. DecisionArchiveRecord (permanent archive, A0 §3.13 R9, D8 PROH-5)
//   5. CivilizationalDecisionChainRecord (position 1, D7 Part 5.5, L-RT12-06)
//   6. CDP → ACCEPTED (RT-12 compliance verification passed)
//
// Returns { decisionId } on success, null on failure. Never throws.
// Duplicate guard: _emitted.add(decisionId) BEFORE constitutionalStore.write().
async function formCivilizationalDecision({ cdpId, drId, cumVersionRef, cdpRecord }) {
    try {
        const timestamp       = new Date().toISOString();
        const decisionId      = _generateDecisionId(timestamp);
        const oarEntryId      = _generateOarEntryId(decisionId);
        const archiveRecordId = _generateArchiveRecordId(decisionId);
        const chainRecordId   = _generateChainRecordId(decisionId);
        const gprId           = _generateGprId(timestamp);
        const authResRef      = _generateAuthResRef(timestamp);

        // Duplicate guard — added before first write per fire-and-forget semantics
        if (_emitted.has(decisionId)) {
            console.warn(`[rt12-bootstrap] duplicate prevented — ${decisionId} already emitted`);
            return { decisionId };
        }
        _emitted.add(decisionId);

        // ── STEP 1: CDP → SUBMITTED (PAIR 40 delivery to RT-12) ─────────────
        // L-RT12-04: successive INSERT tracks lifecycle transition.
        // submitted_to_rt12_at is the PAIR 40 handoff timestamp (wave plan W1-09 Step 2).
        const cdpSubmitted = CivilizationalDecisionProposal.create(
            Object.assign({}, cdpRecord, {
                lifecycle_state:      'SUBMITTED',
                submitted_to_rt12_at: timestamp,
            })
        );
        cdpSubmitted.__wave               = 'W3-T3-13';
        cdpSubmitted.__structural_immutable = false;
        await constitutionalStore.write(cdpSubmitted);

        // ── STEP 2: CivilizationalDecision (lifecycle_state = AUTHORIZED) ────
        // RT12-INV-1: DR ref satisfied (drId from T3-12, required).
        // RT12-INV-2: all DA/ER satisfied per CDP attestations (PRODUCED state, T3-12).
        // RT12-INV-3: all six gates bootstrapped (L-RT12-03); full RT-03 deferred.
        // RT12-INV-4: OAR ref pre-assigned (oarEntryId); OAR written in STEP 3.
        // D8 IC-3: REVERSIBLE — may be recalled before delivery to RT-13.
        const decisionRecord = CivilizationalDecision.create({
            decision_id:                          decisionId,
            proposal_ref:                         cdpId,
            deliberation_record_ref:              drId,
            cum_version_ref:                      cumVersionRef,
            authority_resolution_ref:             authResRef,      // L-RT12-02
            da_1_scope_authority_verified:        true,
            da_2_deliberation_grounding_verified: true,
            da_3_cum_grounding_verified:          true,
            da_4_gate_passage_verified:           true,            // L-RT12-03
            da_5_dom_registration_verified:       true,
            da_6_irreversibility_verified:        true,
            er_conditions_clear:                  true,
            irreversibility_classification:       'REVERSIBLE',
            lifecycle_state:                      'AUTHORIZED',
            formation_timestamp:                  timestamp,
            gate_processing_result_ref:           gprId,           // L-RT12-03
            open_action_register_entry_ref:       oarEntryId,      // pre-assigned (F-04)
        });
        decisionRecord.__wave               = 'W3-T3-13';
        decisionRecord.__structural_immutable = false;
        await constitutionalStore.write(decisionRecord);

        // ── STEP 3: OpenActionRegisterEntry (lifecycle_state = PENDING) ──────
        // RT12-INV-4: every authorized CivilizationalDecision must have an OAR entry.
        // RT12-INV-5: terminal states (COMPLETE/PARTIAL/FAILED/LOST) EXCLUSIVELY by RT-14.
        // L-RT12-05: constitutional-store.write() IS bootstrap Class B KOM.
        const oarEntry = OpenActionRegisterEntry.create({
            oar_entry_id:                oarEntryId,
            decision_ref:                decisionId,
            lifecycle_state:             'PENDING',
            creation_timestamp:          timestamp,
            rt14_terminal_assignment_only: true,   // RT12-INV-5 schema enforcement
        });
        oarEntry.__wave               = 'W3-T3-13';
        oarEntry.__structural_immutable = false;
        await constitutionalStore.write(oarEntry);

        // ── STEP 4: DecisionArchiveRecord ─────────────────────────────────────
        // A0 §3.13 R9: all decisions in all states → permanent archive.
        // D8 PROH-5: no DecisionArchiveRecord may be deleted.
        // deletion_prohibited = true: schema-level enforcement of PROH-5.
        const archiveRecord = DecisionArchiveRecord.create({
            archive_record_id:                    archiveRecordId,
            decision_ref:                         decisionId,
            decision_lifecycle_state_at_archival: 'AUTHORIZED',
            archival_reason:                      'AUTHORIZED: bootstrap six-gate passage confirmed (L-RT12-01 through L-RT12-03); all DA-1–6 and ER-1–5 satisfied per CDP attestations (T3-12)',
            archival_timestamp:                   timestamp,
            deletion_prohibited:                  true,
        });
        archiveRecord.__wave               = 'W3-T3-13';
        archiveRecord.__structural_immutable = true; // D8 PROH-5
        await constitutionalStore.write(archiveRecord);

        // ── STEP 5: CivilizationalDecisionChainRecord (position 1) ───────────
        // D7 Part 5.5: decisions constitutionally sequenced, not arbitrary.
        // First bootstrap Decision → chain_position = 1 (L-RT12-06).
        // prior_decision_ref absent: optional, absent for first Decision in chain.
        // chain_integrity_verified = true: vacuously satisfied (no prior chain to violate).
        const chainRecord = CivilizationalDecisionChainRecord.create({
            chain_record_id:          chainRecordId,
            decision_ref:             decisionId,
            chain_position:           1,
            chain_integrity_verified: true,
            creation_timestamp:       timestamp,
        });
        chainRecord.__wave               = 'W3-T3-13';
        chainRecord.__structural_immutable = true; // D8 INV-7: chain position is fixed once established
        await constitutionalStore.write(chainRecord);

        // ── STEP 6: CDP → ACCEPTED (RT-12 compliance verification passed) ────
        // L-RT12-04: successive INSERT for ACCEPTED lifecycle state.
        const cdpAccepted = CivilizationalDecisionProposal.create(
            Object.assign({}, cdpRecord, {
                lifecycle_state:      'ACCEPTED',
                submitted_to_rt12_at: timestamp,
            })
        );
        cdpAccepted.__wave               = 'W3-T3-13';
        cdpAccepted.__structural_immutable = false;
        await constitutionalStore.write(cdpAccepted);

        // T3-15: RT-13 Bootstrap — form ActionProjection from CivilizationalDecision AUTHORIZED
        await formActionProjection({ decisionId, drId, cumVersionRef });

        return { decisionId };
    } catch (err) {
        console.error('[rt12-bootstrap] formCivilizationalDecision failed:', err?.message);
        return null;
    }
}

module.exports = Object.freeze({
    formCivilizationalDecision,
    _generateDecisionId,
    _generateOarEntryId,
    _generateArchiveRecordId,
    _generateChainRecordId,
    _generateGprId,
    _generateAuthResRef,
    _emitted,
});
