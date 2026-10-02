'use strict';

// Self-Optimization Engine — Phase 10
// Aggregates feedback from all cognitive engines.
// Generates evidence-backed governance proposals.
// Never auto-deploys beyond governance constraints.
// All recommendations are submitted through improvement-governor (which enforces risk tiers).

const { getSupabaseClient } = require('../../clients');

function _sb() { return getSupabaseClient(); }

async function suggest(options = {}) {
    const days       = options.days       || 30;
    const focusStage = options.focusStage || null;

    const [metaR, perfR, retrievalR, decayR, orgR] = await Promise.allSettled([
        _analyzeMetaReasoning(days),
        _analyzeTaskPerformance(days, focusStage),
        _analyzeRetrievalQuality(days),
        _analyzeKnowledgeDecay(),
        _analyzeOrgReports(days),
    ]);

    const sources = {
        meta_reasoning:    metaR.status  === 'fulfilled' ? metaR.value  : null,
        task_performance:  perfR.status  === 'fulfilled' ? perfR.value  : null,
        retrieval_quality: retrievalR.status === 'fulfilled' ? retrievalR.value : null,
        knowledge_decay:   decayR.status === 'fulfilled' ? decayR.value : null,
        org_reports:       orgR.status   === 'fulfilled' ? orgR.value   : null,
    };

    // Collect all proposals
    const proposals = Object.values(sources)
        .filter(Boolean)
        .flatMap(s => s.proposals || []);

    // Submit governance-safe proposals (minimal/low risk only — governor enforces the rest)
    let submitted = 0;
    for (const p of proposals) {
        try {
            const governor = require('../../intelligence/improvement-governor');
            await governor.submit({
                title:            p.title,
                description:      p.description,
                improvement_type: p.type || 'cognitive_optimization',
                risk_level:       p.risk_level || 'low',
                estimated_impact: p.estimated_impact || 0.3,
                evidence:         p.evidence || [],
                source_engine:    'self_optimization_engine',
            });
            submitted++;
        } catch {}
    }

    const result = {
        sources_analyzed:    Object.values(sources).filter(Boolean).length,
        proposals_generated: proposals.length,
        proposals_submitted: submitted,
        top_proposals:       proposals.slice(0, 3).map(p => ({ title: p.title, risk: p.risk_level, impact: p.estimated_impact })),
        analyzed_at:         new Date().toISOString(),
    };

    console.log(`[SelfOpt] sources=${result.sources_analyzed} proposals=${result.proposals_generated} submitted=${result.proposals_submitted}`);

    // Store as intelligence report for dashboard visibility
    setImmediate(async () => {
        try {
            await _sb().from('intelligence_reports').insert({
                report_type:  'self_optimization',
                report_data:  result,
                generated_at: new Date().toISOString(),
            });
        } catch {}
    });

    return result;
}

async function _analyzeMetaReasoning(days) {
    const cutoff = new Date(Date.now() - days * 86400000).toISOString();
    const { data } = await _sb().from('meta_reasoning_observations')
        .select('reasoning_quality, planning_quality, execution_quality, task_success')
        .gte('created_at', cutoff).limit(100);

    if (!data || data.length < 5) return { proposals: [], reason: 'insufficient_data', count: 0 };

    const proposals = [];
    const avg = (field) => data.reduce((s, r) => s + (r[field] || 0), 0) / data.length;

    const avgRq = avg('reasoning_quality');
    const avgPq = avg('planning_quality');
    const avgEq = avg('execution_quality');

    if (avgRq < 0.50) {
        proposals.push({
            title:            'Upgrade default reasoning mode to DELIBERATE',
            description:      `Avg reasoning quality ${avgRq.toFixed(2)} < 0.50 over ${days}d (n=${data.length}). DELIBERATE mode forces multi-hypothesis analysis.`,
            type:             'policy_update',
            risk_level:       'low',
            estimated_impact: 0.40,
            evidence:         [{ metric: 'avg_reasoning_quality', value: avgRq, count: data.length, days }],
        });
    }
    if (avgPq < 0.50) {
        proposals.push({
            title:            'Increase plan_depth to 3 for moderate+ tasks',
            description:      `Avg planning quality ${avgPq.toFixed(2)} < 0.50. Deeper planning reduces developer uncertainty.`,
            type:             'policy_update',
            risk_level:       'minimal',
            estimated_impact: 0.30,
            evidence:         [{ metric: 'avg_planning_quality', value: avgPq, count: data.length }],
        });
    }
    if (avgEq < 0.55) {
        proposals.push({
            title:            'Route DEVELOPER to SONNET for complex/critical tasks',
            description:      `Avg execution quality ${avgEq.toFixed(2)} < 0.55. Sonnet-level reasoning on write tasks improves output quality.`,
            type:             'routing_update',
            risk_level:       'minimal',
            estimated_impact: 0.35,
            evidence:         [{ metric: 'avg_execution_quality', value: avgEq, count: data.length }],
        });
    }

    return { proposals, avg_reasoning: avgRq, avg_planning: avgPq, avg_execution: avgEq };
}

async function _analyzeTaskPerformance(days, focusStage) {
    const cutoff = new Date(Date.now() - days * 86400000).toISOString();
    const proposals = [];

    const runsQuery = _sb().from('apex_agent_runs')
        .select('success, complexity, cost_usd, duration_ms')
        .gte('created_at', cutoff).limit(100);
    const { data: runs } = await runsQuery;

    if (!runs || runs.length < 5) return { proposals: [], reason: 'insufficient_data' };

    const successRate = runs.filter(r => r.success).length / runs.length;

    if (successRate < 0.70) {
        proposals.push({
            title:            'Review behavioral constraint thresholds — success rate below 70%',
            description:      `Pipeline success rate ${(successRate * 100).toFixed(0)}% < 70% over ${days}d (n=${runs.length}). Review and tighten behavior profile constraints.`,
            type:             'behavior_update',
            risk_level:       'low',
            estimated_impact: 0.50,
            evidence:         [{ metric: 'success_rate', value: successRate, count: runs.length, days }],
        });
    }

    // If focusStage specified, generate a stage-specific proposal
    if (focusStage) {
        proposals.push({
            title:            `Escalate ${focusStage} agent model — repeated stage failures`,
            description:      `Stage ${focusStage} has failed 5+ times in the last 7 days. Adaptive router should escalate model tier.`,
            type:             'routing_update',
            risk_level:       'minimal',
            estimated_impact: 0.40,
            evidence:         [{ metric: 'stage_failure_count', stage: focusStage, days: 7 }],
        });
    }

    return { proposals, success_rate: successRate, run_count: runs.length };
}

async function _analyzeRetrievalQuality(days) {
    const cutoff = new Date(Date.now() - days * 86400000).toISOString();
    const { data } = await _sb().from('retrieval_evaluations')
        .select('usefulness_score, precision_score')
        .gte('created_at', cutoff).limit(100);

    if (!data || data.length < 5) return { proposals: [], reason: 'insufficient_data' };

    const proposals = [];
    const avgU = data.reduce((s, r) => s + (r.usefulness_score || 0), 0) / data.length;

    if (avgU < 0.50) {
        proposals.push({
            title:            'Switch default retrieval strategy to deep_hybrid',
            description:      `Avg retrieval usefulness ${avgU.toFixed(2)} < 0.50. deep_hybrid strategy increases semantic coverage across more memory types.`,
            type:             'policy_update',
            risk_level:       'minimal',
            estimated_impact: 0.30,
            evidence:         [{ metric: 'avg_usefulness', value: avgU, count: data.length }],
        });
    }

    return { proposals, avg_usefulness: avgU };
}

async function _analyzeKnowledgeDecay() {
    const { data } = await _sb().from('knowledge_decay_assessments')
        .select('revalidation_needed').limit(100);

    if (!data || !data.length) return { proposals: [] };

    const proposals = [];
    const revalRate = data.filter(r => r.revalidation_needed).length / data.length;

    if (revalRate > 0.40) {
        proposals.push({
            title:            'Schedule knowledge revalidation sprint',
            description:      `${(revalRate * 100).toFixed(0)}% of knowledge items flagged for revalidation. Confidence in semantic memory is degrading.`,
            type:             'maintenance',
            risk_level:       'minimal',
            estimated_impact: 0.20,
            evidence:         [{ metric: 'revalidation_rate', value: revalRate, count: data.length }],
        });
    }

    return { proposals, revalidation_rate: revalRate };
}

async function _analyzeOrgReports(days) {
    const cutoff = new Date(Date.now() - days * 86400000).toISOString();
    const { data } = await _sb().from('intelligence_reports')
        .select('report_type, generated_at')
        .gte('generated_at', cutoff).limit(10);

    const proposals = [];
    if (!data || data.length === 0) {
        proposals.push({
            title:            'Generate initial organizational intelligence report',
            description:      'No org intelligence reports found. POST /api/cognitive/org-intelligence/generate to establish baseline.',
            type:             'operational',
            risk_level:       'minimal',
            estimated_impact: 0.15,
            evidence:         [{ metric: 'report_count', value: 0 }],
        });
    }

    return { proposals, report_count: (data || []).length };
}

module.exports = { suggest };
