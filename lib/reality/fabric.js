'use strict';

// lib/reality/fabric.js — Reality Fabric core orchestrator
// Unified model everything projects from. NOT a service — a substrate.
// Claims travel through 13 lifecycle stages. Health is 9-dimensional.

const { getSupabaseClient }              = require('../clients');
const { ChangeRecord }                   = require('../constitutional-types/change-record');
const constitutionalStore                = require('../runtime/constitutional-store');
const { createUncertaintyDescriptor }    = require('./d5-uncertainty');
const observerRegistry                   = require('./observer-registry');
const channelRegistry                    = require('./observation-channel-registry');
const { createObserverLimitationRecord } = require('./observer-limitations');
const authorityRegistry                  = require('../authority/authority-registry');

function _sb() { return getSupabaseClient(); }

// ── RT-08 / RT-02 Observer + Authority Bootstrap (T3-07 / T3-08) ──────────────
// Canonical identifiers for the APEX constitutional self-observer, its
// internal reality-fabric observation channel, and the bootstrap authority grant
// that authorizes observation. Registered once per process.

const APEX_OBSERVER_ID  = 'APEX-SYSTEM-OBSERVER';
const APEX_CHANNEL_ID   = 'APEX-FABRIC-CHANNEL';
const APEX_AUTHORITY_ID = 'AG-APEX-SYSTEM-OBSERVER-OBSERVATION-BOOTSTRAP';

let _rt08Bootstrapped = false;

function _ensureRT08Bootstrap() {
    if (_rt08Bootstrapped) return;
    if (!observerRegistry.getObserver(APEX_OBSERVER_ID)) {
        observerRegistry.registerObserver({
            observer_id:        APEX_OBSERVER_ID,
            observer_type:      'SYSTEM',
            observer_name:      'APEX Constitutional Self-Observer',
            capability_profile: Object.freeze({
                domain_scope:       ['*'],
                observation_types:  ['CLAIM', 'STATE', 'TRANSITION'],
                calibration_basis:  'APEX-CONSTITUTION-v1.0',
                known_limitations:  [
                    'single-system observer',
                    'no external verification',
                    'bootstrap authority — no FoundingRatification chain (D3 GI-5 T3-09+ scope)',
                ],
            }),
            limitation_ref: null,
        });
    }
    if (!channelRegistry.getChannel(APEX_CHANNEL_ID)) {
        channelRegistry.registerChannel({
            channel_id:        APEX_CHANNEL_ID,
            channel_name:      'APEX Reality Fabric Internal Channel',
            channel_type:      'INTERNAL',
            observer_ref:      APEX_OBSERVER_ID,
            observation_scope: 'REALITY_CLAIMS',
            observation_method: 'CLAIM_FORMATION',
        });
    }
    if (!authorityRegistry.getAuthorityGrant(APEX_AUTHORITY_ID)) {
        authorityRegistry.registerAuthorityGrant({
            authority_id:   APEX_AUTHORITY_ID,
            subject_ref:    APEX_OBSERVER_ID,
            subject_type:   'SYSTEM',
            authority_type: 'OBSERVATION',
            grant_scope:    'REALITY_CLAIMS_OBSERVATION — lib/reality/fabric.js:claimReality()',
            granted_by:     'APEX-CONSTITUTION-v1.0',
            expiry_timestamp: null,
            limitations: [
                'bootstrap authority — no FoundingRatification chain (D3 GI-5; T3-09+ scope)',
                'no RT-01 ActorProfile reference — actor identity bootstrap only',
                'no RT-03 Gate admission of authority grant creation',
                'autonomy_band not formally constrained per D4 §4.3(f) — T3-09+ scope',
            ],
        });
    }
    _rt08Bootstrapped = true;
}

// ── Stage definitions (13-stage lifecycle) ────────────────────────────────────

const STAGES = Object.freeze([
    'potential',      // 1 — exists as possibility, not yet observed
    'emergent',       // 2 — early signals detected
    'observed',       // 3 — directly seen by sensor
    'verified',       // 4 — confirmed by second source
    'contested',      // 5 — active disagreement between sources
    'revised',        // 6 — updated after challenge; revision_count++
    'deprecated',     // 7 — superseded but archived
    'superseded',     // 8 — replaced by a newer claim
    'validated',      // 9 — passed formal validation gate
    'integrated',     // 10 — absorbed into knowledge base
    'embedded',       // 11 — used in active reasoning by agents
    'critical',       // 12 — load-bearing: many downstream claims depend on it
    'evolved',        // 13 — survived ≥2 revision cycles, highest confidence
]);

const VALID_TYPES   = Object.freeze(['factual', 'causal', 'predictive', 'normative']);
const HEALTH_DIMS   = Object.freeze([
    'coverage', 'accuracy', 'freshness', 'coherence', 'completeness',
    'depth', 'evidence_quality', 'projection_alignment', 'gap_coverage',
]);

// ── Claim management ──────────────────────────────────────────────────────────

async function claimReality({ entityId, domain, content, source, claimType = 'factual', confidence = 0.5, evidence = {}, projectedBy = [] }) {
    if (!entityId || !domain || !content || !source) throw new Error('claimReality: entityId, domain, content, source required');
    if (!VALID_TYPES.includes(claimType)) throw new Error(`Invalid claim_type: ${claimType}`);

    const { data, error } = await _sb().from('reality_claims').insert({
        entity_id:    entityId,
        domain,
        claim_type:   claimType,
        content,
        stage:        'potential',
        confidence:   Math.min(1, Math.max(0, confidence)),
        source,
        evidence,
        projected_by: projectedBy,
    }).select('id').single();

    if (error) throw new Error(`claimReality insert failed: ${error.message}`);

    await _recordEvent({ claimId: data.id, fromStage: null, toStage: 'potential', trigger: 'created', actor: source });

    // Constitutional wiring — ChangeRecord — fire-and-forget (CONSTITUTIONAL WIRING PATTERN v1.0)
    const _cr_claimId = data.id; const _cr_source = source; const _cr_ts = new Date().toISOString();
    setImmediate(async () => {
        try {
            const record = ChangeRecord.create({
                change_id:             `CR-${_cr_claimId}-${Date.now()}`,
                claim_ref:             _cr_claimId,
                stage_to:              'potential',
                transition_vector:     'created',
                timestamp:             _cr_ts,
                actor_ref:             _cr_source,
                historical_anchor_ref: `ANCHOR-${_cr_claimId}`,
            });
            await constitutionalStore.write(record);
        } catch (err) {
            console.error('[constitutional-record] ChangeRecord failed:', err?.message);
        }
    });

    // Constitutional wiring — ObservationRecord — fire-and-forget (T3-07; RT08-INV-1; D5 §3.2)
    // L-01: authority_ref absent — RT-02 T3-08 scope; ObservationRecord built without .create()
    // L-02: contact_timestamp = claim reception time (honest proxy; no separate signal tracking)
    // T3-P2: obsRecordId captured synchronously before setImmediate so it can be returned to
    // caller and propagated to the RT-09 pipeline (EvidenceObject.observation_projection_ref).
    const _obs_claimId      = data.id;
    const _obs_entityId     = entityId;
    const _obs_domain       = domain;
    const _obs_content      = content;
    const _obs_source       = source;
    const _obs_conf         = Math.min(1, Math.max(0, confidence));
    const _obs_ts           = new Date().toISOString(); // claim reception time = contact_timestamp
    const _obs_obsRecordId  = `OBS-${data.id}-${Date.now()}`; // pre-captured at claim time (T3-P2)
    setImmediate(async () => {
        try {
            _ensureRT08Bootstrap();
            const observer = observerRegistry.getObserver(APEX_OBSERVER_ID);
            const cap      = observer?.capability_profile ?? { observer_id: APEX_OBSERVER_ID };

            // D5 §3.2 atomic uncertainty capture
            const d5 = createUncertaintyDescriptor({
                uncertainty_source:             _obs_source,
                uncertainty_confidence:         _obs_conf,
                uncertainty_limitations:        (cap.known_limitations || []).slice(),
                uncertainty_observer_capability: { ...cap },
            });

            const obsRecordId = _obs_obsRecordId; // use pre-captured ID (T3-P2)

            // RT08-INV-3: ObserverLimitationRecord formed concurrently
            const limitation = createObserverLimitationRecord({
                observer_id:           APEX_OBSERVER_ID,
                observation_record_ref: obsRecordId,
                capability_snapshot:   { ...cap },
            });

            // RT-02 authority validation: grant must exist and be ACTIVE
            const authorityGrant = authorityRegistry.getAuthorityGrant(APEX_AUTHORITY_ID);
            if (!authorityGrant || authorityGrant.status !== 'ACTIVE') {
                console.error('[constitutional-record] authority grant invalid or revoked — ObservationRecord emission skipped');
                return;
            }

            const obsRecord = {
                __type:               'ObservationRecord',
                __runtime:            'RT-08',
                __baseline:           'APEX-CONSTITUTION-v1.0',
                __version:            '1.0.0',
                __wave:               'W3-T3-08',
                __structural_immutable: true,
                record_id:                     obsRecordId,
                observer_identity_ref:         APEX_OBSERVER_ID,
                observation_channel_ref:       APEX_CHANNEL_ID,
                external_referent_id:          _obs_entityId,
                external_state_description:    _obs_content,
                d5_uncertainty_source:         d5.uncertainty_source,
                d5_uncertainty_confidence:     String(d5.uncertainty_confidence),
                d5_uncertainty_limitations:    JSON.stringify(d5.uncertainty_limitations),
                d5_uncertainty_timestamp:      d5.uncertainty_timestamp,
                d5_uncertainty_observer_capability: JSON.stringify(d5.uncertainty_observer_capability),
                domain_attribution:            _obs_domain,
                internal_external_marker:      true,
                authority_ref:                 APEX_AUTHORITY_ID,
                contact_timestamp:             _obs_ts,
                formation_timestamp:           d5.uncertainty_timestamp,
                observer_limitation_ref:       limitation.limitation_id,
            };

            await constitutionalStore.write(obsRecord);

            // Constitutional wiring — EvidenceObject (T3-10) + InterpretationRecord (T3-10B) — D3 Epistemic Chain Stages 2-3
            try {
                const evidenceRegistry = require('../knowledge/evidence-object-registry');
                const evidenceId = await evidenceRegistry.formEvidence({
                    obsRecordId,
                    domainName:      _obs_domain,
                    uncertaintySrc:  obsRecord.d5_uncertainty_source,
                    uncertaintyConf: obsRecord.d5_uncertainty_confidence,
                    uncertaintyLims: obsRecord.d5_uncertainty_limitations,
                    uncertaintyTs:   obsRecord.d5_uncertainty_timestamp,
                    uncertaintyCap:  obsRecord.d5_uncertainty_observer_capability,
                });

                // InterpretationRecord — T3-10B; D3 Epistemic Chain Stage 3; KI-007 (FORMING bootstrap)
                if (evidenceId) {
                    const interpretationRegistry = require('../knowledge/interpretation-record-registry');
                    const interpretationId = await interpretationRegistry.formInterpretation({
                        evidenceId,
                        domainName:      _obs_domain,
                        obsRecordId,
                        uncertaintyConf: obsRecord.d5_uncertainty_confidence,
                    });

                    // BeliefObject — T3-10C; D3 Epistemic Chain Stage 4; RT09-INV-5 (FORMING bootstrap)
                    if (interpretationId) {
                        const beliefRegistry = require('../knowledge/belief-object-registry');
                        await beliefRegistry.formBelief({
                            interpretationId,
                            domainName:      _obs_domain,
                            obsRecordId,
                            uncertaintyConf: obsRecord.d5_uncertainty_confidence,
                        });
                    }
                }
            } catch (err) {
                console.error('[constitutional-record] Epistemic chain formation failed:', err?.message);
            }
        } catch (err) {
            console.error('[constitutional-record] ObservationRecord failed:', err?.message);
        }
    });

    return { claimId: data.id, obsRecordId: _obs_obsRecordId };
}

async function advanceClaim({ claimId, toStage, trigger, actor = 'system', evidence = {} }) {
    if (!STAGES.includes(toStage)) throw new Error(`Invalid stage: ${toStage}`);

    const { data: current, error: fetchErr } = await _sb()
        .from('reality_claims').select('stage, revision_count').eq('id', claimId).single();
    if (fetchErr) throw new Error(`advanceClaim fetch failed: ${fetchErr.message}`);

    const updates = { stage: toStage, stage_entered_at: new Date().toISOString(), updated_at: new Date().toISOString() };
    if (toStage === 'revised') updates.revision_count = (current.revision_count || 0) + 1;

    const { error: updateErr } = await _sb().from('reality_claims').update(updates).eq('id', claimId);
    if (updateErr) throw new Error(`advanceClaim update failed: ${updateErr.message}`);

    await _recordEvent({ claimId, fromStage: current.stage, toStage, trigger, actor, evidence });
    // Constitutional wiring — fire-and-forget (CONSTITUTIONAL WIRING PATTERN v1.0)
    const _ac_claimId = claimId; const _ac_fromStage = current.stage; const _ac_toStage = toStage;
    const _ac_trigger = trigger; const _ac_actor = actor; const _ac_ts = new Date().toISOString();
    setImmediate(async () => {
        try {
            const record = ChangeRecord.create({
                change_id:             `CR-${_ac_claimId}-${Date.now()}`,
                claim_ref:             _ac_claimId,
                stage_from:            _ac_fromStage,
                stage_to:              _ac_toStage,
                transition_vector:     _ac_trigger || 'advance',
                timestamp:             _ac_ts,
                actor_ref:             _ac_actor || 'system',
                historical_anchor_ref: `ANCHOR-${_ac_claimId}`,
            });
            await constitutionalStore.write(record);
        } catch (err) {
            console.error('[constitutional-record] ChangeRecord failed:', err?.message);
        }
    });
    return { claimId, fromStage: current.stage, toStage };
}

async function updateClaimConfidence(claimId, confidence, source) {
    const { error } = await _sb().from('reality_claims')
        .update({ confidence: Math.min(1, Math.max(0, confidence)), updated_at: new Date().toISOString() })
        .eq('id', claimId);
    if (error) throw new Error(`updateClaimConfidence failed: ${error.message}`);
}

async function getClaimsForEntity(entityId, opts = {}) {
    let q = _sb().from('reality_claims').select('*').eq('entity_id', entityId);
    if (opts.stage)  q = q.eq('stage', opts.stage);
    if (opts.domain) q = q.eq('domain', opts.domain);
    q = q.order('updated_at', { ascending: false }).limit(opts.limit || 100);
    const { data, error } = await q;
    if (error) throw new Error(`getClaimsForEntity failed: ${error.message}`);
    return data || [];
}

async function getClaimsByDomain(domain, stage, limit = 50) {
    let q = _sb().from('reality_claims').select('*').eq('domain', domain);
    if (stage) q = q.eq('stage', stage);
    const { data, error } = await q.order('updated_at', { ascending: false }).limit(limit);
    if (error) throw new Error(`getClaimsByDomain failed: ${error.message}`);
    return data || [];
}

// ── Reality Health ────────────────────────────────────────────────────────────

async function scoreRealityHealth(entityId, entityType = 'domain') {
    const claims = await getClaimsForEntity(entityId, { limit: 500 });
    const scores = {};

    const total = claims.length;
    const verified = claims.filter(c => ['verified', 'validated', 'integrated', 'embedded', 'critical', 'evolved'].includes(c.stage)).length;
    const fresh  = claims.filter(c => {
        const age = Date.now() - new Date(c.updated_at).getTime();
        return age < 24 * 60 * 60 * 1000;
    }).length;
    const contested = claims.filter(c => c.stage === 'contested').length;
    const withEvidence = claims.filter(c => c.evidence && Object.keys(c.evidence).length > 0).length;
    const embedded = claims.filter(c => ['embedded', 'critical', 'evolved'].includes(c.stage)).length;
    const evolved  = claims.filter(c => c.stage === 'evolved').length;
    const multiProjected = claims.filter(c => Array.isArray(c.projected_by) && c.projected_by.length > 1).length;

    scores.coverage             = Math.min(100, total * 2);
    scores.accuracy             = total > 0 ? Math.round((verified / total) * 100) : 0;
    scores.freshness            = total > 0 ? Math.round((fresh / total) * 100) : 0;
    scores.coherence            = total > 0 ? Math.round(((total - contested) / total) * 100) : 100;
    scores.completeness         = Math.min(100, Math.round((verified / Math.max(total, 1)) * 100));
    scores.depth                = Math.min(100, embedded * 5);
    scores.evidence_quality     = total > 0 ? Math.round((withEvidence / total) * 100) : 0;
    scores.projection_alignment = total > 0 ? Math.round((multiProjected / total) * 100) : 0;
    scores.gap_coverage         = Math.min(100, evolved * 10);

    const rows = HEALTH_DIMS.map(dim => ({
        entity_type: entityType,
        entity_id:   entityId,
        dimension:   dim,
        score:       scores[dim] ?? 0,
        detail:      { total, verified, fresh, contested, with_evidence: withEvidence, embedded, evolved, multi_projected: multiProjected },
        measured_at: new Date().toISOString(),
    }));

    const { error } = await _sb().from('reality_health_scores')
        .upsert(rows, { onConflict: 'entity_id,dimension' });
    if (error) throw new Error(`scoreRealityHealth upsert failed: ${error.message}`);

    const composite = Math.round(Object.values(scores).reduce((s, v) => s + v, 0) / HEALTH_DIMS.length);
    return { entityId, entityType, scores, composite };
}

async function getRealityHealth(entityId) {
    const { data, error } = await _sb().from('reality_health_scores')
        .select('*').eq('entity_id', entityId).order('measured_at', { ascending: false });
    if (error) throw new Error(`getRealityHealth failed: ${error.message}`);
    return data || [];
}

async function getSystemRealityHealth() {
    const domains = ['civilisation', 'intelligence', 'registry', 'memory', 'infrastructure', 'observability', 'interface', 'knowledge', 'development', 'experiments'];
    const results = await Promise.allSettled(domains.map(d => scoreRealityHealth(d, 'domain')));
    return results.map((r, i) => r.status === 'fulfilled' ? r.value : { domain: domains[i], error: r.reason?.message });
}

async function writeBaselineCheckpoint() {
    const health = await getSystemRealityHealth();
    const { error } = await _sb().from('apex_sync_checkpoints').upsert({
        key:        'reality-architecture-baseline',
        value:      JSON.stringify({ ts: new Date().toISOString(), health }),
        updated_at: new Date().toISOString(),
    }, { onConflict: 'key' });
    if (error) throw new Error(`writeBaselineCheckpoint failed: ${error.message}`);
    return health;
}

// ── Constitutional query interface — Gate 6 data source (W2-04) ───────────────

// getChangeHistory — returns the lifecycle event history for a claim.
// This is the designated data source for Gate 6 (constitutional-gate.js check 6).
// Reads from claim_lifecycle_events (the existing legacy audit table).
// Callers pre-fetch via this function and pass the result to the gate via
// options.changeRecord for synchronous Gate 6 validation.
async function getChangeHistory(claimId, limit = 20) {
    const { data, error } = await _sb()
        .from('claim_lifecycle_events')
        .select('*')
        .eq('claim_id', claimId)
        .order('created_at', { ascending: false })
        .limit(limit);
    if (error) throw new Error(`getChangeHistory failed: ${error.message}`);
    return data || [];
}

// ── Internal helpers ──────────────────────────────────────────────────────────

async function _recordEvent({ claimId, fromStage, toStage, trigger, actor, evidence = {} }) {
    try {
        await _sb().from('claim_lifecycle_events').insert({
            claim_id:   claimId,
            from_stage: fromStage || null,
            to_stage:   toStage,
            trigger,
            actor:      actor || 'system',
            evidence,
        });
    } catch (_) {
        // non-fatal: audit trail must never block primary operations
    }
}

module.exports = {
    STAGES,
    HEALTH_DIMS,
    claimReality,
    advanceClaim,
    updateClaimConfidence,
    getClaimsForEntity,
    getClaimsByDomain,
    scoreRealityHealth,
    getRealityHealth,
    getSystemRealityHealth,
    writeBaselineCheckpoint,
    getChangeHistory,
};
