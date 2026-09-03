'use strict';

// lib/understanding/index.js — Understanding Layer
// Measures how accurately APEX models what exists.
// Understanding = how well the model of X matches X. Distinct from Knowledge (the facts themselves).

const { getSupabaseClient } = require('../clients');
const fabric = require('../reality/fabric');

function _sb() { return getSupabaseClient(); }

const DIMENSIONS = Object.freeze([
    'structural',   // knows the shape/boundaries of the entity
    'behavioral',   // knows how it acts/reacts
    'relational',   // knows its connections to other entities
    'temporal',     // knows its change patterns over time
    'causal',       // knows what causes its state changes
    'predictive',   // can predict its future states
]);

// ── Score computation ─────────────────────────────────────────────────────────

async function scoreUnderstanding(entityId, domain) {
    if (!entityId || !domain) throw new Error('scoreUnderstanding: entityId and domain required');

    const claims    = await fabric.getClaimsForEntity(entityId, { limit: 200 });
    const health    = await fabric.getRealityHealth(entityId);

    const byType = {
        factual:    claims.filter(c => c.claim_type === 'factual'),
        causal:     claims.filter(c => c.claim_type === 'causal'),
        predictive: claims.filter(c => c.claim_type === 'predictive'),
        normative:  claims.filter(c => c.claim_type === 'normative'),
    };
    const verifiedFrac = claims.length > 0
        ? claims.filter(c => ['verified', 'validated', 'integrated', 'embedded', 'critical', 'evolved'].includes(c.stage)).length / claims.length
        : 0;
    const healthComposite = health.length > 0 ? health.reduce((s, h) => s + h.score, 0) / health.length : 0;

    const scores = {
        structural:  Math.min(100, (byType.factual.length * 3) + (verifiedFrac * 20)),
        behavioral:  Math.min(100, (byType.causal.length * 5) + (verifiedFrac * 20)),
        relational:  Math.min(100, (claims.filter(c => c.projected_by?.length > 1).length * 4)),
        temporal:    Math.min(100, (claims.filter(c => c.revision_count > 0).length * 5) + (verifiedFrac * 20)),
        causal:      Math.min(100, (byType.causal.length * 8) + (verifiedFrac * 15)),
        predictive:  Math.min(100, (byType.predictive.length * 6) + (verifiedFrac * 20)),
    };

    const composite = Math.round(Object.values(scores).reduce((s, v) => s + v, 0) / DIMENSIONS.length);

    const rows = DIMENSIONS.map(dim => ({
        entity_id:   entityId,
        domain,
        dimension:   dim,
        score:       Math.round(scores[dim]),
        basis:       `${claims.length} claims, ${Math.round(verifiedFrac * 100)}% verified`,
        detail:      { total_claims: claims.length, verified_frac: verifiedFrac, health_composite: Math.round(healthComposite) },
        measured_at: new Date().toISOString(),
    }));

    const { error } = await _sb().from('understanding_scores').upsert(rows, { onConflict: 'entity_id,dimension' });
    if (error) throw new Error(`scoreUnderstanding upsert failed: ${error.message}`);

    return { entityId, domain, scores, composite };
}

async function getUnderstanding(entityId) {
    const { data, error } = await _sb().from('understanding_scores').select('*').eq('entity_id', entityId);
    if (error) throw new Error(`getUnderstanding failed: ${error.message}`);
    return data || [];
}

// ── Gap detection ─────────────────────────────────────────────────────────────

async function detectGaps(entityId, domain) {
    const scores = await scoreUnderstanding(entityId, domain);
    const gaps   = [];

    for (const [dim, score] of Object.entries(scores.scores)) {
        if (score < 30) {
            gaps.push({
                entity_id:   entityId,
                domain,
                gap_type:    `low_${dim}_understanding`,
                description: `${dim} understanding score is critically low (${Math.round(score)}/100)`,
                severity:    'high',
                evidence:    { dimension: dim, score: Math.round(score) },
            });
        } else if (score < 60) {
            gaps.push({
                entity_id:   entityId,
                domain,
                gap_type:    `partial_${dim}_understanding`,
                description: `${dim} understanding score is below threshold (${Math.round(score)}/100)`,
                severity:    'medium',
                evidence:    { dimension: dim, score: Math.round(score) },
            });
        }
    }

    if (gaps.length > 0) {
        const { error } = await _sb().from('understanding_gaps').insert(gaps);
        if (error) throw new Error(`detectGaps insert failed: ${error.message}`);
    }

    return { entityId, gapsDetected: gaps.length, gaps };
}

async function resolveGap(gapId) {
    const { error } = await _sb().from('understanding_gaps')
        .update({ resolved: true, resolved_at: new Date().toISOString() })
        .eq('id', gapId);
    if (error) throw new Error(`resolveGap failed: ${error.message}`);
}

module.exports = { DIMENSIONS, scoreUnderstanding, getUnderstanding, detectGaps, resolveGap };
