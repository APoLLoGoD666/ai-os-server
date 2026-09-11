'use strict';
const router = require('express').Router();
const { requireAppAccess, requireCronAccess } = require('../../lib/middleware');
const { pgListAgentSchedules } = require('../../lib/supabase-helpers');
const { runDueSchedules, formatScheduleRunSummary } = require('../../lib/agent-task-cycle');
const sbAdmin = require('../../lib/clients').getSupabaseClient();

router.get('/agent-schedules', requireAppAccess, async (req, res) => {
    try {
        const schedules = await pgListAgentSchedules(50);
        res.status(200).json({
            ok: true,
            count: schedules.length,
            schedules
        });
    } catch (error) {
        console.error("AGENT SCHEDULES ERROR:", error);
        res.status(500).json({
            ok: false,
            error: error.message
        });
    }
});

router.post('/run-schedules-now', requireAppAccess, async (req, res) => {
    try {
        const scheduleRun = await runDueSchedules();
        return res.status(200).json({
            ok: true,
            count: scheduleRun.results.length,
            summary: scheduleRun.results.map(formatScheduleRunSummary),
            results: scheduleRun.results
        });
    } catch (error) {
        console.error("RUN SCHEDULES NOW ERROR:", error);
        return res.status(500).json({
            ok: false,
            reply: error.message
        });
    }
});

router.get('/cron/health', requireAppAccess, (req, res) => {
    return res.status(200).json({ ok: true, cronReady: true });
});

router.post('/cron/run-schedules', requireCronAccess, async (req, res) => {
    const cronStart = Date.now();
    const triggeredBy = req.headers['x-triggered-by'] || req.headers['user-agent']?.slice(0, 50) || 'unknown';
    try {
        const scheduleRun = await runDueSchedules();
        const durationMs = Date.now() - cronStart;
        sbAdmin.from('cron_logs').insert({
            triggered_by: triggeredBy,
            schedules_checked: scheduleRun.results?.length ?? 0,
            schedules_run: scheduleRun.results?.filter(r => r.ran).length ?? 0,
            duration_ms: durationMs,
        }).then(({ error }) => { if (error) console.warn('[Cron] log insert failed:', error.message); });

        // Domain agent sweeps — piggyback on existing cron. Morning (6-9 UTC): ops + finance + business + marketing + comms. Evening (18-21 UTC): uni + health.
        const _utcH = new Date().getUTCHours();
        const _isMorning = _utcH >= 6 && _utcH <= 9;
        const _isEvening = _utcH >= 18 && _utcH <= 21;
        if (_isMorning || _isEvening) {
            const _SWEEP_BRIEFS = {
                system:    'Morning system check: Review pipeline health, scan for failed agent runs or cost spikes since midnight, flag any anomalies. Delegate a dashboard refresh to ops-internal-dashboards if needed.',
                finance:   'Morning finance check: Review any new transactions, check budgets for overruns, flag any invoices due today or overdue. Delegate follow-up tasks to your team as needed.',
                business:  'Morning business check: Review the CRM pipeline for stale deals (no activity > 7 days) and overdue follow-ups. Flag proposals awaiting response. Brief your sales team on today\'s priority actions.',
                marketing: 'Morning marketing check: Review campaign performance from the last 24h. Flag any scheduled posts that need assets or copy. Brief the content team on this week\'s priority deliverables.',
                comms:     'Morning comms check: Review any unanswered client emails older than 24h. Flag urgent items (complaints, legal, overdue payments). Brief the triage team on today\'s inbox priorities.',
                uni:       'Evening study check: Review upcoming assignment deadlines in the next 7 days, flag any overdue flashcard reviews, and suggest one study focus for tomorrow.',
                health:    'Evening health check: Summarise today\'s logged workouts, nutrition, and mood. Flag any missed supplement logs. Suggest one recovery or wellness action for tonight.',
            };
            const _sweepSlugs = _isMorning
                ? ['system', 'finance', 'business', 'marketing', 'comms']
                : ['uni', 'health'];
            setImmediate(async () => {
                const { invokeDomainAgent } = require('../../agent-system/domain-agents');
                for (const slug of _sweepSlugs) {
                    try {
                        await invokeDomainAgent(slug, _SWEEP_BRIEFS[slug], { maxTokens: 300 });
                    } catch (e) { console.warn(`[DomainSweep] ${slug}:`, e.message); }
                }
            });
        }

        return res.status(200).json({
            ok: true,
            summary: scheduleRun.results.map(formatScheduleRunSummary).join("\n") || "No enabled schedules are due right now.",
            results: scheduleRun.results
        });
    } catch (error) {
        console.error("CRON RUN SCHEDULES ERROR:", error);
        sbAdmin.from('cron_logs').insert({
            triggered_by: triggeredBy,
            errors: error.message,
            duration_ms: Date.now() - cronStart,
        }).then(({ error: le }) => { if (le) console.warn('[Cron] log insert failed:', le.message); });
        return res.status(500).json({
            ok: false,
            error: error.message
        });
    }
});

module.exports = router;
