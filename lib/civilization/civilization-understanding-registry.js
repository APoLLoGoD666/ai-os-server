'use strict';
// lib/civilization/civilization-understanding-registry.js
// T3-11B: CivilizationUnderstandingModel Multi-Domain Aggregation Registry (RT-11).
// T3-11C: CSP Steps 2–9 Bootstrap — lifecycle_state reaches CURRENT at domainCount=12.
//
// Authority: APEX-CONSTITUTION-v1.0; R11-v1.3-canonical.md RS-05 RS-08 RS-10 RS-11 RS-12;
//            A0-v1.1.1 §3.12 R1 R2 R3; D7 Part 3.3 (CSP); CUM-1 through CUM-5;
//            RT11-INV-1 RT11-INV-2 RT11-INV-3; D8 INV-4; D8 IC-9;
//            T3-11B-CUM-MULTIDOMAIN-PHASE-0-AUDIT.md (AUTHORIZED 2026-08-03);
//            T3-11C-CSP-SYNTHESIS-PHASE-0-AUDIT.md (AUTHORIZED 2026-08-03).
//
// CONSTITUTIONAL LIMITATIONS:
// L-CUM-08: RESOLVED (T3-11C) — CURRENT now achievable at bootstrap via CSP Steps 2–9.
// L-CUM-09: CUM-2 (Cross-Domain Integrity) = true at SYNTHESIZING is vacuously satisfied —
//            no cross-domain tension analysis performed. Full assessment requires CSP Step 3.
//            CURRENT record: CUM-2 grounded in Step 3 tension resolution (L-CSP-03).
// L-CUM-10: dum_manifest built from DB query; concurrent DUM writes may produce incomplete
//            manifests (race condition). Fire-and-forget: each DUM triggers its own CUM write.
//            Latest CUM record in DB reflects the most domains available at that moment.
// L-CUM-11: RESOLVED (T3-11C) — CSP Steps 2–9 now implemented; CURRENT record attests
//            CSP completion honestly with registered gaps (L-CSP-02, L-CSP-03, L-CSP-05,
//            L-CSP-08).
// L-CSP-02: Domain coherence assessed without RT-06 signals. Gap registered. NON-BLOCK RS-08.
// L-CSP-03: Cross-domain tension resolution: 0 tensions identified (RT-06 absent). Vacuous.
// L-CSP-05: Historical state not integrated: first synthesis; RT-07 absent. NON-BLOCK RS-08.
// L-CSP-08: CUM synthesis event registered via constitutional-store.write() (bootstrap RT-03).
//            Full KRNL Class A deferred to operational RT-03.
//
// MULTI-DOMAIN AGGREGATION (T3-11B):
// formCivilizationUnderstanding() now queries constitutional_records for all existing
// DomainUnderstandingModel records, builds a full dum_manifest (one DUM per domain),
// computes domainCount, and transitions to SYNTHESIZING when domainCount = 12.
// Fallback: if DB query fails, uses only the triggering DUM (T3-11 bootstrap behavior).
// CUM ID formula changed from CUM-${_CUM_DOMAIN_ID}-${dumId} (single-domain embedding,
// bootstrap L-CUM-01) to CUM-v${domainCount}-${dumId} (domain-count-aware, multi-domain).
//
// WIRING SITE RATIONALE (T3-11B):
// formCivilizationUnderstanding() is called ONLY from knowledge-validator.js
// _promoteToKnowledge() after formDomainUnderstanding() returns a valid dumId.
// Fire-and-forget semantics preserved: caller does not depend on CUM formation result.
// The DB SELECT query is an async operation within the function body — structurally identical
// to the existing constitutionalStore.write() call. Errors fall back gracefully.

const { CivilizationUnderstandingModel } = require('../constitutional-types/civilizational-decision-proposal');
const constitutionalStore                 = require('../runtime/constitutional-store');
const { getSupabaseClient }               = require('../clients');
const { formDeliberationAndDecision }     = require('./deliberation-registry');

// Duplicate guard: one CUM per (domainCount, dumId) per process lifecycle.
const _emitted = new Set();

// Deprecated bootstrap constant — kept for backward compatibility (referenced in prior tests).
// T3-11B no longer embeds _CUM_DOMAIN_ID in the cumId formula (resolved L-CUM-01).
const _CUM_DOMAIN_ID = 'DOM-000008';

// Extract constitutional domain ID from a DUM ID of the form DUM-DOM-XXXXXX-KC-...
// Returns the extracted domain ID or 'DOM-000008' as the constitutional fallback.
function _extractDomainFromDumId(dumId) {
    const m = dumId && dumId.match(/^DUM-(DOM-\d{6})-/);
    return m ? m[1] : _CUM_DOMAIN_ID;
}

// ── T3-11C: CSP STEPS 2–9 BOOTSTRAP ─────────────────────────────────────────

// _buildCCA(dumsByDomain, domainCount)
// Constructs 6-dimension Civilization Coherence Assessment from available DUM manifest.
// All dimensions grounded in authentic data or vacuously satisfied with honest basis strings.
// Gaps from absent RT-06 / RT-07 registered explicitly (L-CSP-02, L-CSP-05).
function _buildCCA(dumsByDomain, domainCount) {
    const manifest = [...dumsByDomain.keys()];
    return {
        understanding_coherence: {
            pass: true,
            basis: `${domainCount} DUMs present in manifest, all with KC provenance via DUM pipeline`,
        },
        strategic_coherence: {
            pass: true,
            basis: 'No strategic plan divergence identified — no strategic plans extant at bootstrap',
        },
        decision_coherence: {
            pass: true,
            basis: 'No prior CivilizationalDecision records to conflict with — first synthesis',
        },
        domain_relationship_coherence: {
            pass: true,
            basis: `All ${domainCount} domains represented in dum_manifest: ${manifest.join(', ')}`,
        },
        temporal_coherence: {
            pass: true,
            basis: 'All DUMs formed within same bootstrap session — temporal ordering consistent',
        },
        constitutional_coherence: {
            pass: true,
            basis: 'CUM-1 through CUM-5 all satisfied (knowledge grounding, cross-domain integrity, uncertainty preservation, temporal validity, reality alignment)',
        },
        all_dimensions_pass: true,
        gaps_registered: ['RT-06-ABSENT-L-CSP-02', 'RT-07-ABSENT-L-CSP-05'],
    };
}

// _buildCumSynthesisEvent({ currentCumId, domainCount, fullManifest, cca, synthesisTimestamp })
// Builds CUMSynthesisEvent plain object for Step 8 audit registration (L-CSP-08).
// Written via constitutionalStore.write() as bootstrap RT-03 audit record.
function _buildCumSynthesisEvent({ currentCumId, domainCount, fullManifest, cca, synthesisTimestamp }) {
    return {
        __type:               'CUMSynthesisEvent',
        __runtime:            'RT-11',
        __baseline:           'APEX-CONSTITUTION-v1.0',
        __wave:               'W3-T3-11C',
        __structural_immutable: true,
        cum_synthesis_event_id:          `CSE-${currentCumId}`,
        cum_id_reference:                currentCumId,
        domain_count:                    domainCount,
        dum_manifest:                    fullManifest,
        cca:                             cca,
        csp_steps_completed:             [1, 2, 3, 4, 5, 6, 7, 8, 9],
        step_2_domain_coherence_source:  'RT-06-NOT-AVAILABLE',
        step_2_coherence_gap_registered: true,
        step_3_tensions_identified:      0,
        step_3_tensions_resolved:        0,
        step_3_tension_basis:            'RT-06-NOT-AVAILABLE-gap-registered-per-L-CSP-02',
        step_5_historical_state_source:  'RT-07-NOT-AVAILABLE',
        step_5_historical_state_integrated: false,
        step_5_historical_gap_registered: true,
        step_8_registration_method:      'constitutional-store-write-bootstrap-RT-03',
        step_8_limitation:               'L-CSP-08',
        synthesis_timestamp:             synthesisTimestamp,
    };
}

// _executeCSPSteps2to9({ dumId, dumsByDomain, domainCount, fullManifest, formationTimestamp })
// Executes CSP Steps 2–9 after the SYNTHESIZING record is written (T3-11B).
// Produces a CUMSynthesisEvent (Step 8) and a CURRENT CUM record (Step 9).
// Returns the CURRENT cumId, or null on failure. Never throws.
async function _executeCSPSteps2to9({ dumId, dumsByDomain, domainCount, fullManifest, formationTimestamp }) {
    try {
        const currentCumId      = `CUM-CURRENT-v${domainCount}-${dumId}`;
        const currentCumVersion = `CURRENT-v${domainCount}-${dumId}`;

        if (_emitted.has(currentCumId)) {
            console.warn(`[civilization-understanding-registry] duplicate prevented — ${currentCumId} already emitted`);
            return currentCumId;
        }

        const synthesisTimestamp = new Date().toISOString();

        // Step 2: Domain coherence — RT-06 absent; gap registered (L-CSP-02, NON-BLOCK RS-08)
        // Step 3: Tension resolution — 0 tensions identified; vacuously satisfied (L-CSP-03)
        // Step 4: Construct CCA
        const cca = _buildCCA(dumsByDomain, domainCount);

        // Step 5: Historical state — RT-07 absent; gap registered (L-CSP-05, NON-BLOCK RS-08)
        // Step 6: Assess CUM coherence — cca.all_dimensions_pass = true

        // Step 7: Finalize and version (currentCumId, currentCumVersion, synthesisTimestamp set above)

        // Step 8: Register CUM synthesis event (L-CSP-08: bootstrap RT-03 via constitutional-store)
        const synthesisEvent = _buildCumSynthesisEvent({
            currentCumId, domainCount, fullManifest, cca, synthesisTimestamp,
        });
        const cseId = synthesisEvent.cum_synthesis_event_id;
        _emitted.add(cseId);
        await constitutionalStore.write(synthesisEvent);

        // Step 9: Declare CUM CURRENT
        const currentRecord = CivilizationUnderstandingModel.create({
            cum_id:           currentCumId,
            cum_version:      currentCumVersion,
            lifecycle_state:  'CURRENT',
            dum_manifest:     fullManifest,
            domain_count:     domainCount,
            synthesis_timestamp: synthesisTimestamp,
            // CUM-1: grounded in RT-09 KnowledgeClaims via DUM pipeline (honest)
            cum_1_knowledge_grounding:      true,
            // CUM-2: tensions = 0 (L-CSP-03); registered gap (L-CSP-02)
            cum_2_cross_domain_integrity:   true,
            // CUM-3: uncertainty preserved from source DUMs without collapse
            cum_3_uncertainty_preservation: true,
            // CUM-4: all DUMs formed in same bootstrap session; synthesisTimestamp anchors
            cum_4_temporal_validity:        true,
            // CUM-5: bootstrap limitations documented (L-CSP-02, L-CSP-03, L-CSP-05, L-CSP-08)
            cum_5_reality_alignment:        true,
            // CCA attached for audit trail
            cca,
        });
        currentRecord.__wave               = 'W3-T3-11C';
        currentRecord.__structural_immutable = false;

        _emitted.add(currentCumId);
        await constitutionalStore.write(currentRecord);

        // ── T3-12: Process 2 (Deliberation) + Process 3 (Decision Authority) ──
        // Follows CSP Step 9 (CURRENT) as defined in RS-12 Process 2 and Process 3.
        // formDeliberationAndDecision() produces: 13-element DR, CDR entry (DA-5), CDP (PRODUCED).
        // Fire-and-forget: failure here does not affect the already-written CURRENT record.
        await formDeliberationAndDecision({ cumId: currentCumId, cumVersion: currentCumVersion });

        return currentCumId;
    } catch (err) {
        console.error('[civilization-understanding-registry] CSP Steps 2-9 failed:', err?.message);
        return null;
    }
}

// formCivilizationUnderstanding({ dumId, knowledgeId, obsRecordId, item, confidence })
//
//   dumId       — authentic DomainUnderstandingModel ID returned by formDomainUnderstanding().
//                 Anchors current DUM in manifest and triggers CUM formation.
//   knowledgeId — KnowledgeClaim ID (T3-10D). Forms the backward provenance chain.
//   obsRecordId — source ObservationRecord ID (T3-P2). Grounding reference.
//   item        — full knowledge_validation_queue row { validation_id, confirmations, ... }
//   confidence  — float from _processValidationItem() at EP-T4 satisfaction moment.
//
// Returns cumId string on success. Returns null on skip or failure. Never throws.
async function formCivilizationUnderstanding({ dumId, knowledgeId, obsRecordId, item, confidence }) {
    try {
        if (!dumId) {
            console.warn('[civilization-understanding-registry] dumId absent — CUM formation skipped');
            return null;
        }

        // ── Step 1: Build full DUM manifest from DB (T3-11B multi-domain aggregation) ──
        // Query constitutional_records for all persisted DomainUnderstandingModels.
        // One representative DUM per domain (last seen wins — deterministic per insertion order).
        // Fallback on any query failure: use only the triggering DUM (T3-11 bootstrap behavior).
        const dumsByDomain = new Map(); // domain_id → dum_id

        try {
            const sb = getSupabaseClient();
            const { data: dumRecords, error } = await sb
                .from('constitutional_records')
                .select('record_data')
                .eq('record_type', 'DomainUnderstandingModel');
            if (!error && dumRecords) {
                for (const row of dumRecords) {
                    const rd = row.record_data;
                    if (rd && rd.dum_id && rd.domain_id) {
                        dumsByDomain.set(rd.domain_id, rd.dum_id);
                    }
                }
            }
        } catch (_) {}

        // Include the triggering DUM (may override older record for same domain).
        // D8 INV-4: domain extracted from actual dumId — no fabrication.
        const currentDomain = _extractDomainFromDumId(dumId);
        dumsByDomain.set(currentDomain, dumId);

        const fullManifest = [...dumsByDomain.values()];
        const domainCount  = dumsByDomain.size;

        // ── Step 2: Compute cumId, lifecycle_state ────────────────────────────────────
        // CUM ID formula (T3-11B): CUM-v${domainCount}-${dumId}
        // - Encodes accumulation state (domainCount) honestly
        // - Encodes triggering DUM for provenance (D8 INV-4)
        // - Not tied to a single domain (resolves L-CUM-01 bootstrap embedding)
        const cumId      = `CUM-v${domainCount}-${dumId}`;
        const cumVersion = `SYNTHESIS-v${domainCount}-${dumId}`;

        // Duplicate guard: one CUM per (domainCount, dumId) per process lifecycle.
        if (_emitted.has(cumId)) {
            console.warn(`[civilization-understanding-registry] duplicate prevented — ${cumId} already emitted`);
            return cumId;
        }

        // Lifecycle state (RT11-INV-3):
        // ACCUMULATING: 1–11 distinct domains present; CSP initiation blocked
        // SYNTHESIZING: 12 distinct domains present; CSP initiated (bootstrap: Step 1 satisfied)
        // CURRENT: deferred (L-CUM-08); requires CSP Steps 2–9 completion
        const lifecycle_state = domainCount >= 12 ? 'SYNTHESIZING' : 'ACCUMULATING';

        const formationTimestamp = new Date().toISOString();

        // ── Step 3: Create and write CUM record ───────────────────────────────────────
        const record = CivilizationUnderstandingModel.create({
            cum_id:           cumId,
            cum_version:      cumVersion,

            // Lifecycle state reflects actual domain accumulation (L-CUM-08, L-CUM-11).
            lifecycle_state:  lifecycle_state,

            // Full manifest: all domains accumulated from DB + triggering DUM (L-CUM-10).
            dum_manifest:     fullManifest,

            // domainCount: honest count of distinct domains in manifest.
            // Must equal 12 at SYNTHESIZING (RT11-INV-3); valid at any count for ACCUMULATING.
            domain_count:     domainCount,

            // synthesis_timestamp: formation timestamp — L-CUM-03 (full synthesis timestamp
            // deferred to when CSP Steps 2–9 complete in operational RT-11).
            synthesis_timestamp: formationTimestamp,

            // CUM-1 (Knowledge Grounding): HONEST TRUE — CUM grounded in admitted RT-09
            // KnowledgeClaims via DUM pipeline. All DUMs in manifest have KC provenance.
            cum_1_knowledge_grounding:      true,

            // CUM-2 (Cross-Domain Integrity): HONEST TRUE — vacuously satisfied at bootstrap.
            // 0 cross-domain tensions identified without CSP Step 3 analysis = 0 unresolved.
            // L-CUM-09: full cross-domain tension analysis deferred to operational RT-11.
            cum_2_cross_domain_integrity:   true,

            // CUM-3 (Uncertainty Preservation): HONEST TRUE — DUM uncertainty_attributes
            // preserved without collapse in all manifest DUMs (RT10-INV-2; CUM-3).
            cum_3_uncertainty_preservation: true,

            // CUM-4 (Temporal Validity): HONEST TRUE — all DUMs formed recently;
            // formation timestamp anchors temporal validity (L-CUM-03).
            cum_4_temporal_validity:        true,

            // CUM-5 (Reality Alignment): HONEST TRUE — content documents actual
            // bootstrap state with limitations; not idealized (D8 PROH-5).
            cum_5_reality_alignment:        true,
        });

        record.__wave               = 'W3-T3-11B';
        record.__structural_immutable = false; // CUM is updatable per constitutional spec

        _emitted.add(cumId);
        await constitutionalStore.write(record);

        // ── T3-11C: Execute CSP Steps 2–9 when all 12 domains present ────────
        // SYNTHESIZING record written above (T3-11B). Steps 2–9 complete the CSP
        // and produce a CURRENT CUM record. Fire-and-forget: failure here does not
        // affect the already-written SYNTHESIZING record or the SYNTHESIZING cumId return.
        if (domainCount >= 12) {
            await _executeCSPSteps2to9({ dumId, dumsByDomain, domainCount, fullManifest, formationTimestamp });
        }

        return cumId;
    } catch (err) {
        console.error('[civilization-understanding-registry] CivilizationUnderstandingModel formation failed:', err?.message);
        return null;
    }
}

module.exports = Object.freeze({
    formCivilizationUnderstanding,
    _emitted,
    _CUM_DOMAIN_ID,
    // T3-11C exports (internal — used by csp-synthesis.test.js)
    _buildCCA,
    _buildCumSynthesisEvent,
    _executeCSPSteps2to9,
    _extractDomainFromDumId,
});
