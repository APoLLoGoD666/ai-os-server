'use strict';

// Benchmark Runner — Mission 5 Phase 7
// Runs synthetic scenarios through the cognitive stack WITHOUT executing the full pipeline.
// Measures: reasoning mode selection, planning depth, autonomy calibration, twin recommendation.
// Output: per-scenario scores + overall benchmark score → stored in benchmark_results table.

const { getSupabaseClient, getHoldoutClient } = require('../../clients');
const { SCENARIOS }         = require('./scenarios');

function _sb() { return getSupabaseClient(); }
// Restricted client: uses anon key, subject to RLS. Used only for reading
// holdout scenarios so the evaluation read-path never touches service_role.
function _sbHoldout() { return getHoldoutClient(); }

// ── Main entry: run full benchmark suite ─────────────────────────────────────
async function runBenchmark(name = 'cognitive_baseline') {
    const startMs  = Date.now();
    const results  = [];
    let   totalWeight = 0;
    let   weightedScore = 0;

    const policySnapshot = await _loadPolicySnapshot();

    for (const scenario of SCENARIOS) {
        try {
            const score = await _runScenario(scenario);
            results.push({ scenario_id: scenario.id, category: scenario.category, name: scenario.name, score, weight: scenario.weight });
            weightedScore += score * scenario.weight;
            totalWeight   += scenario.weight;
        } catch (e) {
            results.push({ scenario_id: scenario.id, category: scenario.category, name: scenario.name, score: 0, weight: scenario.weight, error: e.message });
            totalWeight += scenario.weight;
        }
    }

    const overallScore = totalWeight > 0 ? parseFloat((weightedScore / totalWeight).toFixed(4)) : 0;

    // Category breakdowns
    const byCategory = {};
    for (const r of results) {
        if (!byCategory[r.category]) byCategory[r.category] = { total: 0, weight: 0 };
        byCategory[r.category].total  += r.score * r.weight;
        byCategory[r.category].weight += r.weight;
    }
    const categoryScores = {};
    for (const [cat, v] of Object.entries(byCategory)) {
        categoryScores[cat] = v.weight > 0 ? parseFloat((v.total / v.weight).toFixed(4)) : 0;
    }

    const benchmarkRecord = {
        benchmark_name:  name,
        scenario_name:   'full_suite',
        reasoning_score: categoryScores.reasoning || null,
        planning_score:  categoryScores.planning  || null,
        execution_score: categoryScores.execution || null,
        autonomy_score:  categoryScores.autonomy  || null,
        forecast_score:  categoryScores.twin      || null,
        adaptation_score: null,
        overall_score:   overallScore,
        policy_snapshot: policySnapshot,
        run_metadata:    {
            duration_ms:  Date.now() - startMs,
            scenario_count: SCENARIOS.length,
            results,
        },
    };

    try {
        await _sb().from('benchmark_results').insert(benchmarkRecord);
    } catch (e) {
        console.warn('[Benchmark] insert failed:', e.message);
    }

    console.log(`[Benchmark] ${name} → overall score: ${overallScore} (${SCENARIOS.length} scenarios, ${Date.now() - startMs}ms)`);
    return { ...benchmarkRecord, results };
}

// ── Run a single scenario: exercise cognitive stack without full pipeline ─────
async function _runScenario(scenario) {
    const { spec, expected_mode, expected_depth, expected_autonomy_min, expected_autonomy_max, expected_twin_rec, expected_twin_rec_not } = scenario;
    let score = 0;
    let checks = 0;

    // Load cognitive engines lazily
    const cog = require('../../cognitive');

    // Check 1: reasoning mode selection
    if (expected_mode) {
        checks++;
        try {
            // cognitivePolicy.determine(spec, behaviorProfile, contextPack, options)
            const policy = await cog.cognitivePolicy.determine(spec, null, null);
            if (policy?.reasoning_mode === expected_mode) score++;
            else if (policy?.reasoning_mode && policy.reasoning_mode !== 'ANALYTICAL') score += 0.5;
        } catch (_) {}
    }

    // Check 2: planning depth
    if (expected_depth !== undefined) {
        checks++;
        try {
            // planningStrategy.generate(cognitivePolicy, behaviorProfile, contextPack, spec) — synchronous
            const planStrategy = cog.planningStrategy.generate(null, null, null, spec);
            const depth = planStrategy?.plan_depth ?? 2;
            const delta = Math.abs(depth - expected_depth);
            if (delta === 0) score += 1.0;
            else if (delta === 1) score += 0.5;
        } catch (_) {}
    }

    // Check 3: autonomy level (minimum)
    if (expected_autonomy_min !== undefined) {
        checks++;
        try {
            // autonomy.evaluate(contextPack, spec, options)
            const autonomy = await cog.autonomy.evaluate(null, spec);
            if ((autonomy?.autonomy_level ?? 2) >= expected_autonomy_min) score++;
        } catch (_) {}
    }

    // Check 4: autonomy level (maximum — gated task)
    if (expected_autonomy_max !== undefined) {
        checks++;
        try {
            const autonomy = await cog.autonomy.evaluate(null, spec);
            if ((autonomy?.autonomy_level ?? 2) <= expected_autonomy_max) score++;
        } catch (_) {}
    }

    // Check 5: twin recommendation
    if (expected_twin_rec || expected_twin_rec_not) {
        checks++;
        try {
            // Fixed path: runtime/digital-twin-gate; uses evaluate(spec, cognitivePolicy, executionStrategy)
            const twin = require('../runtime/digital-twin-gate');
            const sim  = await twin.evaluate(spec, null, null);
            if (expected_twin_rec && sim?.recommendation === expected_twin_rec) score++;
            else if (expected_twin_rec_not && sim?.recommendation !== expected_twin_rec_not) score++;
        } catch (_) {}
    }

    return checks > 0 ? parseFloat((score / checks).toFixed(4)) : 0;
}

// ── Compare two benchmark runs ────────────────────────────────────────────────
async function compareBenchmarks(beforeName, afterName) {
    const { data } = await _sb().from('benchmark_results')
        .select('benchmark_name, overall_score, reasoning_score, planning_score, autonomy_score, forecast_score, ran_at')
        .in('benchmark_name', [beforeName, afterName])
        .order('ran_at', { ascending: false })
        .limit(10);

    if (!data || data.length < 2) return { error: 'insufficient_data' };

    const before = data.find(r => r.benchmark_name === beforeName);
    const after  = data.find(r => r.benchmark_name === afterName);
    if (!before || !after) return { error: 'benchmark_not_found' };

    return {
        before: { name: beforeName, score: before.overall_score, ran_at: before.ran_at },
        after:  { name: afterName,  score: after.overall_score,  ran_at: after.ran_at },
        delta:  parseFloat((after.overall_score - before.overall_score).toFixed(4)),
        improved: after.overall_score > before.overall_score,
        category_deltas: {
            reasoning: _delta(after.reasoning_score, before.reasoning_score),
            planning:  _delta(after.planning_score,  before.planning_score),
            autonomy:  _delta(after.autonomy_score,  before.autonomy_score),
            forecast:  _delta(after.forecast_score,  before.forecast_score),
        },
    };
}

// ── Holdout evaluation: scenarios from DB, not from code (Gap-4) ─────────────
// Reads Founder-sealed scenarios from benchmark_holdout_scenarios table.
// APEX cannot modify those rows, so this benchmark cannot be gamed by
// tuning scenarios.js or benchmark-runner.js.
async function runHoldoutBenchmark(name = 'holdout_evaluation') {
    // Execution guard: holdout evaluation is Founder-only.
    // Blocks autonomous pipeline invocation regardless of who calls this function.
    // Consistent pattern with APEX_SAFETY_APPROVED for safety-critical operations.
    if (process.env.APEX_HOLDOUT_APPROVED !== '1') {
        const msg = 'holdout evaluation requires APEX_HOLDOUT_APPROVED=1 — Founder-only operation';
        console.warn('[HoldoutBenchmark] BLOCKED:', msg);
        return { error: 'holdout_blocked', reason: msg };
    }

    const startMs = Date.now();

    // Read scenarios via restricted anon-key client — cannot write to this table.
    const { data: dbScenarios, error } = await _sbHoldout().from('benchmark_holdout_scenarios')
        .select('*').eq('locked', true).order('scenario_key');

    if (error || !dbScenarios || dbScenarios.length === 0) {
        return { error: 'holdout_scenarios_unavailable', details: error?.message };
    }

    const policySnapshot = await _loadPolicySnapshot();
    const results        = [];
    let   weightedScore  = 0;
    let   totalWeight    = 0;

    for (const dbS of dbScenarios) {
        // Map DB row → scenario object shape that _runScenario understands
        const scenario = {
            id:       dbS.scenario_key,
            category: dbS.category,
            name:     dbS.name,
            spec:     dbS.spec,
            weight:   dbS.weight,
            ...(dbS.expected || {}),
        };
        try {
            const score = await _runScenario(scenario);
            results.push({ scenario_id: dbS.scenario_key, category: dbS.category, name: dbS.name, score, weight: dbS.weight });
            weightedScore += score * dbS.weight;
            totalWeight   += dbS.weight;
        } catch (e) {
            results.push({ scenario_id: dbS.scenario_key, category: dbS.category, name: dbS.name, score: 0, weight: dbS.weight, error: e.message });
            totalWeight += dbS.weight;
        }
    }

    const overallScore = totalWeight > 0 ? parseFloat((weightedScore / totalWeight).toFixed(4)) : 0;

    const byCategory = {};
    for (const r of results) {
        if (!byCategory[r.category]) byCategory[r.category] = { total: 0, weight: 0 };
        byCategory[r.category].total  += r.score * r.weight;
        byCategory[r.category].weight += r.weight;
    }
    const categoryScores = {};
    for (const [cat, v] of Object.entries(byCategory)) {
        categoryScores[cat] = v.weight > 0 ? parseFloat((v.total / v.weight).toFixed(4)) : 0;
    }

    const record = {
        benchmark_name:   name,
        scenario_name:    'holdout_suite',
        reasoning_score:  categoryScores.reasoning || null,
        planning_score:   categoryScores.planning  || null,
        execution_score:  null,
        autonomy_score:   categoryScores.autonomy  || null,
        forecast_score:   categoryScores.twin      || null,
        adaptation_score: null,
        overall_score:    overallScore,
        policy_snapshot:  policySnapshot,
        run_metadata:     { duration_ms: Date.now() - startMs, scenario_count: dbScenarios.length, source: 'holdout_db', results },
    };

    try {
        await _sb().from('benchmark_results').insert(record);
    } catch (e) {
        console.warn('[HoldoutBenchmark] insert failed:', e.message);
    }

    console.log(`[HoldoutBenchmark] ${name} → overall: ${overallScore} (${dbScenarios.length} holdout scenarios, ${Date.now() - startMs}ms)`);
    return { ...record, results };
}

// ── History ───────────────────────────────────────────────────────────────────
async function getBenchmarkHistory(name, limit = 10) {
    const { data } = await _sb().from('benchmark_results')
        .select('benchmark_id, benchmark_name, overall_score, reasoning_score, planning_score, autonomy_score, forecast_score, ran_at')
        .eq('benchmark_name', name)
        .order('ran_at', { ascending: false })
        .limit(limit);
    return data || [];
}

async function _loadPolicySnapshot() {
    try {
        const { data } = await _sb().from('cognitive_policy_settings').select('policy_name, policy_value');
        const snapshot = {};
        for (const row of (data || [])) snapshot[row.policy_name] = row.policy_value;
        return snapshot;
    } catch (_) { return {}; }
}

function _delta(a, b) {
    if (a == null || b == null) return null;
    return parseFloat((a - b).toFixed(4));
}

module.exports = { runBenchmark, runHoldoutBenchmark, compareBenchmarks, getBenchmarkHistory };
