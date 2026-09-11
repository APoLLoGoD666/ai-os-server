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

        // Domain agent sweeps — piggyback on existing cron. Morning (6-9 UTC): system + finance. Evening (18-21 UTC): uni + health.
        const _utcH = new Date().getUTCHours();
        const _isMorning = _utcH >= 6 && _utcH <= 9;
        const _isEvening = _utcH >= 18 && _utcH <= 21;
        if (_isMorning || _isEvening) {
            const _sweepSlugs = _isMorning ? ['system', 'finance'] : ['uni', 'health'];
            const _sweepMsg = _isMorning
                ? 'Run your morning domain health check. Review your domain\'s current state and any data available. Flag anything that needs a decision or action. Escalate if required.'
                : 'Run your evening domain health check. Review today\'s activity in your domain. Flag any issues or upcoming items that need attention. Escalate if required.';
            setImmediate(async () => {
                const { invokeDomainAgent } = require('../../agent-system/domain-agents');
                for (const slug of _sweepSlugs) {
                    try {
                        await invokeDomainAgent(slug, _sweepMsg, { maxTokens: 300 });
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
