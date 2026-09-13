'use strict';

// Governance → Reality projection
// Projects governance probe results, evidence chain, and constitutional state into reality claims.

const { claimReality, advanceClaim } = require('../fabric');
const { getSupabaseClient } = require('../../clients');

function _sb() { return getSupabaseClient(); }

async function project() {
    const results = { created: 0, errors: [] };

    try {
        const probe = require('../../governance-probe');
        const probeResult = await probe.runProbe();

        const id = await claimReality({
            entityId:    'governance',
            domain:      'governance',
            content:     `Governance probe: score ${probeResult.score}/100, status ${probeResult.status}`,
            source:      'governance-probe-projection',
            claimType:   'factual',
            confidence:  probeResult.score / 100,
            evidence:    { score: probeResult.score, checks: probeResult.checks },
            projectedBy: ['governance'],
        });

        const toStage = probeResult.score >= 80 ? 'validated' : probeResult.score >= 50 ? 'verified' : 'observed';
        await advanceClaim({ claimId: id, toStage, trigger: 'probe_run', actor: 'governance-projection' });
        results.created++;
    } catch (e) { results.errors.push(`probe: ${e.message}`); }

    try {
        const { data: records } = await _sb()
            .from('governance_records')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(5);

        for (const rec of (records || [])) {
            try {
                await claimReality({
                    entityId:    'governance',
                    domain:      'governance',
                    content:     `Governance record: ${rec.event_type || rec.type} — ${rec.description || rec.summary}`,
                    source:      'governance-record-projection',
                    claimType:   'factual',
                    confidence:  0.95,
                    evidence:    { record_id: rec.id, hash: rec.hash },
                    projectedBy: ['governance'],
                });
                results.created++;
            } catch (e) { results.errors.push(e.message); }
        }
    } catch (e) { results.errors.push(`records: ${e.message}`); }

    return results;
}

module.exports = { project };
