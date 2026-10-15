'use strict';
// lib/ministry/weekly-reports.js — 10 ministry weekly narrative reports → Council synthesis → Founder briefing

const log = require('../logger');
function _sb() { return require('../clients').getSupabaseClient(); }
function _ai() { return require('../clients').getAnthropicClient(); }

const HAIKU  = 'claude-haiku-4-5-20251001';
const SONNET = 'claude-sonnet-4-6';

// Monday of the current week (UTC)
function _weekStart() {
    const now = new Date();
    const day = now.getUTCDay(); // 0=Sun
    const diff = day === 0 ? -6 : 1 - day;
    const mon = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + diff));
    return mon.toISOString().slice(0, 10);
}

// ── Data gatherers per ministry ───────────────────────────────────────────────

async function _gatherIntelligence() {
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const [oppRes, lessonRes, newsRes, cpRes] = await Promise.allSettled([
        _sb().from('opportunities').select('title, category, roi_score, status').order('roi_score', { ascending: false }).limit(10),
        _sb().from('apex_lessons').select('*', { count: 'exact', head: true }).gte('created_at', since),
        _sb().from('apex_news_cache').select('*', { count: 'exact', head: true }).gte('created_at', since),
        _sb().from('apex_sync_checkpoints').select('value').eq('key', 'ministry:intelligence:last_run').single(),
    ]);
    return {
        opportunities: oppRes.value?.data || [],
        newLessons:    lessonRes.value?.count || 0,
        newsIngested:  newsRes.value?.count || 0,
        lastRun:       cpRes.value?.data?.value || null,
    };
}

async function _gatherOperations() {
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const [pendRes, compRes, failRes] = await Promise.allSettled([
        _sb().from('agent_tasks').select('*', { count: 'exact', head: true }).in('status', ['pending', 'queued']),
        _sb().from('agent_tasks').select('*', { count: 'exact', head: true }).eq('status', 'completed').gte('updated_at', since),
        _sb().from('cron_run_log').select('*', { count: 'exact', head: true }).eq('status', 'error').gte('started_at', since),
    ]);
    return {
        pendingTasks:  pendRes.value?.count || 0,
        completedTasks: compRes.value?.count || 0,
        cronFailures:  failRes.value?.count || 0,
    };
}

async function _gatherCapital() {
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const [resRes, healthRes, txRes] = await Promise.allSettled([
        _sb().from('resource_consumption').select('tokens_used, cost_usd').gte('created_at', since),
        _sb().from('civilization_health_snapshots').select('overall_score, created_at').order('created_at', { ascending: false }).limit(1).single(),
        _sb().from('apex_transactions').select('type, amount').gte('created_at', since).limit(200),
    ]);
    const res = resRes.value?.data || [];
    const tx  = txRes.value?.data  || [];
    return {
        weeklyTokens: res.reduce((s, r) => s + (r.tokens_used || 0), 0),
        weeklyCostUsd: parseFloat(res.reduce((s, r) => s + (r.cost_usd || 0), 0).toFixed(4)),
        healthScore:  healthRes.value?.data?.overall_score ?? null,
        income:       tx.filter(t => t.type === 'income').reduce((s, t) => s + (t.amount || 0), 0),
        expense:      tx.filter(t => t.type === 'expense').reduce((s, t) => s + (t.amount || 0), 0),
    };
}

async function _gatherGovernance() {
    const [cpRes, auditRes] = await Promise.allSettled([
        _sb().from('apex_sync_checkpoints').select('value').eq('key', 'ministry:governance:last_run').single(),
        _sb().from('apex_tasks').select('*', { count: 'exact', head: true }).eq('status', 'awaiting_approval'),
    ]);
    const cp = cpRes.value?.data;
    return {
        probeScore:     cp?.value ? JSON.parse(cp.value)?.probeScore  : null,
        readinessScore: cp?.value ? JSON.parse(cp.value)?.readinessScore : null,
        pendingApprovals: auditRes.value?.count || 0,
    };
}

async function _gatherInfrastructure() {
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const [cpRes, failRes] = await Promise.allSettled([
        _sb().from('apex_sync_checkpoints').select('*', { count: 'exact', head: true }),
        _sb().from('cron_run_log').select('*', { count: 'exact', head: true }).eq('status', 'error').gte('started_at', since),
    ]);
    return {
        checkpointCount: cpRes.value?.count || 0,
        weeklyFailures:  failRes.value?.count || 0,
        dbReachable:     cpRes.status === 'fulfilled',
    };
}

async function _gatherGrowth() {
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const [oppRes, txRes] = await Promise.allSettled([
        _sb().from('opportunities').select('category, roi_score, status').eq('status', 'identified').order('roi_score', { ascending: false }).limit(10),
        _sb().from('apex_transactions').select('type, amount, category').gte('created_at', since).eq('type', 'income').limit(100),
    ]);
    const income = (txRes.value?.data || []).reduce((s, t) => s + (t.amount || 0), 0);
    return {
        opportunities:    oppRes.value?.data || [],
        weeklyIncomeGbp:  parseFloat(income.toFixed(2)),
    };
}

async function _gatherResearch() {
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const [lessonRes, allLessonRes, cpRes] = await Promise.allSettled([
        _sb().from('apex_lessons').select('title, category').gte('created_at', since).limit(20),
        _sb().from('apex_lessons').select('*', { count: 'exact', head: true }),
        _sb().from('apex_sync_checkpoints').select('value').eq('key', 'expansion:last_scan').single(),
    ]);
    return {
        newLessons:      lessonRes.value?.data || [],
        totalKnowledge:  allLessonRes.value?.count || 0,
        lastExpansionScan: cpRes.value?.data?.value ? JSON.parse(cpRes.value.data.value) : null,
    };
}

async function _gatherProduct() {
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const [compRes, failRes, healthRes] = await Promise.allSettled([
        _sb().from('agent_tasks').select('*', { count: 'exact', head: true }).eq('status', 'completed').gte('updated_at', since),
        _sb().from('agent_tasks').select('*', { count: 'exact', head: true }).eq('status', 'failed').gte('updated_at', since),
        _sb().from('civilization_health_snapshots').select('overall_score, dimensions').order('created_at', { ascending: false }).limit(1).single(),
    ]);
    return {
        tasksCompleted:  compRes.value?.count || 0,
        tasksFailed:     failRes.value?.count || 0,
        healthScore:     healthRes.value?.data?.overall_score ?? null,
        dimensions:      healthRes.value?.data?.dimensions    || {},
    };
}

async function _gatherStrategy() {
    const [sessRes, decRes, healthRes] = await Promise.allSettled([
        _sb().from('council_sessions').select('session_type, consensus_level, created_at').order('created_at', { ascending: false }).limit(3),
        _sb().from('council_decisions').select('description, status, priority').eq('status', 'pending').order('priority').limit(5),
        _sb().from('civilization_health_snapshots').select('overall_score, created_at').order('created_at', { ascending: false }).limit(4),
    ]);
    return {
        recentSessions:   sessRes.value?.data  || [],
        pendingDecisions: decRes.value?.data   || [],
        healthTrend:      healthRes.value?.data || [],
    };
}

async function _gatherRisk() {
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const [failRes, appRes, cpRes] = await Promise.allSettled([
        _sb().from('cron_run_log').select('job_name, error_message, started_at').eq('status', 'error').gte('started_at', since).limit(10),
        _sb().from('apex_tasks').select('*', { count: 'exact', head: true }).eq('status', 'awaiting_approval'),
        _sb().from('apex_sync_checkpoints').select('value').eq('key', 'ministry:governance:last_run').single(),
    ]);
    const cp = cpRes.value?.data;
    return {
        cronFailures:    failRes.value?.data || [],
        pendingApprovals: appRes.value?.count || 0,
        probeScore:      cp?.value ? JSON.parse(cp.value)?.probeScore : null,
    };
}

const MINISTRY_CONFIG = {
    intelligence:  { gather: _gatherIntelligence,  title: 'Ministry of Intelligence' },
    operations:    { gather: _gatherOperations,     title: 'Ministry of Operations'   },
    capital:       { gather: _gatherCapital,        title: 'Ministry of Capital'      },
    governance:    { gather: _gatherGovernance,     title: 'Ministry of Governance'   },
    infrastructure:{ gather: _gatherInfrastructure, title: 'Ministry of Infrastructure'},
    growth:        { gather: _gatherGrowth,         title: 'Ministry of Growth'       },
    research:      { gather: _gatherResearch,       title: 'Ministry of Research'     },
    product:       { gather: _gatherProduct,        title: 'Ministry of Product'      },
    strategy:      { gather: _gatherStrategy,       title: 'Ministry of Strategy'     },
    risk:          { gather: _gatherRisk,           title: 'Ministry of Risk'         },
};

// ── Report generator ──────────────────────────────────────────────────────────

async function generateReport(ministry) {
    const cfg = MINISTRY_CONFIG[ministry];
    if (!cfg) throw new Error(`Unknown ministry: ${ministry}`);

    const weekStart = _weekStart();
    let dataSnapshot = {};
    try { dataSnapshot = await cfg.gather(); } catch (e) {
        log.warn('ministry-reports', `${ministry} data gather failed`, { error: e.message });
    }

    const prompt = [
        `You are the ${cfg.title} weekly intelligence officer for APEX AI OS.`,
        `Write a concise weekly report (3-5 sentences) covering: what happened this week, key metrics, and one priority for next week.`,
        `Be specific and data-driven. Tone: professional, direct, no filler.\n`,
        `DATA:\n${JSON.stringify(dataSnapshot, null, 2)}`,
    ].join('\n');

    let headline = `${cfg.title} — Week of ${weekStart}`;
    let summary  = '';
    try {
        const resp = await _ai().messages.create({
            model:      HAIKU,
            max_tokens: 300,
            messages:   [{ role: 'user', content: prompt }],
        });
        summary  = resp.content[0]?.text?.trim() || '';
        headline = summary.split(/[.\n]/)[0].slice(0, 120) || headline;
    } catch (e) {
        log.warn('ministry-reports', `${ministry} Claude call failed`, { error: e.message });
        summary = `${cfg.title} report generation failed: ${e.message}`;
    }

    const content = { summary, dataSnapshot, keyMetrics: _extractMetrics(ministry, dataSnapshot) };

    try {
        await _sb().from('ministry_reports').upsert(
            { id: `${ministry}-${weekStart}`, ministry, week_start: weekStart, status: 'generated', headline, content, generated_at: new Date().toISOString() },
            { onConflict: 'ministry,week_start' }
        );
    } catch (e) {
        log.warn('ministry-reports', `${ministry} DB upsert failed`, { error: e.message });
    }

    log.info('ministry-reports', `${ministry} report generated`, { headline });
    return { ministry, headline, summary, weekStart };
}

function _extractMetrics(ministry, data) {
    const m = [];
    if (ministry === 'intelligence')   { m.push({ label: 'Opportunities', value: data.opportunities?.length || 0 }); m.push({ label: 'New Lessons', value: data.newLessons || 0 }); }
    if (ministry === 'operations')     { m.push({ label: 'Pending Tasks', value: data.pendingTasks || 0 }); m.push({ label: 'Completed', value: data.completedTasks || 0 }); m.push({ label: 'Cron Failures', value: data.cronFailures || 0 }); }
    if (ministry === 'capital')        { m.push({ label: 'Weekly Cost', value: `$${data.weeklyCostUsd || 0}` }); m.push({ label: 'Health', value: data.healthScore ?? '—' }); }
    if (ministry === 'governance')     { m.push({ label: 'Probe Score', value: data.probeScore ?? '—' }); m.push({ label: 'Pending Approvals', value: data.pendingApprovals || 0 }); }
    if (ministry === 'infrastructure') { m.push({ label: 'Weekly Failures', value: data.weeklyFailures || 0 }); m.push({ label: 'DB Reachable', value: data.dbReachable ? 'Yes' : 'No' }); }
    if (ministry === 'growth')         { m.push({ label: 'Weekly Income', value: `£${data.weeklyIncomeGbp || 0}` }); m.push({ label: 'Opportunities', value: data.opportunities?.length || 0 }); }
    if (ministry === 'research')       { m.push({ label: 'New Lessons', value: data.newLessons?.length || 0 }); m.push({ label: 'Total Knowledge', value: data.totalKnowledge || 0 }); }
    if (ministry === 'product')        { m.push({ label: 'Tasks Completed', value: data.tasksCompleted || 0 }); m.push({ label: 'Health Score', value: data.healthScore ?? '—' }); }
    if (ministry === 'strategy')       { m.push({ label: 'Pending Decisions', value: data.pendingDecisions?.length || 0 }); }
    if (ministry === 'risk')           { m.push({ label: 'Cron Failures', value: data.cronFailures?.length || 0 }); m.push({ label: 'Pending Approvals', value: data.pendingApprovals || 0 }); }
    return m;
}

// ── Weekly cycle orchestrator ─────────────────────────────────────────────────

async function runWeeklyCycle() {
    const weekStart = _weekStart();
    log.info('ministry-weekly-cycle', 'Starting weekly ministry report cycle', { weekStart, ministries: Object.keys(MINISTRY_CONFIG).length });

    // Run all 10 ministry reports in parallel (non-blocking on individual failures)
    const results = await Promise.allSettled(
        Object.keys(MINISTRY_CONFIG).map(m => generateReport(m))
    );

    const reports = results
        .filter(r => r.status === 'fulfilled')
        .map(r => r.value);

    const failed = results
        .filter(r => r.status === 'rejected')
        .map((r, i) => ({ ministry: Object.keys(MINISTRY_CONFIG)[i], error: r.reason?.message }));

    if (failed.length) {
        log.warn('ministry-weekly-cycle', 'Some ministry reports failed', { failed });
    }

    // Synthesise Founder briefing from all reports
    let briefing = '';
    try {
        const reportLines = reports.map(r => `**${r.ministry.toUpperCase()}**: ${r.summary}`).join('\n\n');
        const briefingPrompt = [
            `You are the Supreme Council Chief of Staff for APEX AI OS, preparing the Founder's weekly briefing.`,
            `Synthesize the following 10 ministry reports into a single 5-bullet executive briefing.`,
            `Format: one bullet per critical insight. Prioritise risks, opportunities, and decisions needed. Be direct.\n`,
            `MINISTRY REPORTS:\n${reportLines}`,
        ].join('\n');

        const resp = await _ai().messages.create({
            model:      SONNET,
            max_tokens: 600,
            messages:   [{ role: 'user', content: briefingPrompt }],
        });
        briefing = resp.content[0]?.text?.trim() || '';
    } catch (e) {
        log.warn('ministry-weekly-cycle', 'Founder briefing synthesis failed', { error: e.message });
        briefing = reports.map(r => `• ${r.headline}`).join('\n');
    }

    // Persist briefing as council session
    const sessionId = `MB-${weekStart}-${Date.now().toString(36).toUpperCase()}`;
    try {
        await _sb().from('council_sessions').insert({
            id:           sessionId,
            session_type: 'ministry_briefing',
            agenda:       `Weekly Ministry Briefing — ${weekStart}`,
            context:      { ministries: reports.length, failed: failed.length, weekStart },
            health_score: null,
            status:       'completed',
            recommendation: briefing,
            consensus_level: reports.length >= 8 ? 'strong' : 'partial',
            escalated:    false,
            participants: Object.keys(MINISTRY_CONFIG),
        });
    } catch (e) {
        log.warn('ministry-weekly-cycle', 'Briefing DB write failed', { error: e.message });
    }

    // Founder notification
    try {
        await _sb().from('notifications').insert({
            title:   `Weekly Ministry Briefing — ${weekStart}`,
            message: briefing.slice(0, 500),
            type:    'ministry_briefing',
            metadata: { sessionId, reportsGenerated: reports.length, weekStart },
            read:    false,
        });
    } catch {}

    log.info('ministry-weekly-cycle', 'Weekly cycle complete', { reportsGenerated: reports.length, failed: failed.length, sessionId });
    return { sessionId, reports: reports.length, failed: failed.length, weekStart, briefing };
}

module.exports = { generateReport, runWeeklyCycle, MINISTRY_CONFIG };
