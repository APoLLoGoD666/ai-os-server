'use strict';

// Organizational Intelligence Engine — Phase 15
// Generates predictive system-wide intelligence.
// Answers: What predicts failure? What predicts success?
// Which procedures create the best outcomes? Which skills?
// Which decisions correlate with risk? Which improvements work?
// Publishes: Obsidian, Notion (if configured), Slack (if configured).
// Postgres is source of truth — publishing is secondary.

const fs                    = require('fs');
const path                  = require('path');
const https                 = require('https');
const { getSupabaseClient } = require('../clients');
const { generateMemoryId }  = require('../memory/memory-governor');

function _sb() { return getSupabaseClient(); }

const OBSIDIAN_VAULT = process.env.OBSIDIAN_VAULT_PATH
    || 'C:\\Users\\arwwo\\Desktop\\AI Scripts\\APEX AI OS';
const SLACK_WEBHOOK  = process.env.SLACK_INTELLIGENCE_WEBHOOK || null;

// Generate a full intelligence report.
async function generate(type = 'weekly') {
    const days  = type === 'quarterly' ? 90 : type === 'monthly' ? 30 : 7;
    const label = _periodLabel(type);

    const [
        failurePredictors,
        successPredictors,
        topProcedures,
        topSkills,
        riskCorrelations,
        improvementEfficacy,
    ] = await Promise.allSettled([
        _findFailurePredictors(days),
        _findSuccessPredictors(days),
        _findTopProcedures(days),
        _findTopSkills(days),
        _findRiskCorrelations(days),
        _assessImprovementEfficacy(days),
    ]);

    const insights = _synthesizeInsights(
        failurePredictors.value || [],
        successPredictors.value || [],
        topProcedures.value     || [],
        topSkills.value         || [],
        riskCorrelations.value  || [],
        improvementEfficacy.value || {}
    );

    const reportId = generateMemoryId('intel-report').replace('mem-', 'ir-');
    const report = {
        report_id:          reportId,
        report_type:        type,
        period_label:       label,
        failure_predictors: (failurePredictors.value || []).slice(0, 10),
        success_predictors: (successPredictors.value || []).slice(0, 10),
        top_procedures:     (topProcedures.value     || []).slice(0, 5),
        top_skills:         (topSkills.value         || []).slice(0, 5),
        risk_correlations:  (riskCorrelations.value  || []).slice(0, 5),
        improvement_efficacy: improvementEfficacy.value || {},
        insights,
        generated_at:       new Date().toISOString(),
    };

    await _storeReport(report);
    await _publishToObsidian(report);
    if (SLACK_WEBHOOK) await _publishToSlack(report).catch(() => {});

    return report;
}

async function _findFailurePredictors(days) {
    try {
        const cutoff = new Date(Date.now() - days * 86400000).toISOString();
        const { data: failed } = await _sb().from('meta_reasoning_observations')
            .select('reasoning_mode, failure_stage, cost_usd, duration_ms')
            .eq('task_success', false)
            .gte('created_at', cutoff)
            .limit(100);

        const predictors = [];
        const byMode  = {};
        const byStage = {};
        for (const r of (failed || [])) {
            if (r.reasoning_mode) byMode[r.reasoning_mode]   = (byMode[r.reasoning_mode]   || 0) + 1;
            if (r.failure_stage)  byStage[r.failure_stage]   = (byStage[r.failure_stage]   || 0) + 1;
        }

        for (const [mode, count] of Object.entries(byMode).sort(([,a],[,b]) => b - a).slice(0, 5)) {
            predictors.push({ type: 'reasoning_mode', value: mode, failure_count: count, predictor: 'reasoning' });
        }
        for (const [stage, count] of Object.entries(byStage).sort(([,a],[,b]) => b - a).slice(0, 5)) {
            predictors.push({ type: 'failure_stage', value: stage, failure_count: count, predictor: 'stage' });
        }

        // High autonomy episodes with failures
        const { data: autonomyFail } = await _sb().from('autonomy_decisions')
            .select('autonomy_level, autonomy_label')
            .gte('created_at', cutoff)
            .lte('autonomy_level', 1)
            .limit(50);
        if ((autonomyFail || []).length > 3) {
            predictors.push({ type: 'autonomy_pattern', value: 'low_autonomy_override', failure_count: autonomyFail.length, predictor: 'governance' });
        }

        return predictors;
    } catch (_) { return []; }
}

async function _findSuccessPredictors(days) {
    try {
        const cutoff = new Date(Date.now() - days * 86400000).toISOString();
        const { data: successful } = await _sb().from('meta_reasoning_observations')
            .select('reasoning_mode, cost_usd')
            .eq('task_success', true)
            .gte('created_at', cutoff)
            .limit(100);

        const byMode = {};
        for (const r of (successful || [])) {
            if (!byMode[r.reasoning_mode]) byMode[r.reasoning_mode] = { count: 0, costSum: 0 };
            byMode[r.reasoning_mode].count++;
            byMode[r.reasoning_mode].costSum += (r.cost_usd || 0);
        }

        return Object.entries(byMode).map(([mode, s]) => ({
            type: 'reasoning_mode', value: mode,
            success_count: s.count,
            avg_cost_usd: parseFloat((s.costSum / s.count).toFixed(5)),
            predictor: 'reasoning',
        })).sort((a, b) => b.success_count - a.success_count);
    } catch (_) { return []; }
}

async function _findTopProcedures(days) {
    try {
        const cutoff = new Date(Date.now() - days * 86400000).toISOString();
        const { data } = await _sb().from('procedural_memory')
            .select('name, domain, confidence, execution_count, success_count, updated_at')
            .gte('updated_at', cutoff)
            .gte('confidence', 0.7)
            .order('success_count', { ascending: false })
            .limit(10);
        return (data || []).map(p => ({
            name: p.name, domain: p.domain, confidence: p.confidence,
            success_rate: p.execution_count > 0 ? (p.success_count || 0) / p.execution_count : null,
        }));
    } catch (_) { return []; }
}

async function _findTopSkills(days) {
    try {
        const { data } = await _sb().from('skill_memory')
            .select('skill_name, domain, competency_level, success_rate, execution_count')
            .gte('success_rate', 0.75)
            .gte('execution_count', 5)
            .order('success_rate', { ascending: false })
            .limit(10);
        return data || [];
    } catch (_) { return []; }
}

async function _findRiskCorrelations(days) {
    try {
        const cutoff = new Date(Date.now() - days * 86400000).toISOString();
        const { data } = await _sb().from('autonomy_decisions')
            .select('autonomy_level, incident_score, contradiction_score, composite_confidence')
            .gte('created_at', cutoff)
            .limit(100);

        const correlations = [];
        const highIncident = (data || []).filter(r => r.incident_score >= 0.2);
        if (highIncident.length > 0) {
            const avgConf = highIncident.reduce((s, r) => s + (r.composite_confidence || 0), 0) / highIncident.length;
            correlations.push({ factor: 'incident_score_high', correlation: 'low_autonomy', sample_size: highIncident.length, avg_confidence: parseFloat(avgConf.toFixed(3)) });
        }
        const highContra = (data || []).filter(r => r.contradiction_score >= 0.2);
        if (highContra.length > 0) {
            correlations.push({ factor: 'contradiction_score_high', correlation: 'reduced_autonomy', sample_size: highContra.length });
        }
        return correlations;
    } catch (_) { return []; }
}

async function _assessImprovementEfficacy(days) {
    try {
        const cutoff = new Date(Date.now() - days * 86400000).toISOString();
        const { data } = await _sb().from('improvement_candidates')
            .select('status, improvement_type, risk_level')
            .gte('created_at', cutoff)
            .limit(50);
        const total      = (data || []).length;
        const deployed   = (data || []).filter(r => r.status === 'deployed' || r.status === 'validated').length;
        const byType     = {};
        for (const r of (data || [])) byType[r.improvement_type] = (byType[r.improvement_type] || 0) + 1;
        return { total, deployed, deployment_rate: total > 0 ? parseFloat((deployed / total).toFixed(3)) : 0, byType };
    } catch (_) { return {}; }
}

function _synthesizeInsights(failurePredictors, successPredictors, topProcedures, topSkills, riskCorrelations, efficacy) {
    const insights = [];

    if (failurePredictors.length > 0) {
        const top = failurePredictors[0];
        insights.push({ type: 'risk', text: `Top failure predictor: ${top.type}=${top.value} (${top.failure_count} failures)` });
    }
    if (successPredictors.length > 0) {
        const top = successPredictors[0];
        insights.push({ type: 'positive', text: `Most successful reasoning mode: ${top.value} (${top.success_count} successes)` });
    }
    if (topProcedures.length > 0) {
        insights.push({ type: 'positive', text: `Best procedure: ${topProcedures[0].name} (${topProcedures[0].domain})` });
    }
    if (topSkills.length > 0) {
        const ts = topSkills[0];
        insights.push({ type: 'positive', text: `Top skill: ${ts.skill_name} — ${Math.round((ts.success_rate || 0) * 100)}% success rate (${ts.execution_count} executions)` });
    }
    if (riskCorrelations.length > 0) {
        insights.push({ type: 'risk', text: `Risk correlation: ${riskCorrelations[0].factor} → ${riskCorrelations[0].correlation}` });
    }
    if (efficacy.total > 0) {
        insights.push({ type: 'positive', text: `Improvement deployment rate: ${Math.round(efficacy.deployment_rate * 100)}% (${efficacy.deployed}/${efficacy.total})` });
    }

    return insights;
}

async function _storeReport(report) {
    try {
        await _sb().from('intelligence_reports').upsert({
            report_id:           report.report_id,
            report_type:         report.report_type,
            period_label:        report.period_label,
            failure_predictors:  report.failure_predictors,
            success_predictors:  report.success_predictors,
            top_procedures:      report.top_procedures,
            top_skills:          report.top_skills,
            risk_correlations:   report.risk_correlations,
            improvement_efficacy: report.improvement_efficacy,
            insights:            report.insights,
            generated_at:        report.generated_at,
        }, { onConflict: 'report_type,period_label' });
    } catch (e) {
        console.error(`[org-intelligence] storeReport failed: ${e.message}`);
    }
}

async function _publishToObsidian(report) {
    try {
        const dir  = path.join(OBSIDIAN_VAULT, '08 Operations', 'Intelligence-Reports');
        const file = path.join(dir, `${report.report_type}-${report.period_label}.md`);
        fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(file, _renderMarkdown(report), 'utf8');
    } catch (e) { console.warn(`[org-intelligence] Obsidian publish failed: ${e.message}`); }
}

async function _publishToSlack(report) {
    const payload = JSON.stringify({
        text: `*Apex AI OS — ${report.report_type.toUpperCase()} Intelligence Report (${report.period_label})*`,
        blocks: [{
            type: 'section',
            text: { type: 'mrkdwn', text: report.insights.slice(0, 3).map(i => `• ${i.text}`).join('\n') },
        }],
    });
    return new Promise((resolve, reject) => {
        const url = new URL(SLACK_WEBHOOK);
        const req = https.request({ hostname: url.hostname, path: url.pathname + url.search, method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) } },
            res => { res.on('data', () => {}); res.on('end', resolve); });
        req.on('error', reject);
        req.write(payload);
        req.end();
    });
}

function _renderMarkdown(report) {
    const lines = [
        `# ${report.report_type.charAt(0).toUpperCase() + report.report_type.slice(1)} Intelligence Report`,
        `**Period:** ${report.period_label}  `,
        `**Generated:** ${report.generated_at}`,
        '',
        '## Insights',
        ...(report.insights || []).map(i => `- ${i.type === 'risk' ? '⚠' : '✅'} ${i.text}`),
        '',
        '## Failure Predictors',
        ...(report.failure_predictors || []).slice(0, 5).map(p => `- ${p.type}: **${p.value}** (${p.failure_count} failures)`),
        '',
        '## Success Predictors',
        ...(report.success_predictors || []).slice(0, 5).map(p => `- ${p.value}: ${p.success_count} successes`),
        '',
        '## Top Skills',
        ...(report.top_skills || []).slice(0, 5).map(s => `- **${s.skill_name}** (${s.domain}) — ${Math.round((s.success_rate || 0) * 100)}% success`),
    ];
    return lines.join('\n');
}

function _periodLabel(type) {
    const now   = new Date();
    const year  = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const d     = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    const week  = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
    if (type === 'quarterly') return `${year}-Q${Math.ceil((now.getMonth() + 1) / 3)}`;
    if (type === 'monthly')   return `${year}-${month}`;
    return `${year}-W${String(week).padStart(2, '0')}`;
}

async function getRecentReports(type = null, limit = 5) {
    try {
        let q = _sb().from('intelligence_reports')
            .select('report_type, period_label, insights, generated_at')
            .order('generated_at', { ascending: false }).limit(limit);
        if (type) q = q.eq('report_type', type);
        const { data } = await q;
        return data || [];
    } catch (_) { return []; }
}

module.exports = { generate, getRecentReports };
