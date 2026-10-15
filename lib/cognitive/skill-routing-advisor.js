'use strict';
// F2: Skill-routing advisor — reads skill_evolution_snapshots to return domain confidence 0.0–1.0.
// Used by chat and voice-chat routes to skip specialist injection when confidence < 0.4.

const { getSupabaseClient } = require('../clients');

const _cache = new Map(); // domain → { confidence, ts }
const CACHE_TTL = 15 * 60 * 1000;

async function getConfidence(domain) {
    if (!domain) return 0.5;
    const cached = _cache.get(domain);
    if (cached && (Date.now() - cached.ts) < CACHE_TTL) return cached.confidence;

    try {
        const { data } = await getSupabaseClient()
            .from('skill_evolution_snapshots')
            .select('overall_score')
            .ilike('domain', domain)
            .order('created_at', { ascending: false })
            .limit(1);
        const confidence = typeof data?.[0]?.overall_score === 'number' ? data[0].overall_score : 0.5;
        _cache.set(domain, { confidence, ts: Date.now() });
        return confidence;
    } catch { return 0.5; }
}

module.exports = { getConfidence };
