'use strict';

// lib/attention/attention-manager.js — Persistent attention profile management
// Extends attention-engine.js (pure scorer) with DB persistence.
// Tracks demand, debt, pressure, priority as first-class entity properties.

const { getSupabaseClient } = require('../clients');
const { score: computeScore } = require('./attention-engine');

function _sb() { return getSupabaseClient(); }

async function updateAttentionProfile({ entityId, entityType = 'domain', domain, demand, debt, pressure, priority, detail = {} }) {
    if (!entityId || !domain) throw new Error('updateAttentionProfile: entityId and domain required');

    const attentionScore = computeScore({
        goalPriority:    demand ?? 0.5,
        risk:            pressure ?? 0.5,
        urgency:         Math.min(1, (debt ?? 0) / 10),
    }).score;

    const { error } = await _sb().from('attention_profiles').upsert({
        entity_id:      entityId,
        entity_type:    entityType,
        domain,
        demand:         Math.min(1, Math.max(0, demand ?? 0.5)),
        debt:           Math.max(0, debt ?? 0),
        pressure:       Math.min(1, Math.max(0, pressure ?? 0.5)),
        priority:       Math.round(priority ?? 5),
        attention_score: attentionScore,
        last_scored_at:  new Date().toISOString(),
        detail,
        updated_at:      new Date().toISOString(),
    }, { onConflict: 'entity_id,domain' });
    if (error) throw new Error(`updateAttentionProfile failed: ${error.message}`);
    return { entityId, domain, attentionScore };
}

async function getAttentionProfile(entityId, domain) {
    let q = _sb().from('attention_profiles').select('*').eq('entity_id', entityId);
    if (domain) q = q.eq('domain', domain);
    const { data, error } = await q.order('attention_score', { ascending: false });
    if (error) throw new Error(`getAttentionProfile failed: ${error.message}`);
    return data || [];
}

async function getTopAttentionItems(limit = 10) {
    const { data, error } = await _sb().from('attention_profiles').select('*')
        .order('attention_score', { ascending: false }).limit(limit);
    if (error) throw new Error(`getTopAttentionItems failed: ${error.message}`);
    return data || [];
}

async function getHighDebtItems(debtThreshold = 5, limit = 10) {
    const { data, error } = await _sb().from('attention_profiles').select('*')
        .gte('debt', debtThreshold).order('debt', { ascending: false }).limit(limit);
    if (error) throw new Error(`getHighDebtItems failed: ${error.message}`);
    return data || [];
}

async function seedDomainAttentionProfiles() {
    const domains = [
        { entityId: 'civilisation', domain: 'civilisation', demand: 0.9, pressure: 0.8, priority: 1 },
        { entityId: 'intelligence', domain: 'intelligence', demand: 0.8, pressure: 0.7, priority: 2 },
        { entityId: 'governance',   domain: 'governance',   demand: 0.7, pressure: 0.8, priority: 1 },
        { entityId: 'memory',       domain: 'memory',       demand: 0.6, pressure: 0.5, priority: 3 },
        { entityId: 'registry',     domain: 'registry',     demand: 0.5, pressure: 0.4, priority: 4 },
        { entityId: 'knowledge',    domain: 'knowledge',    demand: 0.6, pressure: 0.4, priority: 3 },
        { entityId: 'infrastructure', domain: 'infrastructure', demand: 0.7, pressure: 0.6, priority: 2 },
        { entityId: 'observability', domain: 'observability', demand: 0.5, pressure: 0.5, priority: 4 },
        { entityId: 'development',  domain: 'development',  demand: 0.6, pressure: 0.5, priority: 3 },
        { entityId: 'experiments',  domain: 'experiments',  demand: 0.3, pressure: 0.3, priority: 7 },
    ];
    const results = await Promise.allSettled(domains.map(d => updateAttentionProfile(d)));
    return results.filter(r => r.status === 'fulfilled').length;
}

module.exports = { updateAttentionProfile, getAttentionProfile, getTopAttentionItems, getHighDebtItems, seedDomainAttentionProfiles };
