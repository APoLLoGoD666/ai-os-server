'use strict';

// Cognitive Evolution Engine — Phase 14
// Continuously improves cognitive policies based on historical performance.
// Inputs: historical performance, incident trends, knowledge trends, reasoning/planning/execution outcomes.
// Outputs: recommended policy changes → cognitive_evolution_proposals table.
// Integrates with improvement-governor. No autonomous deployment beyond governance limits.

const { getSupabaseClient }    = require('../clients');
const { generateMemoryId }     = require('../memory/memory-governor');
const improvementGovernor      = require('../intelligence/improvement-governor');

function _sb() { return getSupabaseClient(); }

// Run full evolution cycle — analyze performance and propose policy changes.
async function runEvolutionCycle() {
    const results = { analyzed: 0, proposals: 0, auto_submitted: 0 };

    try {
        const [metaStats, retrievalStats, autonomyStats, decayStats] = await Promise.allSettled([
            _getMetaStats(),
            _getRetrievalStats(),
            _getAutonomyStats(),
            _getDecayStats(),
        ]);

        const proposals = [];

        // Analyze reasoning mode effectiveness
        const reasoningProposals = await _analyzeReasoningModes(metaStats.value || {});
        proposals.push(...reasoningProposals);

        // Analyze planning mode effectiveness
        const planningProposals = await _analyzePlanningModes(metaStats.value || {});
        proposals.push(...planningProposals);

        // Analyze retrieval effectiveness
        const retrievalProposals = await _analyzeRetrievalPolicy(retrievalStats.value || {});
        proposals.push(...retrievalProposals);

        // Analyze autonomy calibration
        const autonomyProposals = await _analyzeAutonomyCalibration(autonomyStats.value || {});
        proposals.push(...autonomyProposals);

        // Analyze knowledge decay impact
        const decayProposals = await _analyzeKnowledgeDecay(decayStats.value || {});
        proposals.push(...decayProposals);

        results.analyzed = 5;
        results.proposals = proposals.length;

        // Store proposals and submit low-risk ones
        for (const proposal of proposals) {
            await _storeProposal(proposal);
            if (proposal.risk_level === 'low' || proposal.risk_level === 'minimal') {
                await _submitToGovernor(proposal);
                results.auto_submitted++;
            }
        }
    } catch (e) {
        console.error(`[cognitive-evolution] cycle failed: ${e.message}`);
    }

    console.log(`[cognitive-evolution] cycle: analyzed=${results.analyzed} proposals=${results.proposals} auto_submitted=${results.auto_submitted}`);
    return results;
}

async function _analyzeReasoningModes(metaStats) {
    const proposals = [];
    const modeStats = metaStats.mode_stats || [];

    // If FAST mode fails more than 30% → propose increasing to ANALYTICAL for that task type
    const fastStats = modeStats.find(m => m.mode === 'FAST');
    if (fastStats && fastStats.success_rate < 0.70 && fastStats.count >= 5) {
        proposals.push({
            type:        'reasoning',
            title:       'Reduce FAST mode usage — failure rate too high',
            description: `FAST reasoning mode has ${Math.round((1 - fastStats.success_rate) * 100)}% failure rate (${fastStats.count} tasks). Propose raising complexity threshold for FAST mode.`,
            evidence:    [{ source: 'meta_reasoning', mode: 'FAST', success_rate: fastStats.success_rate, count: fastStats.count }],
            confidence:  Math.min(0.9, 0.5 + fastStats.count * 0.02),
            risk_level:  'low',
        });
    }

    // If ANALYTICAL mode consistently succeeds (>85%) → evidence it's well-calibrated
    const analyticalStats = modeStats.find(m => m.mode === 'ANALYTICAL');
    if (analyticalStats && analyticalStats.success_rate >= 0.85 && analyticalStats.count >= 10) {
        proposals.push({
            type:        'reasoning',
            title:       'ANALYTICAL mode well-calibrated — extend to moderate tasks',
            description: `ANALYTICAL mode has ${Math.round(analyticalStats.success_rate * 100)}% success rate across ${analyticalStats.count} tasks. Recommend making it default for moderate+ complexity.`,
            evidence:    [{ source: 'meta_reasoning', mode: 'ANALYTICAL', success_rate: analyticalStats.success_rate }],
            confidence:  0.75,
            risk_level:  'low',
        });
    }

    return proposals;
}

async function _analyzePlanningModes(metaStats) {
    const proposals = [];

    // If overall planning quality is low → propose more conservative planning
    const avgPlanning = metaStats.avg_planning_quality || 0;
    if (avgPlanning < 0.55 && metaStats.count >= 10) {
        proposals.push({
            type:        'planning',
            title:       'Planning quality below threshold — increase default plan depth',
            description: `Average planning quality is ${(avgPlanning * 100).toFixed(1)}% over ${metaStats.count} tasks. Propose defaulting STANDARD → RISK_AWARE planning mode.`,
            evidence:    [{ source: 'meta_reasoning', avg_planning_quality: avgPlanning, count: metaStats.count }],
            confidence:  0.70,
            risk_level:  'low',
        });
    }

    // Common failure stage analysis
    const stageFailures = metaStats.stage_failure_counts || {};
    for (const [stage, count] of Object.entries(stageFailures)) {
        if (count >= 3) {
            proposals.push({
                type:        'planning',
                title:       `${stage} stage failing frequently — propose additional pre-verification`,
                description: `${stage} stage failed ${count} times. Consider adding pre-${stage} verification step.`,
                evidence:    [{ source: 'meta_reasoning', stage, failure_count: count }],
                confidence:  Math.min(0.9, 0.5 + count * 0.05),
                risk_level:  'low',
            });
        }
    }

    return proposals;
}

async function _analyzeRetrievalPolicy(retrievalStats) {
    const proposals = [];
    if (!retrievalStats.count || retrievalStats.count < 5) return proposals;

    // Low precision → retrieval returning irrelevant results
    if (retrievalStats.avg_precision < 0.5) {
        proposals.push({
            type:        'retrieval',
            title:       'Low retrieval precision — increase confidence threshold',
            description: `Average precision ${(retrievalStats.avg_precision * 100).toFixed(1)}% — consider raising minimum confidence for retrieval to 0.6.`,
            evidence:    [{ source: 'retrieval_evaluation', avg_precision: retrievalStats.avg_precision }],
            confidence:  0.70,
            risk_level:  'low',
        });
    }

    // Low recall → missing important context
    if (retrievalStats.avg_recall < 0.4) {
        proposals.push({
            type:        'retrieval',
            title:       'Low retrieval recall — expand source types',
            description: `Average recall ${(retrievalStats.avg_recall * 100).toFixed(1)}% — consider enabling additional memory sources.`,
            evidence:    [{ source: 'retrieval_evaluation', avg_recall: retrievalStats.avg_recall }],
            confidence:  0.65,
            risk_level:  'minimal',
        });
    }

    return proposals;
}

async function _analyzeAutonomyCalibration(autonomyStats) {
    const proposals = [];
    if (!autonomyStats.total || autonomyStats.total < 10) return proposals;

    // If most tasks are running at LEVEL_0/1, system may be over-constrained
    const byLevel = autonomyStats.byLevel || {};
    const highRestriction = (byLevel['Human Approval Required'] || 0) + (byLevel['Human Review Required'] || 0);
    if (highRestriction / autonomyStats.total > 0.5) {
        proposals.push({
            type:        'autonomy',
            title:       'Autonomy over-constrained — review incident and contradiction thresholds',
            description: `${Math.round(highRestriction / autonomyStats.total * 100)}% of tasks require human review or approval. Review if incident/contradiction thresholds are calibrated correctly.`,
            evidence:    [{ source: 'autonomy_decisions', restriction_rate: highRestriction / autonomyStats.total }],
            confidence:  0.60,
            risk_level:  'medium',
        });
    }

    return proposals;
}

async function _analyzeKnowledgeDecay(decayStats) {
    const proposals = [];

    if (decayStats.revalidation_needed > 20) {
        proposals.push({
            type:        'reasoning',
            title:       'High revalidation backlog — increase validation cadence',
            description: `${decayStats.revalidation_needed} knowledge records need revalidation. Consider running knowledge-validator more frequently or increasing confirmation weight.`,
            evidence:    [{ source: 'knowledge_decay', revalidation_needed: decayStats.revalidation_needed }],
            confidence:  0.75,
            risk_level:  'low',
        });
    }

    return proposals;
}

async function _getMetaStats() {
    const cutoff = new Date(Date.now() - 30 * 86400000).toISOString();
    const { data } = await _sb().from('meta_reasoning_observations')
        .select('reasoning_quality, planning_quality, task_success, failure_stage, reasoning_mode')
        .gte('created_at', cutoff)
        .limit(200);
    if (!data || !data.length) return {};

    const byMode = {};
    const stageFailures = {};
    for (const r of data) {
        if (!byMode[r.reasoning_mode]) byMode[r.reasoning_mode] = { success: 0, total: 0 };
        byMode[r.reasoning_mode].total++;
        if (r.task_success) byMode[r.reasoning_mode].success++;
        if (!r.task_success && r.failure_stage) stageFailures[r.failure_stage] = (stageFailures[r.failure_stage] || 0) + 1;
    }
    const modeStats = Object.entries(byMode).map(([mode, s]) => ({ mode, success_rate: s.success / s.total, count: s.total }));
    const avg = (arr, k) => arr.reduce((s, r) => s + (r[k] || 0), 0) / arr.length;
    return { count: data.length, mode_stats: modeStats, stage_failure_counts: stageFailures, avg_planning_quality: avg(data, 'planning_quality') };
}

async function _getRetrievalStats() {
    const cutoff = new Date(Date.now() - 30 * 86400000).toISOString();
    const { data } = await _sb().from('retrieval_evaluations')
        .select('precision_score, recall_score, usefulness_score')
        .gte('created_at', cutoff).limit(100);
    if (!data || !data.length) return {};
    const avg = (k) => data.reduce((s, r) => s + (r[k] || 0), 0) / data.length;
    return { count: data.length, avg_precision: avg('precision_score'), avg_recall: avg('recall_score') };
}

async function _getAutonomyStats() {
    const cutoff = new Date(Date.now() - 30 * 86400000).toISOString();
    const { data } = await _sb().from('autonomy_decisions')
        .select('autonomy_level, autonomy_label').gte('created_at', cutoff).limit(100);
    if (!data || !data.length) return {};
    const byLevel = {};
    for (const r of data) byLevel[r.autonomy_label] = (byLevel[r.autonomy_label] || 0) + 1;
    return { total: data.length, byLevel };
}

async function _getDecayStats() {
    try {
        const { data } = await _sb().from('knowledge_decay_assessments')
            .select('revalidation_needed').limit(200);
        return { revalidation_needed: (data || []).filter(r => r.revalidation_needed).length };
    } catch (_) { return {}; }
}

async function _storeProposal(proposal) {
    const propId = generateMemoryId('evolution').replace('mem-', 'cep-');
    try {
        // Idempotent: don't duplicate same-title pending proposals
        const { data: existing } = await _sb().from('cognitive_evolution_proposals')
            .select('proposal_id').eq('title', proposal.title).eq('status', 'pending').limit(1);
        if (existing && existing.length > 0) return;

        await _sb().from('cognitive_evolution_proposals').insert({
            proposal_id:  propId,
            proposal_type: proposal.type,
            title:        proposal.title,
            description:  proposal.description,
            evidence:     proposal.evidence,
            confidence:   proposal.confidence,
            risk_level:   proposal.risk_level,
            status:       'pending',
        });
    } catch (_) {}
}

async function _submitToGovernor(proposal) {
    try {
        await improvementGovernor.submit(
            proposal.title,
            proposal.description,
            'threshold',
            JSON.stringify(proposal.evidence),
            { riskLevel: proposal.risk_level, confidence: proposal.confidence }
        );
    } catch (_) {}
}

async function getPendingProposals(limit = 20) {
    try {
        const { data } = await _sb().from('cognitive_evolution_proposals')
            .select('*').eq('status', 'pending')
            .order('confidence', { ascending: false }).limit(limit);
        return data || [];
    } catch (_) { return []; }
}

async function approveProposal(proposalId, approvedBy) {
    try {
        await _sb().from('cognitive_evolution_proposals').update({
            status: 'approved', approved_by: approvedBy, updated_at: new Date().toISOString(),
        }).eq('proposal_id', proposalId);
        return { ok: true };
    } catch (e) { return { ok: false, error: e.message }; }
}

module.exports = { runEvolutionCycle, getPendingProposals, approveProposal };
