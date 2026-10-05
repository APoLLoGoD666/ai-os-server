'use strict';

// Outcome Attribution Engine — Mission 5 Phase 2
// For every task: determines which cognitive decisions affected execution,
// which improved outcomes, which degraded them, which had no effect.
// Computes per-dimension impact scores and stores attribution records.
// Answers: "What helped? What hurt? What should be repeated or retired?"

const { getSupabaseClient } = require('../../clients');

function _sb() { return getSupabaseClient(); }

// Historical baseline success rates by complexity tier (updated by getBaseline())
const _BASELINE_CACHE = { value: null, cachedAt: 0, TTL: 30 * 60 * 1000 };

// ── Main attribution call: post-execution, non-blocking ───────────────────────
async function attributeTask(taskId, traceId, pipelineResult, cognitiveSnapshot) {
    const { success, complexity, cost_usd, duration_ms } = pipelineResult;
    const {
        cognitivePolicy, autonomyResult, executionStrategy,
        behaviorProfile, runtimeControls,
    } = cognitiveSnapshot || {};

    // Build attribution record
    const baseline = await _getBaseline(complexity || 'moderate');

    const reasoningMode   = cognitivePolicy?.reasoning_mode  || 'ANALYTICAL';
    const planningMode    = cognitivePolicy?.planning_mode   || 'STANDARD';
    const autonomyLevel   = autonomyResult?.autonomy_level   ?? 2;
    const planDepth       = runtimeControls?.planning?.planDepth ?? 2;
    const maxRetries      = runtimeControls?.execution?.maxAttempts ?? 3;
    const verifDepth      = runtimeControls?.execution?.verificationDepth || 'standard';
    const modelAdapted    = (runtimeControls?.modelAdaptations || []).length > 0;
    const twinSimId       = runtimeControls?.twin?.simId || null;

    // Per-dimension impact scores
    // Score = (this_task_outcome - baseline) + mode_modifier
    // Positive = contributed to success above baseline
    // Negative = contributed to failure below baseline
    const baselineSuccess = baseline.success_rate;
    const outcomeVsBase   = success ? 1 - baselineSuccess : -baselineSuccess;

    // Attribution heuristics (improve with data accumulation via computeImpactScores)
    const reasoningImpact = _scoreReasoningImpact(reasoningMode, success, outcomeVsBase);
    const planningImpact  = _scorePlanningImpact(planDepth, planningMode, success, outcomeVsBase);
    const executionImpact = _scoreExecutionImpact(maxRetries, verifDepth, pipelineResult);
    const behaviorImpact  = _scoreBehaviorImpact(behaviorProfile, success);
    const autonomyImpact  = _scoreAutonomyImpact(autonomyLevel, success, baselineSuccess);
    const routingImpact   = _scoreRoutingImpact(modelAdapted, success, baselineSuccess);
    const twinImpact      = runtimeControls?.twin?.simulated
        ? _scoreTwinImpact(runtimeControls.twin, success) : 0;

    const overallCognitiveImpact = [
        reasoningImpact * 0.20,
        planningImpact  * 0.15,
        executionImpact * 0.25,
        behaviorImpact  * 0.15,
        autonomyImpact  * 0.10,
        routingImpact   * 0.10,
        twinImpact      * 0.05,
    ].reduce((a, b) => a + b, 0);

    const record = {
        task_id:        taskId,
        trace_id:       traceId,
        task_success:   success,
        complexity,
        cost_usd:       cost_usd || 0,
        duration_ms:    duration_ms || 0,
        reasoning_impact:   parseFloat(reasoningImpact.toFixed(4)),
        planning_impact:    parseFloat(planningImpact.toFixed(4)),
        execution_impact:   parseFloat(executionImpact.toFixed(4)),
        behavior_impact:    parseFloat(behaviorImpact.toFixed(4)),
        autonomy_impact:    parseFloat(autonomyImpact.toFixed(4)),
        routing_impact:     parseFloat(routingImpact.toFixed(4)),
        twin_impact:        parseFloat(twinImpact.toFixed(4)),
        overall_cognitive_impact: parseFloat(overallCognitiveImpact.toFixed(4)),
        reasoning_mode:     reasoningMode,
        planning_mode:      planningMode,
        autonomy_level:     autonomyLevel,
        plan_depth:         planDepth,
        max_retries:        maxRetries,
        verification_depth: verifDepth,
        model_adapted:      modelAdapted,
        twin_sim_id:        twinSimId,
        complexity_baseline_success: baselineSuccess,
        evidence: {
            baseline_sample_size: baseline.sample_size,
            outcome_vs_baseline:  parseFloat(outcomeVsBase.toFixed(4)),
            mode_adaptations:     runtimeControls?.modelAdaptations || [],
        },
    };

    try {
        await _sb().from('outcome_attribution_records').insert(record);
    } catch (e) {
        console.warn('[Attribution] insert failed (non-fatal):', e.message);
    }

    return record;
}

// ── Aggregate impact analysis across many tasks ───────────────────────────────
async function computeImpactScores(days = 30) {
    const cutoff = new Date(Date.now() - days * 86400000).toISOString();
    const { data } = await _sb().from('outcome_attribution_records')
        .select('*').gte('created_at', cutoff).limit(500);

    if (!data || data.length < 5) return { insufficient_data: true, count: 0 };

    const avg = (field) => data.reduce((s, r) => s + (r[field] || 0), 0) / data.length;
    const successRate = data.filter(r => r.task_success).length / data.length;

    // Break down impact scores by reasoning mode
    const byMode = {};
    for (const r of data) {
        if (!byMode[r.reasoning_mode]) byMode[r.reasoning_mode] = { pass: 0, fail: 0 };
        if (r.task_success) byMode[r.reasoning_mode].pass++;
        else byMode[r.reasoning_mode].fail++;
    }
    const modeSuccessRates = {};
    for (const [mode, counts] of Object.entries(byMode)) {
        const total = counts.pass + counts.fail;
        if (total >= 3) modeSuccessRates[mode] = parseFloat((counts.pass / total).toFixed(3));
    }

    // Break down by plan_depth
    const byDepth = {};
    for (const r of data) {
        const d = r.plan_depth || 2;
        if (!byDepth[d]) byDepth[d] = { pass: 0, fail: 0 };
        if (r.task_success) byDepth[d].pass++;
        else byDepth[d].fail++;
    }
    const depthSuccessRates = {};
    for (const [depth, counts] of Object.entries(byDepth)) {
        const total = counts.pass + counts.fail;
        if (total >= 3) depthSuccessRates[depth] = parseFloat((counts.pass / total).toFixed(3));
    }

    return {
        period_days:     days,
        sample_size:     data.length,
        overall_success: parseFloat(successRate.toFixed(3)),
        avg_impacts: {
            reasoning: parseFloat(avg('reasoning_impact').toFixed(4)),
            planning:  parseFloat(avg('planning_impact').toFixed(4)),
            execution: parseFloat(avg('execution_impact').toFixed(4)),
            behavior:  parseFloat(avg('behavior_impact').toFixed(4)),
            autonomy:  parseFloat(avg('autonomy_impact').toFixed(4)),
            routing:   parseFloat(avg('routing_impact').toFixed(4)),
            twin:      parseFloat(avg('twin_impact').toFixed(4)),
            overall:   parseFloat(avg('overall_cognitive_impact').toFixed(4)),
        },
        reasoning_mode_success_rates: modeSuccessRates,
        plan_depth_success_rates:     depthSuccessRates,
        model_adapted_tasks:  data.filter(r => r.model_adapted).length,
        twin_simulated_tasks: data.filter(r => r.twin_sim_id).length,
        computed_at:          new Date().toISOString(),
    };
}

// Get attribution record for a specific task
async function getTaskAttribution(taskId) {
    const { data } = await _sb().from('outcome_attribution_records')
        .select('*').eq('task_id', taskId).single();
    return data || null;
}

// ── Scoring functions ─────────────────────────────────────────────────────────

function _scoreReasoningImpact(mode, success, outcomeVsBase) {
    // Non-default modes have a larger stake in the outcome
    const nonDefault   = !['ANALYTICAL', 'FAST'].includes(mode);
    const modeWeight   = nonDefault ? 0.3 : 0.1;
    const baseContrib  = outcomeVsBase * modeWeight;

    // DELIBERATE/ADVERSARIAL modes add value on success (deliberation paid off)
    if (success && ['DELIBERATE', 'ADVERSARIAL', 'ROOT_CAUSE'].includes(mode)) return baseContrib + 0.1;
    // FAST mode on failure suggests under-investment in reasoning
    if (!success && mode === 'FAST') return baseContrib - 0.1;
    return baseContrib;
}

function _scorePlanningImpact(planDepth, planningMode, success, outcomeVsBase) {
    const deepPlan = planDepth >= 3;
    const contrib  = outcomeVsBase * (deepPlan ? 0.3 : 0.1);
    if (success && deepPlan) return contrib + 0.1;
    if (!success && planDepth <= 1) return contrib - 0.1;
    return contrib;
}

function _scoreExecutionImpact(maxRetries, verifDepth, pipelineResult) {
    const { success, attempts } = pipelineResult;
    const usedExtraRetries = (attempts || 1) > 3;
    const deepVerif        = verifDepth === 'deep';

    if (success && usedExtraRetries) return 0.2;  // extra retries paid off
    if (!success && maxRetries < 3)  return -0.2; // too few retries contributed to failure
    if (success && deepVerif)        return 0.1;  // deep verification caught issues
    return 0;
}

function _scoreBehaviorImpact(behaviorProfile, success) {
    const constraintCount = (behaviorProfile?.constraints || []).length;
    if (constraintCount === 0) return 0;
    // Active constraints correlate with safety awareness
    if (success) return Math.min(0.2, constraintCount * 0.05);
    return -0.05; // constraints active but still failed — constraints may not have helped
}

function _scoreAutonomyImpact(level, success, baseline) {
    // Level 0 blocks execution — any "success" is from human approval, credit to autonomy engine
    if (level === 0) return 0.1; // conservative autonomy is positive
    // Level 2 = supervised = neutral
    if (level === 2) return 0;
    // Higher levels on success = autonomy was correctly permissive
    if (level >= 3 && success) return Math.min(0.2, (level - 2) * 0.1);
    // Higher levels on failure = autonomy was too permissive
    if (level >= 3 && !success && success < baseline) return -(level - 2) * 0.05;
    return 0;
}

function _scoreRoutingImpact(modelAdapted, success, baseline) {
    if (!modelAdapted) return 0;
    // Model was adapted + task succeeded above baseline → routing helped
    if (success) return 0.15;
    // Model was adapted + task failed → routing didn't help
    return -0.05;
}

function _scoreTwinImpact(twinResult, success) {
    const rec = twinResult?.recommendation;
    if (rec === 'recommended' && success)            return 0.15; // twin was right
    if (rec === 'do_not_deploy' && !success)         return 0.20; // twin correctly blocked
    if (rec === 'recommended' && !success)           return -0.15; // twin was wrong (false positive)
    if (rec === 'proceed_with_caution' && success)   return 0.05;
    if (rec === 'proceed_with_caution' && !success)  return -0.05;
    return 0;
}

// ── Historical baseline ────────────────────────────────────────────────────────
async function _getBaseline(complexity) {
    const now = Date.now();
    if (_BASELINE_CACHE.value && (now - _BASELINE_CACHE.cachedAt) < _BASELINE_CACHE.TTL) {
        return _BASELINE_CACHE.value[complexity] || { success_rate: 0.70, sample_size: 0 };
    }

    try {
        const cutoff = new Date(now - 30 * 86400000).toISOString();
        const { data } = await _sb().from('apex_agent_runs')
            .select('success, complexity').gte('created_at', cutoff).limit(300);

        const byComplexity = {};
        for (const r of (data || [])) {
            if (!byComplexity[r.complexity]) byComplexity[r.complexity] = { pass: 0, total: 0 };
            byComplexity[r.complexity].total++;
            if (r.success) byComplexity[r.complexity].pass++;
        }

        const result = {};
        for (const [c, counts] of Object.entries(byComplexity)) {
            result[c] = {
                success_rate: counts.total > 0 ? parseFloat((counts.pass / counts.total).toFixed(3)) : 0.70,
                sample_size:  counts.total,
            };
        }

        _BASELINE_CACHE.value     = result;
        _BASELINE_CACHE.cachedAt  = now;

        return result[complexity] || { success_rate: 0.70, sample_size: 0 };
    } catch (_) {
        return { success_rate: 0.70, sample_size: 0 };
    }
}

module.exports = { attributeTask, computeImpactScores, getTaskAttribution };
