'use strict';

// lib/beliefs/index.js — Beliefs Layer
// Held propositions not yet at evidence threshold for Knowledge.
// Residual beliefs (survived ≥2 revision attempts) are tracked as most dangerous epistemic state.

const { getSupabaseClient } = require('../clients');

function _sb() { return getSupabaseClient(); }

const EVIDENCE_THRESHOLD = 0.85;
const RESIDUAL_THRESHOLD = 2;

async function formBelief({ holderId, domain, proposition, confidence = 0.5, source, tags = [] }) {
    if (!holderId || !domain || !proposition) throw new Error('formBelief: holderId, domain, proposition required');
    const { data, error } = await _sb().from('beliefs').insert({
        holder_id:  holderId,
        domain,
        proposition,
        confidence: Math.min(1, Math.max(0, confidence)),
        source:     source || null,
        tags:       tags,
    }).select('id').single();
    if (error) throw new Error(`formBelief failed: ${error.message}`);
    return data.id;
}

async function reviseBelief({ beliefId, newConfidence, reason, challengerId, evidence = {}, survived = null }) {
    const { data: current, error: fetchErr } = await _sb()
        .from('beliefs').select('confidence, revision_count, status').eq('id', beliefId).single();
    if (fetchErr) throw new Error(`reviseBelief fetch failed: ${fetchErr.message}`);

    const prevConf = current.confidence;
    const newCount = (current.revision_count || 0) + 1;

    const { error: insErr } = await _sb().from('belief_revisions').insert({
        belief_id:      beliefId,
        previous_conf:  prevConf,
        new_conf:       newConfidence ?? prevConf,
        revision_type:  survived === false ? 'challenge_rejected' : survived === true ? 'challenge_survived' : 'update',
        reason:         reason || null,
        challenger_id:  challengerId || null,
        evidence,
        survived:       survived ?? null,
    });
    if (insErr) throw new Error(`reviseBelief revision insert failed: ${insErr.message}`);

    const updates = {
        revision_count: newCount,
        last_tested_at: new Date().toISOString(),
        updated_at:     new Date().toISOString(),
    };
    if (newConfidence !== undefined) updates.confidence = Math.min(1, Math.max(0, newConfidence));
    if (newCount >= RESIDUAL_THRESHOLD && survived !== false) updates.status = 'residual';
    if ((newConfidence ?? prevConf) >= EVIDENCE_THRESHOLD) updates.status = 'promoted';

    const { error: updErr } = await _sb().from('beliefs').update(updates).eq('id', beliefId);
    if (updErr) throw new Error(`reviseBelief update failed: ${updErr.message}`);

    return { beliefId, prevConf, newConf: newConfidence ?? prevConf, revisionCount: newCount, status: updates.status };
}

async function getBeliefs(holderId, opts = {}) {
    let q = _sb().from('beliefs').select('*').eq('holder_id', holderId);
    if (opts.status) q = q.eq('status', opts.status);
    if (opts.domain) q = q.eq('domain', opts.domain);
    const { data, error } = await q.order('confidence', { ascending: false }).limit(opts.limit || 100);
    if (error) throw new Error(`getBeliefs failed: ${error.message}`);
    return data || [];
}

async function getResidualBeliefs(domain) {
    let q = _sb().from('beliefs').select('*').eq('status', 'residual');
    if (domain) q = q.eq('domain', domain);
    const { data, error } = await q.order('updated_at', { ascending: false });
    if (error) throw new Error(`getResidualBeliefs failed: ${error.message}`);
    return data || [];
}

async function computeBeliefRealityGap(domain) {
    const { data: beliefs, error } = await _sb().from('beliefs').select('*')
        .eq('domain', domain).eq('status', 'active');
    if (error) throw new Error(`computeBeliefRealityGap fetch failed: ${error.message}`);

    const total   = (beliefs || []).length;
    const residual = (beliefs || []).filter(b => b.status === 'residual').length;
    const highConf = (beliefs || []).filter(b => b.confidence > 0.8).length;
    const stale    = (beliefs || []).filter(b => {
        if (!b.last_tested_at) return true;
        return Date.now() - new Date(b.last_tested_at).getTime() > 7 * 24 * 60 * 60 * 1000;
    }).length;

    return {
        domain,
        total_beliefs:    total,
        residual_beliefs: residual,
        high_confidence:  highConf,
        stale_beliefs:    stale,
        gap_score:        total > 0 ? Math.round(((residual + stale) / total) * 100) : 0,
    };
}

async function logBeliefRealityGap(domain) {
    const gap = await computeBeliefRealityGap(domain);
    await _sb().from('belief_reality_gap_log').insert({
        domain,
        gap_score:        gap.gap_score,
        total_beliefs:    gap.total_beliefs,
        residual_beliefs: gap.residual_beliefs,
        stale_beliefs:    gap.stale_beliefs,
    });
    return gap;
}

module.exports = { formBelief, reviseBelief, getBeliefs, getResidualBeliefs, computeBeliefRealityGap, logBeliefRealityGap, EVIDENCE_THRESHOLD, RESIDUAL_THRESHOLD };
