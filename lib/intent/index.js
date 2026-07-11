'use strict';

// lib/intent/index.js — Intent Layer
// Every agent action is preceded by an intent record and followed by attribution closure.
// Intent sits between Decision and Action in the causal chain.

const { getSupabaseClient } = require('../clients');

function _sb() { return getSupabaseClient(); }

const INTENT_TYPES = Object.freeze(['goal_pursuit', 'risk_mitigation', 'exploration', 'maintenance', 'governance', 'correction']);

async function recordIntent({ actorId, domain, goal, rationale, intentType = 'goal_pursuit', expectedImpact = {}, alternativesConsidered = [], confidence = 0.5, actionRef }) {
    if (!actorId || !domain || !goal) throw new Error('recordIntent: actorId, domain, goal required');
    if (!INTENT_TYPES.includes(intentType)) throw new Error(`Invalid intent_type: ${intentType}`);

    const { data, error } = await _sb().from('intent_records').insert({
        actor_id:               actorId,
        domain,
        goal,
        rationale:              rationale || null,
        intent_type:            intentType,
        expected_impact:        expectedImpact,
        alternative_considered: alternativesConsidered,
        confidence:             Math.min(1, Math.max(0, confidence)),
        action_ref:             actionRef || null,
    }).select('id').single();
    if (error) throw new Error(`recordIntent failed: ${error.message}`);
    return data.id;
}

async function closeAttribution({ intentId, outcomeRef, outcomeMatched, evidence = {} }) {
    const { error } = await _sb().from('intent_records').update({
        attribution_closed: true,
        outcome_ref:        outcomeRef || null,
        outcome_matched:    outcomeMatched ?? null,
        closed_at:          new Date().toISOString(),
    }).eq('id', intentId);
    if (error) throw new Error(`closeAttribution failed: ${error.message}`);
}

async function getOpenIntents(actorId, domain) {
    let q = _sb().from('intent_records').select('*').eq('attribution_closed', false);
    if (actorId) q = q.eq('actor_id', actorId);
    if (domain)  q = q.eq('domain', domain);
    const { data, error } = await q.order('created_at', { ascending: false }).limit(50);
    if (error) throw new Error(`getOpenIntents failed: ${error.message}`);
    return data || [];
}

async function getIntentsByActor(actorId, limit = 50) {
    const { data, error } = await _sb().from('intent_records').select('*')
        .eq('actor_id', actorId).order('created_at', { ascending: false }).limit(limit);
    if (error) throw new Error(`getIntentsByActor failed: ${error.message}`);
    return data || [];
}

async function intentAttributionRate(actorId) {
    const { data, error } = await _sb().from('intent_records').select('attribution_closed, outcome_matched')
        .eq('actor_id', actorId);
    if (error) throw new Error(`intentAttributionRate failed: ${error.message}`);
    const total  = (data || []).length;
    const closed = (data || []).filter(r => r.attribution_closed).length;
    const matched = (data || []).filter(r => r.outcome_matched === true).length;
    return { actorId, total, closed, matched, closureRate: total > 0 ? closed / total : 0, matchRate: closed > 0 ? matched / closed : 0 };
}

module.exports = { INTENT_TYPES, recordIntent, closeAttribution, getOpenIntents, getIntentsByActor, intentAttributionRate };
