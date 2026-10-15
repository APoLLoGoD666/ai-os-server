'use strict';

const { getSupabaseClient } = require('../clients');
function _sb() { return getSupabaseClient(); }

// High-priority roadmap capabilities not yet in the registry
const ROADMAP_GAPS = [
    { id: 'roadmap:email_triage',        title: 'Email Triage Agent',               description: 'Reads Gmail inbox, classifies emails by urgency, drafts replies for approval, archives resolved threads', category: 'automation',  severity: 7 },
    { id: 'roadmap:revenue_tracking',    title: 'Revenue Tracking Automation',      description: 'Tracks all income sources automatically, generates P&L reports, alerts on anomalies', category: 'finance',     severity: 6 },
    { id: 'roadmap:constitutional_monitor', title: 'Constitutional Monitor',         description: 'Real-time monitoring of all agent actions against constitutional constraints; opens incidents on violation', category: 'governance', severity: 8 },
    { id: 'roadmap:capital_allocation',  title: 'Capital Allocation Engine',         description: 'Auto-allocates API budget across 5 resource classes based on ROI forecasts from opportunity engine', category: 'capital',    severity: 6 },
    { id: 'roadmap:comms_agent',         title: 'Communications Agent',             description: 'Handles outbound messaging, social media, and network coordination once Gmail OAuth is live', category: 'automation',  severity: 5 },
    { id: 'roadmap:health_agent',        title: 'Health Agent',                     description: 'Monitors biometric trends, fitness goals, nutrition targets from connected data sources', category: 'health',      severity: 5 },
];

async function _scanRoadmapGaps() {
    const ids = ROADMAP_GAPS.map(r => r.id);
    let data;
    try { ({ data } = await _sb().from('capability_registry').select('id').in('id', ids)); } catch { data = []; }
    const existing = new Set((data || []).map(r => r.id));
    return ROADMAP_GAPS.filter(r => !existing.has(r.id)).map(r => ({ ...r, source: 'roadmap' }));
}

async function _scanFailurePatterns() {
    const cutoff = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();
    let data;
    try { ({ data } = await _sb().from('cron_run_log').select('job_name, status').gte('started_at', cutoff)); } catch { data = []; }
    if (!data || !data.length) return [];

    const byJob = {};
    for (const row of data) {
        if (!byJob[row.job_name]) byJob[row.job_name] = { total: 0, failures: 0 };
        byJob[row.job_name].total++;
        if (row.status === 'error') byJob[row.job_name].failures++;
    }

    const gaps = [];
    for (const [name, s] of Object.entries(byJob)) {
        const failRate = s.failures / Math.max(s.total, 1);
        if (s.failures >= 3 || failRate > 0.25) {
            gaps.push({
                id:          `failure:${name}`,
                source:      'failure_pattern',
                title:       `Reliability gap: ${name}`,
                description: `Job "${name}" failed ${s.failures}/${s.total} times in last 14 days (${Math.round(failRate * 100)}% failure rate) — needs retry logic or capability improvement`,
                category:    'reliability',
                severity:    Math.min(10, Math.round(4 + failRate * 6)),
            });
        }
    }
    return gaps;
}

async function _scanOpportunityReferrals() {
    let data;
    try {
        ({ data } = await _sb()
            .from('opportunities')
            .select('id, title, description, composite_score, category')
            .gte('composite_score', 0.7)
            .order('composite_score', { ascending: false })
            .limit(5));
    } catch { data = []; }

    // Only refer opportunities that look like capability gaps (not pure business opps)
    const capabilityKeywords = /agent|automat|integrat|capability|build|system|engine|pipeline/i;
    return (data || [])
        .filter(o => capabilityKeywords.test(o.title + ' ' + (o.description || '')))
        .map(o => ({
            id:          `opp:${o.id}`,
            source:      'opportunity_engine',
            title:       o.title,
            description: o.description || '',
            category:    o.category || 'automation',
            severity:    Math.round((o.composite_score || 0.7) * 10),
        }));
}

async function scan() {
    const [roadmap, failures, opps] = await Promise.allSettled([
        _scanRoadmapGaps(),
        _scanFailurePatterns(),
        _scanOpportunityReferrals(),
    ]);

    const all = [
        ...(roadmap.status   === 'fulfilled' ? roadmap.value   : []),
        ...(failures.status  === 'fulfilled' ? failures.value  : []),
        ...(opps.status      === 'fulfilled' ? opps.value      : []),
    ];

    // Deduplicate by id
    const seen = new Set();
    return all.filter(g => { if (seen.has(g.id)) return false; seen.add(g.id); return true; });
}

module.exports = { scan };
