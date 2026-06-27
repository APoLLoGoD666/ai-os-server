'use strict';

// Intelligence Evolution Reporter — Mission 5 Phase 8
// Generates weekly, monthly, and quarterly cognitive evolution reports.
// Answers: Is cognitive effectiveness improving? Are policies evolving correctly?
// Stored in intelligence_reports table (type = cognitive_evolution_*).

const { getSupabaseClient } = require('../../clients');

function _sb() { return getSupabaseClient(); }

// ── Weekly report: 7-day snapshot ────────────────────────────────────────────
async function generateWeeklyReport() {
    const report = await _buildReport('weekly', 7);
    await _storeReport('cognitive_evolution_weekly', report);
    console.log(`[EvolutionReporter] Weekly report: success_rate=${report.task_success_rate}, cognitive_impact=${report.avg_cognitive_impact}`);
    return report;
}

// ── Monthly report: 30-day trend ─────────────────────────────────────────────
async function generateMonthlyReport() {
    const report = await _buildReport('monthly', 30);
    await _storeReport('cognitive_evolution_monthly', report);
    console.log(`[EvolutionReporter] Monthly report: ${report.period_days}d, ${report.attribution_count} attributions, ${report.policy_changes} policy changes`);
    return report;
}

// ── Quarterly report: 90-day deep analysis ───────────────────────────────────
async function generateQuarterlyReport() {
    const report = await _buildReport('quarterly', 90);
    const benchmark = await _getBenchmarkTrend(90);
    report.benchmark_trend = benchmark;
    report.evolution_roi   = _computeEvolutionROI(report);
    await _storeReport('cognitive_evolution_quarterly', report);
    console.log(`[EvolutionReporter] Quarterly report: ROI=${report.evolution_roi?.roi_estimate}, benchmark_delta=${report.benchmark_trend?.delta}`);
    return report;
}

// ── Core report builder ───────────────────────────────────────────────────────
async function _buildReport(period, days) {
    const cutoff = new Date(Date.now() - days * 86400000).toISOString();

    const [attrResult, policyResult, twinResult, benchResult] = await Promise.allSettled([
        _sb().from('outcome_attribution_records').select('*').gte('created_at', cutoff).limit(500),
        _sb().from('cognitive_policy_settings').select('policy_name, policy_value, applied_at').gte('applied_at', cutoff),
        _sb().from('twin_accuracy_records').select('forecast_accuracy, was_false_positive, was_false_negative').gte('created_at', cutoff).limit(200),
        _sb().from('benchmark_results').select('overall_score, ran_at').order('ran_at', { ascending: true }).gte('ran_at', cutoff).limit(20),
    ]);

    const attributions  = attrResult.status  === 'fulfilled' ? (attrResult.value.data  || []) : [];
    const policyChanges = policyResult.status === 'fulfilled' ? (policyResult.value.data || []) : [];
    const twinRecs      = twinResult.status   === 'fulfilled' ? (twinResult.value.data   || []) : [];
    const benchRuns     = benchResult.status  === 'fulfilled' ? (benchResult.value.data  || []) : [];

    // Task-level success metrics
    const successRate   = attributions.length > 0
        ? parseFloat((attributions.filter(r => r.task_success).length / attributions.length).toFixed(4))
        : null;

    // Cognitive impact averages
    const avg = (field) => attributions.length > 0
        ? parseFloat((attributions.reduce((s, r) => s + (r[field] || 0), 0) / attributions.length).toFixed(4))
        : null;

    // Per-mode success rate
    const modeBreakdown = _modeBreakdown(attributions);

    // Per-depth success rate
    const depthBreakdown = _depthBreakdown(attributions);

    // Twin accuracy
    const twinAccuracy = twinRecs.length > 0
        ? parseFloat((twinRecs.reduce((s, r) => s + (r.forecast_accuracy || 0), 0) / twinRecs.length).toFixed(4))
        : null;
    const fpRate = twinRecs.length > 0
        ? parseFloat((twinRecs.filter(r => r.was_false_positive).length / twinRecs.length).toFixed(4))
        : null;

    // Benchmark trend within period
    const benchFirst = benchRuns[0]?.overall_score ?? null;
    const benchLast  = benchRuns[benchRuns.length - 1]?.overall_score ?? null;
    const benchDelta = (benchFirst !== null && benchLast !== null)
        ? parseFloat((benchLast - benchFirst).toFixed(4)) : null;

    // Week-over-week sub-periods (for weekly: 2 periods of 3.5d; for monthly: 4 weeks)
    const subPeriods = await _getSubPeriods(days, Math.min(4, days / 7));

    return {
        period,
        period_days:          days,
        generated_at:         new Date().toISOString(),
        attribution_count:    attributions.length,
        task_success_rate:    successRate,
        avg_cognitive_impact: avg('overall_cognitive_impact'),
        avg_impacts: {
            reasoning: avg('reasoning_impact'),
            planning:  avg('planning_impact'),
            execution: avg('execution_impact'),
            behavior:  avg('behavior_impact'),
            autonomy:  avg('autonomy_impact'),
            routing:   avg('routing_impact'),
            twin:      avg('twin_impact'),
        },
        reasoning_mode_breakdown: modeBreakdown,
        plan_depth_breakdown:     depthBreakdown,
        twin_accuracy:            twinAccuracy,
        twin_fp_rate:             fpRate,
        policy_changes:           policyChanges.length,
        policy_change_details:    policyChanges.map(p => ({ name: p.policy_name, value: p.policy_value, applied_at: p.applied_at })),
        benchmark_delta:          benchDelta,
        benchmark_first:          benchFirst,
        benchmark_last:           benchLast,
        sub_periods:              subPeriods,
    };
}

// ── Sub-period breakdown (N equal slices of the period) ───────────────────────
async function _getSubPeriods(totalDays, sliceCount) {
    if (sliceCount < 2) return [];
    const sliceMs = (totalDays * 86400000) / sliceCount;
    const periods = [];

    for (let i = 0; i < sliceCount; i++) {
        const from = new Date(Date.now() - (sliceCount - i) * sliceMs).toISOString();
        const to   = new Date(Date.now() - (sliceCount - i - 1) * sliceMs).toISOString();
        try {
            const { data } = await _sb().from('outcome_attribution_records')
                .select('task_success, overall_cognitive_impact')
                .gte('created_at', from).lt('created_at', to).limit(100);

            if (data && data.length > 0) {
                periods.push({
                    period_start: from,
                    sample_size:  data.length,
                    success_rate: parseFloat((data.filter(r => r.task_success).length / data.length).toFixed(4)),
                    avg_impact:   parseFloat((data.reduce((s, r) => s + (r.overall_cognitive_impact || 0), 0) / data.length).toFixed(4)),
                });
            } else {
                periods.push({ period_start: from, sample_size: 0, success_rate: null, avg_impact: null });
            }
        } catch (_) {
            periods.push({ period_start: from, sample_size: 0, success_rate: null, avg_impact: null });
        }
    }

    return periods;
}

// ── Benchmark trend ───────────────────────────────────────────────────────────
async function _getBenchmarkTrend(days) {
    try {
        const cutoff = new Date(Date.now() - days * 86400000).toISOString();
        const { data } = await _sb().from('benchmark_results')
            .select('overall_score, ran_at')
            .gte('ran_at', cutoff)
            .order('ran_at', { ascending: true })
            .limit(20);
        if (!data || data.length < 2) return null;
        const first = data[0].overall_score;
        const last  = data[data.length - 1].overall_score;
        return { first, last, delta: parseFloat((last - first).toFixed(4)), runs: data.length };
    } catch (_) { return null; }
}

// ── Evolution ROI (quarterly only) ────────────────────────────────────────────
function _computeEvolutionROI(report) {
    if (!report.benchmark_delta || !report.policy_changes) return null;
    const improvement = report.benchmark_delta;
    const changes     = report.policy_changes;
    if (changes === 0) return { roi_estimate: 0, note: 'no_policy_changes' };
    return {
        roi_estimate:        parseFloat((improvement / (changes * 0.05)).toFixed(3)), // normalize by change cost proxy
        benchmark_improvement: improvement,
        policy_changes_made:   changes,
        success_rate_change:   report.sub_periods?.length >= 2
            ? parseFloat(((report.sub_periods[report.sub_periods.length - 1]?.success_rate || 0) - (report.sub_periods[0]?.success_rate || 0)).toFixed(4))
            : null,
    };
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function _modeBreakdown(attributions) {
    const groups = {};
    for (const r of attributions) {
        const m = r.reasoning_mode || 'ANALYTICAL';
        if (!groups[m]) groups[m] = { pass: 0, total: 0 };
        groups[m].total++;
        if (r.task_success) groups[m].pass++;
    }
    const result = {};
    for (const [m, g] of Object.entries(groups)) {
        result[m] = { total: g.total, success_rate: g.total > 0 ? parseFloat((g.pass / g.total).toFixed(4)) : 0 };
    }
    return result;
}

function _depthBreakdown(attributions) {
    const groups = {};
    for (const r of attributions) {
        const d = r.plan_depth ?? 2;
        if (!groups[d]) groups[d] = { pass: 0, total: 0 };
        groups[d].total++;
        if (r.task_success) groups[d].pass++;
    }
    const result = {};
    for (const [d, g] of Object.entries(groups)) {
        result[d] = { total: g.total, success_rate: g.total > 0 ? parseFloat((g.pass / g.total).toFixed(4)) : 0 };
    }
    return result;
}

async function _storeReport(period, data) {
    // Uses cognitive_evolution_reports table (created in migration 013)
    const now = new Date();
    const periodLabel = period === 'quarterly'
        ? `${now.getFullYear()}-Q${Math.ceil((now.getMonth() + 1) / 3)}`
        : period === 'monthly'
            ? `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
            : `${now.getFullYear()}-W${String(_isoWeek(now)).padStart(2, '0')}`;
    try {
        await _sb().from('cognitive_evolution_reports').upsert({
            period,
            period_label: periodLabel,
            data,
            generated_at: now.toISOString(),
        }, { onConflict: 'period,period_label' });
    } catch (e) {
        console.warn('[EvolutionReporter] store failed (non-fatal):', e.message);
    }
}

function _isoWeek(date) {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

// ── Get latest report by period ───────────────────────────────────────────────
async function getLatestReport(period = 'weekly') {
    const { data } = await _sb().from('cognitive_evolution_reports')
        .select('*')
        .eq('period', period)
        .order('generated_at', { ascending: false })
        .limit(1)
        .single();
    return data || null;
}

module.exports = { generateWeeklyReport, generateMonthlyReport, generateQuarterlyReport, getLatestReport };
