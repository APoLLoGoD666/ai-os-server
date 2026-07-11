'use strict';

// lib/reality/fabric.js — Reality Fabric core orchestrator
// Unified model everything projects from. NOT a service — a substrate.
// Claims travel through 13 lifecycle stages. Health is 9-dimensional.

const { getSupabaseClient } = require('../clients');

function _sb() { return getSupabaseClient(); }

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
    return data.id;
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
};
