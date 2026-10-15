'use strict';

// Intelligence → Reality projection
// Projects news signals, opportunities, and intelligence ministry outputs into reality claims.

const { claimReality, advanceClaim } = require('../fabric');
const { getSupabaseClient } = require('../../clients');

function _sb() { return getSupabaseClient(); }

async function project() {
    const results = { created: 0, errors: [] };

    try {
        const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
        const { data: news } = await _sb()
            .from('apex_news_cache')
            .select('*')
            .gte('created_at', cutoff)
            .limit(15);

        for (const article of (news || [])) {
            try {
                const id = await claimReality({
                    entityId:    article.domain || 'intelligence',
                    domain:      'intelligence',
                    content:     `Intelligence signal: ${article.title || article.summary}`,
                    source:      'intelligence-projection',
                    claimType:   'factual',
                    confidence:  0.65,
                    evidence:    { url: article.url, source_name: article.source },
                    projectedBy: ['intelligence'],
                });
                await advanceClaim({ claimId: id, toStage: 'emergent', trigger: 'news_ingest', actor: 'intelligence-projection' });
                results.created++;
            } catch (e) { results.errors.push(e.message); }
        }
    } catch (e) { results.errors.push(`news: ${e.message}`); }

    try {
        const { data: opps } = await _sb()
            .from('opportunities')
            .select('*')
            .eq('status', 'active')
            .order('created_at', { ascending: false })
            .limit(10);

        for (const opp of (opps || [])) {
            try {
                await claimReality({
                    entityId:    'intelligence',
                    domain:      'intelligence',
                    content:     `Opportunity identified: ${opp.title || opp.description}`,
                    source:      'opportunity-engine-projection',
                    claimType:   'predictive',
                    confidence:  (opp.score || 50) / 100,
                    evidence:    { opportunity_id: opp.id, score: opp.score },
                    projectedBy: ['intelligence'],
                });
                results.created++;
            } catch (e) { results.errors.push(e.message); }
        }
    } catch (e) { results.errors.push(`opportunities: ${e.message}`); }

    return results;
}

module.exports = { project };
