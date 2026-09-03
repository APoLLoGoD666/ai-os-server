'use strict';

// lib/epistemic-capital/index.js — Epistemic Capital balance sheet
// 4 dimensions: credibility, accuracy, calibration, evidence_quality
// Transfer coefficients: adjacent domains 0.7, non-adjacent 0.2

const { getSupabaseClient } = require('../clients');

function _sb() { return getSupabaseClient(); }

const DIMENSIONS = Object.freeze(['credibility', 'accuracy', 'calibration', 'evidence_quality']);

// Domain adjacency map — determines transfer coefficient
const ADJACENT_DOMAINS = Object.freeze({
    civilisation: ['intelligence', 'governance', 'memory'],
    intelligence: ['civilisation', 'observability', 'knowledge'],
    registry:     ['development', 'governance', 'knowledge'],
    memory:       ['civilisation', 'intelligence', 'knowledge'],
    infrastructure: ['development', 'observability'],
    observability:  ['infrastructure', 'intelligence', 'governance'],
    interface:      ['civilisation', 'knowledge'],
    knowledge:      ['memory', 'intelligence', 'registry'],
    development:    ['registry', 'infrastructure'],
    experiments:    ['development', 'intelligence'],
});

function _transferCoefficient(fromDomain, toDomain) {
    if (fromDomain === toDomain) return 1.0;
    const adjacent = ADJACENT_DOMAINS[fromDomain] || [];
    return adjacent.includes(toDomain) ? 0.7 : 0.2;
}

// ── Balance sheet operations ───────────────────────────────────────────────────

async function updateEC({ holderId, domain, dimension, score, basisCount = 0, detail = {} }) {
    if (!DIMENSIONS.includes(dimension)) throw new Error(`Invalid EC dimension: ${dimension}`);
    const { error } = await _sb().from('epistemic_capital').upsert({
        holder_id:   holderId,
        domain,
        dimension,
        score:       Math.min(100, Math.max(0, score)),
        basis_count: basisCount,
        detail,
        measured_at: new Date().toISOString(),
    }, { onConflict: 'holder_id,domain,dimension' });
    if (error) throw new Error(`updateEC failed: ${error.message}`);
}

async function getEC(holderId, domain) {
    let q = _sb().from('epistemic_capital').select('*').eq('holder_id', holderId);
    if (domain) q = q.eq('domain', domain);
    const { data, error } = await q.order('dimension');
    if (error) throw new Error(`getEC failed: ${error.message}`);
    return data || [];
}

async function transferEC({ holderId, fromDomain, toDomain, dimension, amount, reason }) {
    const coeff     = _transferCoefficient(fromDomain, toDomain);
    const netAmount = Math.round(amount * coeff * 10) / 10;

    const { error: txErr } = await _sb().from('ec_transactions').insert({
        holder_id:   holderId,
        from_domain: fromDomain,
        to_domain:   toDomain,
        dimension,
        amount,
        coefficient: coeff,
        net_transfer: netAmount,
        reason:      reason || null,
    });
    if (txErr) throw new Error(`transferEC log failed: ${txErr.message}`);

    const { data: dest } = await _sb().from('epistemic_capital').select('score, basis_count')
        .eq('holder_id', holderId).eq('domain', toDomain).eq('dimension', dimension).single();

    const newScore = Math.min(100, (dest?.score || 50) + netAmount);
    await updateEC({ holderId, domain: toDomain, dimension, score: newScore, basisCount: (dest?.basis_count || 0) + 1 });

    return { fromDomain, toDomain, dimension, amount, coefficient: coeff, netAmount, newScore };
}

async function computeCompositeEC(holderId, domain) {
    const rows = await getEC(holderId, domain);
    if (!rows.length) return { holderId, domain, composite: 50, dimensions: {} };
    const byDim = {};
    for (const r of rows) byDim[r.dimension] = r.score;
    const composite = Math.round(Object.values(byDim).reduce((s, v) => s + v, 0) / DIMENSIONS.length);
    return { holderId, domain, composite, dimensions: byDim };
}

module.exports = { DIMENSIONS, ADJACENT_DOMAINS, updateEC, getEC, transferEC, computeCompositeEC, _transferCoefficient };
