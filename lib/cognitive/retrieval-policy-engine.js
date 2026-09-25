'use strict';

// Retrieval Policy Engine — Phase 2
// Determines WHAT memory to retrieve, WHEN, HOW MUCH, and WHY.
// Prevents retrieval bloat. Optimizes for relevance, latency, cost, coverage, accuracy.
// Output drives memory-retrieval-engine limits and strategy selection.

const { getSupabaseClient } = require('../clients');
const { generateMemoryId }  = require('../memory/memory-governor');

function _sb() { return getSupabaseClient(); }

// Default retrieval budgets by task type
const BUDGETS = {
    simple:   { total: 2000, episodes: 2, lessons: 3, decisions: 1, procedures: 2, knowledge: 3, skills: 2, incidents: 1, graph: 3 },
    moderate: { total: 4000, episodes: 4, lessons: 6, decisions: 3, procedures: 2, knowledge: 5, skills: 3, incidents: 2, graph: 5 },
    complex:  { total: 6000, episodes: 6, lessons: 8, decisions: 5, procedures: 4, knowledge: 8, skills: 5, incidents: 3, graph: 8 },
    critical: { total: 8000, episodes: 8, lessons: 10, decisions: 8, procedures: 6, knowledge: 10, skills: 6, incidents: 5, graph: 10 },
};

// Memory type relevance by task type
const TYPE_RELEVANCE = {
    api_development:   { procedures: 1.5, knowledge: 1.3, decisions: 1.0, episodes: 0.8, skills: 1.2, incidents: 0.9, graph: 0.7 },
    database:          { procedures: 1.3, knowledge: 1.5, decisions: 1.2, episodes: 1.0, skills: 1.0, incidents: 1.0, graph: 1.2 },
    refactor:          { episodes: 1.5, decisions: 1.3, knowledge: 1.2, procedures: 1.0, skills: 1.0, incidents: 0.8, graph: 1.3 },
    security:          { incidents: 2.0, decisions: 1.5, knowledge: 1.3, procedures: 1.5, episodes: 1.0, skills: 0.8, graph: 1.4 },
    deployment:        { incidents: 1.8, decisions: 1.5, procedures: 1.5, episodes: 1.2, knowledge: 1.0, skills: 1.0, graph: 1.0 },
    investigation:     { graph: 2.0, episodes: 1.5, knowledge: 1.5, decisions: 1.2, incidents: 1.3, procedures: 0.8, skills: 0.8 },
    default:           { episodes: 1.0, lessons: 1.0, decisions: 1.0, procedures: 1.0, knowledge: 1.0, skills: 1.0, incidents: 1.0, graph: 1.0 },
};

// Determine retrieval policy for a task.
// Returns a policy object that is passed to memory-retrieval-engine to tune its limits.
async function determine(spec, options = {}) {
    const { taskId, traceId, riskLevel, incidentCount } = options;

    const complexity = _classifyComplexity(spec);
    const taskType   = _classifyTaskType(spec.objective || '');
    const riskScore  = await _computeRisk(spec, incidentCount);
    const budget     = _selectBudget(complexity, riskScore);
    const relevance  = TYPE_RELEVANCE[taskType] || TYPE_RELEVANCE.default;
    const strategy   = _selectStrategy(riskScore, complexity);
    const graphDepth = _selectGraphDepth(riskScore, taskType);
    const confReq    = _selectConfidenceReq(riskScore);

    // Tune memory type limits by relevance scores
    const limits = {
        episodes:   Math.round(budget.episodes   * (relevance.episodes   || 1.0)),
        lessons:    Math.round(budget.lessons    * (relevance.lessons    || 1.0)),
        decisions:  Math.round(budget.decisions  * (relevance.decisions  || 1.0)),
        procedures: Math.round(budget.procedures * (relevance.procedures || 1.0)),
        knowledge:  Math.round(budget.knowledge  * (relevance.knowledge  || 1.0)),
        skills:     Math.round(budget.skills     * (relevance.skills     || 1.0)),
        incidents:  Math.round(budget.incidents  * (relevance.incidents  || 1.0)),
        graph:      Math.round(budget.graph      * (relevance.graph      || 1.0)),
    };

    const policy = {
        task_type:              taskType,
        complexity,
        risk_score:             riskScore,
        memory_types:           _selectMemoryTypes(riskScore, taskType),
        limits,
        retrieval_depth:        riskScore > 0.7 ? 'deep' : riskScore > 0.4 ? 'standard' : 'shallow',
        retrieval_strategy:     strategy,
        retrieval_budget:       budget.total,
        graph_depth:            graphDepth,
        confidence_requirements: confReq,
        rationale:              _buildRationale(taskType, complexity, riskScore, strategy),
    };

    // Persist for audit trail (non-blocking)
    if (taskId) {
        const policyId = generateMemoryId('retrieval-policy').replace('mem-', 'rp-');
        setImmediate(async () => {
            try {
                await _sb().from('retrieval_policy_decisions').insert({
                    policy_id:               policyId,
                    task_id:                 taskId,
                    trace_id:                traceId || null,
                    task_type:               taskType,
                    risk_level:              riskScore > 0.7 ? 'high' : riskScore > 0.4 ? 'medium' : 'low',
                    memory_types:            policy.memory_types,
                    retrieval_depth:         policy.retrieval_depth,
                    retrieval_strategy:      strategy,
                    retrieval_budget:        budget.total,
                    graph_depth:             graphDepth,
                    confidence_requirements: confReq,
                    policy_rationale:        policy.rationale,
                });
            } catch (_) {}
        });
    }

    return policy;
}

function _classifyComplexity(spec) {
    const obj = (spec.objective || '').toLowerCase();
    const files = (spec.filesToModify || []).length;
    if (files >= 5 || /refactor|architect|redesign|migration|critical/i.test(obj)) return 'critical';
    if (files >= 3 || /multi|complex|implement|integration|security/i.test(obj)) return 'complex';
    if (files >= 2 || /update|add|modify|change|route/i.test(obj)) return 'moderate';
    return 'simple';
}

function _classifyTaskType(objective) {
    const o = objective.toLowerCase();
    if (/security|auth|jwt|token|password|encrypt|bypass/i.test(o)) return 'security';
    if (/deploy|render|ci|cd|pipeline|release/i.test(o))            return 'deployment';
    if (/database|sql|table|schema|migration|postgres/i.test(o))    return 'database';
    if (/refactor|rename|extract|split|reorganize/i.test(o))        return 'refactor';
    if (/investigate|debug|trace|diagnose|why|root cause/i.test(o)) return 'investigation';
    if (/api|route|endpoint|http|rest|post|get/i.test(o))           return 'api_development';
    return 'default';
}

async function _computeRisk(spec, incidentCount) {
    let score = 0.3; // baseline
    const obj = (spec.objective || '').toLowerCase();

    // High-risk keywords
    if (/delete|drop|remove|disable|bypass|skip|overwrite/i.test(obj)) score += 0.3;
    if (/security|auth|production|critical|migration/i.test(obj))      score += 0.2;
    if (/deploy|release|rollout/i.test(obj))                            score += 0.15;

    // Active incidents add to risk
    if (typeof incidentCount === 'number') {
        score += Math.min(0.3, incidentCount * 0.05);
    } else {
        try {
            const { data } = await _sb().from('apex_incidents')
                .select('incident_id')
                .in('status', ['open', 'investigating'])
                .limit(10);
            score += Math.min(0.3, ((data || []).length) * 0.05);
        } catch (_) {}
    }

    return Math.min(1.0, parseFloat(score.toFixed(3)));
}

function _selectBudget(complexity, riskScore) {
    const base = BUDGETS[complexity] || BUDGETS.moderate;
    if (riskScore > 0.7) {
        // High-risk: increase all limits by 50%
        return Object.fromEntries(
            Object.entries(base).map(([k, v]) => [k, typeof v === 'number' ? Math.round(v * 1.5) : v])
        );
    }
    return base;
}

function _selectMemoryTypes(riskScore, taskType) {
    const all = ['episodes', 'lessons', 'decisions', 'procedures', 'knowledge', 'skills', 'incidents', 'graph'];
    if (riskScore > 0.7 || taskType === 'security' || taskType === 'deployment') return all;
    if (riskScore > 0.4) return all.filter(t => t !== 'graph'); // skip graph for medium risk
    return ['episodes', 'lessons', 'procedures', 'knowledge']; // lightweight for simple tasks
}

function _selectStrategy(riskScore, complexity) {
    if (riskScore > 0.7) return 'exhaustive';
    if (complexity === 'complex' || complexity === 'critical') return 'deep_hybrid';
    if (riskScore > 0.4) return 'hybrid';
    return 'fast';
}

function _selectGraphDepth(riskScore, taskType) {
    if (taskType === 'investigation') return 4;
    if (riskScore > 0.7) return 3;
    if (riskScore > 0.4) return 2;
    return 1;
}

function _selectConfidenceReq(riskScore) {
    if (riskScore > 0.7) return 0.7;
    if (riskScore > 0.4) return 0.5;
    return 0.3;
}

function _buildRationale(taskType, complexity, riskScore, strategy) {
    const parts = [`task_type=${taskType}`, `complexity=${complexity}`, `risk=${riskScore.toFixed(2)}`, `strategy=${strategy}`];
    if (riskScore > 0.7)  parts.push('high-risk: all sources enabled, expanded limits');
    if (taskType === 'security') parts.push('security task: incident and decision history prioritized');
    if (taskType === 'investigation') parts.push('investigation: graph depth maximized');
    return parts.join('; ');
}

// Get recent policy decisions for stats.
async function getStats(limit = 20) {
    try {
        const { data } = await _sb().from('retrieval_policy_decisions')
            .select('task_type, retrieval_depth, risk_level, retrieval_strategy, created_at')
            .order('created_at', { ascending: false })
            .limit(limit);
        const byType  = {};
        const byDepth = {};
        for (const r of (data || [])) {
            byType[r.task_type]     = (byType[r.task_type]     || 0) + 1;
            byDepth[r.retrieval_depth] = (byDepth[r.retrieval_depth] || 0) + 1;
        }
        return { total: (data || []).length, byType, byDepth };
    } catch (_) { return { total: 0 }; }
}

module.exports = { determine, getStats };
