'use strict';
// multi-agent-coordinator.js — Parallel work assignment, reputation-aware tier selection,
// result aggregation. Wraps orchestrator.runAgentTeam externally — no internals modified.

const { decomposeGoal, planToSpecs, scoreRisk } = require('./task-planner');
const { summarizeExecution, verifyOutput }        = require('./execution-verifier');
const _dynSelector                                 = require('./dynamic-agent-selector');
const _pqr                                         = require('./planning-quality-registry');
const { createClient } = require('@supabase/supabase-js');

const DEFAULT_CONCURRENCY = 2; // Render 512MB: 2 concurrent pipelines is the safe ceiling

// ── Lazy Supabase client (read-only reputation queries) ───────────────────────
let _sb = null;
function _getSb() {
    if (_sb) return _sb;
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) return null;
    _sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
    return _sb;
}

// ── Reputation query — reads apex_agent_runs (no writes) ─────────────────────
// Returns per-complexity-tier success rate, average cost, and average duration.
async function getReputationStats(limit = 50) {
    const sb = _getSb();
    if (!sb) return null;
    try {
        const { data, error } = await sb
            .from('apex_agent_runs')
            .select('complexity, success, cost_usd')
            .order('created_at', { ascending: false })
            .limit(limit);
        if (error || !data?.length) return null;

        const acc = {};
        for (const row of data) {
            const tier = row.complexity || 'moderate';
            if (!acc[tier]) acc[tier] = { runs: 0, successes: 0, cost: 0, ms: 0 };
            acc[tier].runs++;
            if (row.success) acc[tier].successes++;
            acc[tier].cost += Number(row.cost_usd)   || 0;
            acc[tier].ms   += Number(row.duration_ms) || 0;
        }
        return Object.fromEntries(Object.entries(acc).map(([tier, s]) => [tier, {
            successRate:   s.runs ? (s.successes / s.runs)   : null,
            avgCostUsd:    s.runs ? (s.cost      / s.runs)   : null,
            avgDurationMs: s.runs ? (s.ms        / s.runs)   : null,
            sampleSize:    s.runs
        }]));
    } catch { return null; }
}

// ── Agent tier selection ──────────────────────────────────────────────────────
// Uses reputation stats + risk score to decide if a complexity tier should be escalated.
async function selectTier(spec, reputationStats) {
    const risk = spec._planRisk    ?? scoreRisk(spec.objective);
    const base = spec._planComplexity || 'moderate';

    if (!reputationStats) return base; // no data — use static routing

    const TIERS   = ['simple', 'moderate', 'complex', 'critical'];
    const tierIdx = TIERS.indexOf(base);
    const stats   = reputationStats[base];

    // Escalate one tier if recent success rate < 60% for this complexity
    if (stats?.successRate !== null && stats?.successRate < 0.6 && tierIdx < TIERS.length - 1) {
        return TIERS[tierIdx + 1];
    }
    // High-risk tasks get a one-tier bump from simple/moderate
    if (risk >= 0.8 && base === 'simple')    return 'moderate';
    if (risk >= 0.8 && base === 'moderate')  return 'complex';

    return base;
}

// ── Parallel runner with concurrency cap ──────────────────────────────────────
async function runParallel(specs, options = {}) {
    const {
        concurrency   = DEFAULT_CONCURRENCY,
        taskIdPrefix  = `coord-${Date.now().toString(36)}`,
        onProgress    = null,
    } = options;

    if (!specs?.length) return [];

    const runAgentTeam = require('./orchestrator');

    const results = new Array(specs.length).fill(null);
    let nextIdx   = 0;

    async function _worker() {
        while (nextIdx < specs.length) {
            const i      = nextIdx++;
            const spec   = specs[i];
            const taskId = `${taskIdPrefix}-${i}`;

            // Dynamic agent selection: category + stage health + risk (replaces static selectTier)
            const agentConfig = await _dynSelector.selectAgentConfig(spec, {
                baseComplexity: spec._planComplexity || 'moderate',
                riskScore:      spec._planRisk,
            }).catch(() => ({ tier: spec._planComplexity || 'moderate', escalated: false }));

            let result = null;
            let error  = null;
            try {
                result = await runAgentTeam({
                    ...spec,
                    _selectedTier: agentConfig.tier,
                    _agentCategory: agentConfig.category,
                }, taskId);
            } catch (e) {
                error = e.message;
            }

            // Structured execution summary — wires summarizeExecution + verifyOutput into coordinator results
            const execSummary = summarizeExecution(spec, result?.agentLogs || [], result);

            results[i] = { taskId, spec, result, error, agentConfig, execSummary };

            if (typeof onProgress === 'function') {
                const done = results.filter(Boolean).length;
                onProgress({ completed: done, total: specs.length, i, taskId, success: !!result?.success });
            }
        }
    }

    const workers = Array.from({ length: Math.min(concurrency, specs.length) }, _worker);
    await Promise.all(workers);
    return results;
}

// ── Result aggregation ────────────────────────────────────────────────────────
function aggregate(results) {
    const items = (results || []).map(r => ({
        taskId:      r?.taskId,
        objective:   r?.spec?.objective,
        success:     !!r?.result?.success,
        complexity:  r?.result?.complexity  || null,
        cost:        r?.result?.cost        || null,
        commitHash:  r?.result?.commitHash  || null,
        error:       r?.error || r?.result?.error || null,
        category:    r?.agentConfig?.category   || null,
        tier:        r?.agentConfig?.tier        || null,
        retryStrategy: r?.execSummary?.retryStrategy || null,
        outputVerified: r?.execSummary?.outputVerified?.passed ?? null,
    }));

    const total   = items.length;
    const success = items.filter(i => i.success).length;
    const totalCost = items.reduce((sum, i) => sum + (parseFloat(i.cost) || 0), 0);

    return {
        total,
        success,
        failed:       total - success,
        successRate:  total ? (success / total) : 0,
        totalCostUsd: parseFloat(totalCost.toFixed(5)),
        items,
    };
}

// ── Top-level entry: decompose → assign → run → aggregate ────────────────────
async function assignWork(goal, options = {}) {
    const {
        simulate    = false,
        concurrency = DEFAULT_CONCURRENCY,
        maxSubtasks = 5,
    } = options;

    const plan  = await decomposeGoal(goal, { simulate, maxSubtasks });
    const specs = planToSpecs(plan);

    if (simulate) {
        const COST_CEILING = { simple: 0.01, moderate: 0.15, complex: 0.80, critical: 2.50 };
        return {
            simulated: true,
            plan,
            specs,
            wouldRun:      specs.length,
            estimatedCost: specs.reduce((s, sp) => s + (COST_CEILING[sp._planComplexity] || 0.15), 0),
        };
    }

    // Create plan record before execution so we have a planId for outcome tracking
    let _planRecord = null;
    try { _planRecord = _pqr.createPlanRecord(plan); } catch {}

    const results = await runParallel(specs, {
        concurrency,
        taskIdPrefix: `goal-${Date.now().toString(36)}`,
    });
    const summary = aggregate(results);

    // Record plan outcome with real execution values (non-blocking, non-fatal)
    setImmediate(() => {
        try {
            if (!_planRecord) return;
            const failurePatterns = summary.items
                .filter(i => !i.success && i.error)
                .map(i => String(i.error).slice(0, 100));
            _pqr.recordPlanOutcome({
                ..._planRecord,
                outcome:         summary.successRate === 1 ? 'success' : summary.successRate > 0 ? 'partial' : 'failed',
                successRate:     summary.successRate,
                executionCost:   summary.totalCostUsd,
                failurePatterns,
            });
        } catch {}
    });

    return { plan, summary, results };
}

module.exports = {
    assignWork,
    runParallel,
    aggregate,
    getReputationStats,
    selectTier,
};
