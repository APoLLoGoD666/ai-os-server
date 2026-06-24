// Holdout Oracle — Supabase Edge Function (apex-eval project)
// Reads scenarios with service_role, probes APEX blindly, scores internally.
// APEX never sees expected_mode or any expected values — only its own outputs.
// Deploy to: apex-eval project (uwnhutqtxwbocghvwwco)

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const HOLDOUT_EVAL_KEY  = Deno.env.get('HOLDOUT_EVAL_KEY') ?? '';
const APEX_APP_KEY      = Deno.env.get('APEX_APP_KEY') ?? '';
const APEX_PROBE_URL    = Deno.env.get('APEX_PROBE_URL') ?? '';
const ACTIVE_SUITE      = Deno.env.get('ACTIVE_SUITE_VERSION') ?? 'v1';

// SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are auto-injected by Supabase
// for the project this function is deployed on (apex-eval).

Deno.serve(async (req: Request) => {
    if (req.method !== 'POST') {
        return new Response(JSON.stringify({ ok: false, error: 'POST only' }), { status: 405 });
    }

    const authHeader = req.headers.get('Authorization') ?? '';
    if (!HOLDOUT_EVAL_KEY || authHeader !== `Bearer ${HOLDOUT_EVAL_KEY}`) {
        return new Response(JSON.stringify({ ok: false, error: 'unauthorized' }), { status: 401 });
    }

    if (!APEX_APP_KEY || !APEX_PROBE_URL) {
        return new Response(JSON.stringify({ ok: false, error: 'oracle not configured' }), { status: 503 });
    }

    const supabase = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
        { auth: { persistSession: false } }
    );

    const { data: scenarios, error } = await supabase
        .from('benchmark_holdout_scenarios')
        .select('*')
        .eq('suite_version', ACTIVE_SUITE)
        .eq('locked', true)
        .order('scenario_key');

    if (error || !scenarios?.length) {
        return new Response(JSON.stringify({ ok: false, error: error?.message ?? 'no_scenarios' }), { status: 500 });
    }

    let weightedScore = 0;
    let totalWeight   = 0;
    let passed        = 0;
    let failed        = 0;
    const byCategory: Record<string, { total: number; weight: number }> = {};

    for (const dbS of scenarios) {
        const expected = dbS.expected ?? {};
        const weight   = Number(dbS.weight ?? 1);

        // Probe APEX — send only spec, never expected values
        let probe: Record<string, unknown> = {};
        try {
            const resp = await fetch(`${APEX_PROBE_URL}/api/cognitive-eval/probe`, {
                method:  'POST',
                headers: { 'Content-Type': 'application/json', 'x-app-key': APEX_APP_KEY },
                body:    JSON.stringify({ spec: dbS.spec }),
                signal:  AbortSignal.timeout(15000),
            });
            if (resp.ok) probe = await resp.json();
        } catch (_) { /* network failure — probe stays empty, scenario scores 0 */ }

        // Score using same logic as _runScenario
        let score  = 0;
        let checks = 0;

        if (expected.expected_mode) {
            checks++;
            if (probe.selected_mode === expected.expected_mode) score++;
            else if (probe.selected_mode && probe.selected_mode !== 'ANALYTICAL') score += 0.5;
        }
        if (expected.expected_depth !== undefined) {
            checks++;
            const delta = Math.abs(Number(probe.planning_depth ?? 2) - Number(expected.expected_depth));
            if (delta === 0) score += 1.0;
            else if (delta === 1) score += 0.5;
        }
        if (expected.expected_autonomy_min !== undefined) {
            checks++;
            if (Number(probe.autonomy_level ?? 2) >= Number(expected.expected_autonomy_min)) score++;
        }
        if (expected.expected_autonomy_max !== undefined) {
            checks++;
            if (Number(probe.autonomy_level ?? 2) <= Number(expected.expected_autonomy_max)) score++;
        }
        if (expected.expected_twin_rec || expected.expected_twin_rec_not) {
            checks++;
            if (expected.expected_twin_rec && probe.twin_rec === expected.expected_twin_rec) score++;
            else if (expected.expected_twin_rec_not && probe.twin_rec !== expected.expected_twin_rec_not) score++;
        }

        const scenarioScore = checks > 0 ? score / checks : 0;
        weightedScore += scenarioScore * weight;
        totalWeight   += weight;

        const cat = String(dbS.category ?? 'unknown');
        if (!byCategory[cat]) byCategory[cat] = { total: 0, weight: 0 };
        byCategory[cat].total  += scenarioScore * weight;
        byCategory[cat].weight += weight;

        if (scenarioScore >= 0.5) passed++; else failed++;
    }

    const overallScore = totalWeight > 0
        ? Math.round(weightedScore / totalWeight * 10000) / 10000
        : 0;

    const categoryScores: Record<string, number> = {};
    for (const [cat, v] of Object.entries(byCategory)) {
        categoryScores[cat] = v.weight > 0 ? Math.round(v.total / v.weight * 10000) / 10000 : 0;
    }

    return new Response(JSON.stringify({
        ok:             true,
        score:          overallScore,
        by_category:    categoryScores,
        scenario_count: scenarios.length,
        suite_version:  ACTIVE_SUITE,
        passed,
        failed,
        evaluated_at:   new Date().toISOString(),
    }), { headers: { 'Content-Type': 'application/json' } });
});
