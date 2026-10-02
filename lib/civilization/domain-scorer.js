'use strict';
// lib/civilization/domain-scorer.js — compute 7 domain scores + civilisation score daily

const { getSupabaseClient } = require('../clients');
const logger                = require('../logger');

const DOMAINS = ['health', 'execution', 'business', 'wealth', 'relationships', 'learning', 'spiritual'];

// Domain weights for the weighted civilisation score
const DOMAIN_WEIGHTS = {
    health:        1.2,
    execution:     1.0,
    business:      1.0,
    wealth:        0.9,
    relationships: 1.0,
    learning:      0.9,
    spiritual:     0.8,
};

function _sb() { return getSupabaseClient(); }

// ── Domain signal collectors ────────────────────────────────────────────────

async function _scoreHealth(sb) {
    // Signal: any health logs in the last 30 days (apex_life_domain_entries with domain='health')
    const since = new Date(Date.now() - 30 * 86400000).toISOString();
    const { data } = await sb.from('apex_life_domain_entries')
        .select('id', { count: 'exact', head: true })
        .eq('domain', 'health')
        .gte('created_at', since);
    const count = data?.length ?? 0;
    const score = Math.min(100, count * 5);
    return { score, inputs: { health_log_entries_30d: count } };
}

async function _scoreExecution(sb) {
    // Signal: agent tasks completed in the last 7 days
    const since = new Date(Date.now() - 7 * 86400000).toISOString();
    const { count } = await sb.from('apex_agent_runs')
        .select('*', { count: 'exact', head: true })
        .eq('success', true)
        .gte('created_at', since);
    const score = Math.min(100, (count || 0) * 4);
    return { score, inputs: { agent_tasks_completed_7d: count || 0 } };
}

async function _scoreBusiness(sb) {
    // Signal: empire health metric (entities / relationships as a proxy)
    const { count: entityCount } = await sb.from('entities')
        .select('*', { count: 'exact', head: true })
        .eq('kind', 'organisation');
    const { count: relCount } = await sb.from('relationships')
        .select('*', { count: 'exact', head: true });
    const score = Math.min(100, ((entityCount || 0) * 3) + ((relCount || 0) * 2));
    return { score, inputs: { organisations: entityCount || 0, relationships: relCount || 0 } };
}

async function _scoreWealth(sb) {
    // Signal: finance entries logged (apex_finance_entries if present)
    const { count } = await sb.from('apex_finance_entries')
        .select('*', { count: 'exact', head: true })
        .catch(() => ({ count: 0 }));
    const score = Math.min(100, (count || 0) * 5);
    return { score, inputs: { finance_entries: count || 0 } };
}

async function _scoreRelationships(sb) {
    // Signal: interactions logged in the last 30 days
    const since = new Date(Date.now() - 30 * 86400000).toISOString();
    const { count } = await sb.from('interactions')
        .select('*', { count: 'exact', head: true })
        .gte('occurred_at', since)
        .catch(() => ({ count: 0 }));
    const score = Math.min(100, (count || 0) * 3);
    return { score, inputs: { interactions_30d: count || 0 } };
}

async function _scoreLearning(sb) {
    // Signal: reflexion records + apex_lessons logged
    const { count: rc } = await sb.from('reflexion_records')
        .select('*', { count: 'exact', head: true })
        .catch(() => ({ count: 0 }));
    const { count: lc } = await sb.from('apex_lessons')
        .select('*', { count: 'exact', head: true })
        .catch(() => ({ count: 0 }));
    const total = (rc || 0) + (lc || 0);
    const score = Math.min(100, total * 2);
    return { score, inputs: { reflexion_records: rc || 0, apex_lessons: lc || 0 } };
}

async function _scoreSpiritual() {
    // No structured data yet — return null (excluded from weighted average)
    return { score: null, inputs: { note: 'no_structured_data' } };
}

// ── Main scorer ─────────────────────────────────────────────────────────────

async function computeAndStore() {
    const sb      = _sb();
    const takenAt = new Date().toISOString();

    const scorers = {
        health:        _scoreHealth(sb),
        execution:     _scoreExecution(sb),
        business:      _scoreBusiness(sb),
        wealth:        _scoreWealth(sb),
        relationships: _scoreRelationships(sb),
        learning:      _scoreLearning(sb),
        spiritual:     _scoreSpiritual(),
    };

    const results = {};
    await Promise.all(
        Object.entries(scorers).map(async ([domain, promise]) => {
            try { results[domain] = await promise; }
            catch (e) { results[domain] = { score: null, inputs: { error: e.message } }; }
        })
    );

    // Write domain_scores rows
    const rows = DOMAINS.map(d => ({
        taken_at: takenAt,
        domain:   d,
        score:    results[d].score,
        inputs:   results[d].inputs,
    }));

    const { error: dsErr } = await sb.from('domain_scores').upsert(rows, { onConflict: 'taken_at,domain' });
    if (dsErr) logger.warn('domain-scorer', 'domain_scores write failed', { error: dsErr.message });

    // Weighted civilisation score (non-null domains only)
    let weightedSum = 0, weightTotal = 0;
    const breakdown = {};
    for (const d of DOMAINS) {
        const s = results[d].score;
        if (s === null) continue;
        const w = DOMAIN_WEIGHTS[d] || 1;
        weightedSum  += s * w;
        weightTotal  += w;
        breakdown[d]  = { score: s, weight: w };
    }

    if (weightTotal === 0) {
        logger.warn('domain-scorer', 'no non-null domain scores — skipping civilisation score');
        return { domains: results, civilisationScore: null };
    }

    const civilisationScore = Math.round((weightedSum / weightTotal) * 10) / 10;
    const { error: csErr } = await sb.from('civilisation_scores').upsert({
        scored_at: takenAt,
        score:     civilisationScore,
        breakdown,
    }, { onConflict: 'scored_at' });

    if (csErr) logger.warn('domain-scorer', 'civilisation_scores write failed', { error: csErr.message });

    logger.info('domain-scorer', 'civilisation score computed', { score: civilisationScore, domains: Object.keys(breakdown).length });
    return { domains: results, civilisationScore };
}

module.exports = { computeAndStore, DOMAINS, DOMAIN_WEIGHTS };
