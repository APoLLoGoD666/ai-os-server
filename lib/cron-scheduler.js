'use strict';
// lib/cron-scheduler.js — APEX recurring job scheduler
// Extracted from server.js. Call start() once inside app.listen() after server is stable.
// Crons that reference server.js-scoped state (checkPendingMasterTasks, runDueSchedules,
// runReflectionCheck, _lastPipelineActivity) remain in server.js.

const _log    = require('./logger');
const sbAdmin = require('./clients').getSupabaseClient();
const runtime = require('./models/runtime');

function start() {

    // ── Periodic telemetry (every 5 min) ─────────────────────────────────────
    setInterval(() => {
        const mem = process.memoryUsage();
        const cpu = process.cpuUsage();
        _log.info('health', 'periodic telemetry', {
            uptime_s:    Math.floor(process.uptime()),
            rss_mb:      Math.round(mem.rss      / 1024 / 1024),
            heap_mb:     Math.round(mem.heapUsed  / 1024 / 1024),
            cpu_user_ms: Math.round(cpu.user      / 1000),
            cpu_sys_ms:  Math.round(cpu.system    / 1000),
            ws:          global._apexWsCount || 0,
        });
    }, 300000);

    // ── Retention purge (every 6 hours) ──────────────────────────────────────
    // Purge old read notifications — keep table lean (cap at 200 unread + delete read > 7 days)
    setInterval(async () => {
        try {
            const cutoff = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString();
            await sbAdmin.from('apex_notifications').delete().eq('read', true).lt('created_at', cutoff);
            _log.info('retention', 'apex_notifications: purged read records > 7 days');
        } catch (e) { _log.warn('retention', 'apex_notifications purge failed', { error: e.message }); }
        try {
            const runsCutoff = new Date(Date.now() - 90 * 24 * 3600 * 1000).toISOString();
            await sbAdmin.from('apex_agent_runs').delete().lt('created_at', runsCutoff);
            _log.info('retention', 'apex_agent_runs: purged records > 90 days');
        } catch (e) { _log.warn('retention', 'apex_agent_runs purge failed', { error: e.message }); }
        try {
            const tasksCutoff = new Date(Date.now() - 90 * 24 * 3600 * 1000).toISOString();
            await sbAdmin.from('agent_tasks').delete().in('status', ['done', 'cancelled']).lt('updated_at', tasksCutoff);
            _log.info('retention', 'agent_tasks: purged done/cancelled records > 90 days');
        } catch (e) { _log.warn('retention', 'agent_tasks purge failed', { error: e.message }); }
        try {
            const emailCutoff = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString();
            await sbAdmin.from('email_queue').delete().in('status', ['done', 'error']).lt('updated_at', emailCutoff);
            _log.info('retention', 'email_queue: purged done/error records > 30 days');
        } catch (e) { _log.warn('retention', 'email_queue purge failed', { error: e.message }); }
        try {
            const stagesCutoff = new Date(Date.now() - 90 * 24 * 3600 * 1000).toISOString();
            await sbAdmin.from('apex_agent_stages').delete().lt('created_at', stagesCutoff);
            _log.info('retention', 'apex_agent_stages: purged records > 90 days');
        } catch (e) { _log.warn('retention', 'apex_agent_stages purge failed', { error: e.message }); }
        try {
            const lessonsCutoff = new Date(Date.now() - 180 * 24 * 3600 * 1000).toISOString();
            await sbAdmin.from('apex_lessons').delete().lt('created_at', lessonsCutoff);
            _log.info('retention', 'apex_lessons: purged records > 180 days');
        } catch (e) { _log.warn('retention', 'apex_lessons purge failed', { error: e.message }); }
        try {
            const cronCutoff = new Date(Date.now() - 90 * 24 * 3600 * 1000).toISOString();
            await sbAdmin.from('cron_logs').delete().lt('triggered_at', cronCutoff);
            _log.info('retention', 'cron_logs: purged records > 90 days');
        } catch (e) { _log.warn('retention', 'cron_logs purge failed', { error: e.message }); }
        // NOTE: stale waiting_approval task rejection handled by civilization-runtime Phase 7 (48h cutoff)
        // Removed duplicate 7-day cutoff here to prevent conflicting thresholds
    }, 6 * 60 * 60 * 1000); // every 6 hours

    // ── Nightly wiki consolidation at 3am ─────────────────────────────────────
    (function _scheduleWikiConsolidation() {
        const _now = new Date(), _3am = new Date(_now);
        _3am.setHours(3, 0, 0, 0);
        if (_3am <= _now) _3am.setDate(_3am.getDate() + 1);
        const _delay = _3am.getTime() - _now.getTime();
        setTimeout(function _nightlyWiki() {
            require('./cron-logger').wrapCron('wiki_consolidation', () => require('../agent-system/wiki-reader').consolidateWiki())
                .catch(e => console.warn('[Wiki] nightly consolidation error:', e.message));
            setInterval(() => require('./cron-logger').wrapCron('wiki_consolidation', () => require('../agent-system/wiki-reader').consolidateWiki())
                .catch(e => console.warn('[Wiki] nightly consolidation error:', e.message)),
                24 * 60 * 60 * 1000);
        }, _delay);
        console.log(`[Wiki] Nightly consolidation in ${Math.round(_delay / 60000)}min`);
    })();

    // ── Daily briefing note at 7am ────────────────────────────────────────────
    (function _scheduleDailyBriefing() {
        const _now = new Date(), _7am = new Date(_now);
        _7am.setHours(7, 0, 0, 0);
        if (_7am <= _now) _7am.setDate(_7am.getDate() + 1);
        setTimeout(function _dailyBriefing() {
            try {
                const obsidianMemory = require('../agent-system/obsidian-memory');
                const { obsidianWrite } = require('../agent-system/obsidian-client');
                const briefing = obsidianMemory.generateDailyBriefing();
                if (briefing) {
                    const date = new Date().toISOString().split('T')[0];
                    obsidianWrite(`13 Briefings/Daily/${date}.md`, briefing)
                        .catch(e => console.warn('[DailyBriefing] write error:', e.message));
                    console.log('[DailyBriefing] Written for', date);
                    require('./cron-logger').record('daily_briefing', 'ok').catch(() => {});
                    try {
                        require('../services/pipelines/daily-briefing-pipeline')
                            .runDailyBriefing(require('./pg_database'))
                            .catch(e => console.warn('[DailyBriefing] pipeline failed:', e.message));
                    } catch (_) {}
                }
            } catch (e) { console.warn('[DailyBriefing] error (non-fatal):', e.message); require('./cron-logger').record('daily_briefing', 'error', e.message).catch(() => {}); }
            setInterval(() => {
                try {
                    const obsidianMemory = require('../agent-system/obsidian-memory');
                    const { obsidianWrite } = require('../agent-system/obsidian-client');
                    const briefing = obsidianMemory.generateDailyBriefing();
                    if (briefing) {
                        const date = new Date().toISOString().split('T')[0];
                        obsidianWrite(`13 Briefings/Daily/${date}.md`, briefing).catch(e => console.warn('[DailyBriefing] write error:', e.message));
                    }
                } catch (e) { console.warn('[DailyBriefing] interval error:', e.message); }
            }, 24 * 60 * 60 * 1000);
        }, _7am.getTime() - _now.getTime());
        console.log(`[DailyBriefing] Scheduled in ${Math.round((_7am.getTime() - _now.getTime()) / 60000)}min`);
    })();

    // ── Weekly vault health check — Sundays at 4am ───────────────────────────
    (function _scheduleVaultHealthCheck() {
        function _nextSunday4am() {
            const d = new Date(); d.setHours(4, 0, 0, 0);
            const daysUntilSunday = (7 - d.getDay()) % 7 || 7;
            d.setDate(d.getDate() + daysUntilSunday);
            return d;
        }
        const _next = _nextSunday4am();
        setTimeout(function _vaultHealth() {
            require('./cron-logger').wrapCron('vault_health', () => require('../agent-system/wiki-reader').checkVaultHealth())
                .catch(e => console.warn('[VaultHealth] error:', e.message));
            setInterval(() => require('./cron-logger').wrapCron('vault_health', () => require('../agent-system/wiki-reader').checkVaultHealth())
                .catch(e => console.warn('[VaultHealth] interval error:', e.message)), 7 * 24 * 60 * 60 * 1000);
        }, _next.getTime() - Date.now());
        console.log(`[VaultHealth] Weekly check scheduled for ${_next.toDateString()}`);
    })();

    // ── Weekly review — Sundays at 8am ────────────────────────────────────────
    (function _scheduleWeeklyReview() {
        async function _generateWeeklyReview() {
            if (!process.env.ANTHROPIC_API_KEY) return;
            const today = new Date().toISOString().split('T')[0];
            const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0];
            try {
                const [tasksRes, runsRes, finRes, healthRes] = await Promise.allSettled([
                    sbAdmin.from('apex_tasks').select('title,status,created_at').gte('created_at', weekAgo).limit(50),
                    sbAdmin.from('apex_agent_runs').select('cost_usd,success,model').gte('created_at', weekAgo).limit(200),
                    sbAdmin.from('apex_transactions').select('description,amount,category').gte('date', weekAgo).limit(50),
                    sbAdmin.from('apex_workouts').select('type,duration_min,date').gte('date', weekAgo).limit(20),
                ]);
                const tasks    = tasksRes.value?.data    || [];
                const runs     = runsRes.value?.data     || [];
                const finance  = finRes.value?.data      || [];
                const workouts = healthRes.value?.data   || [];
                const totalCost  = runs.reduce((s, r) => s + (r.cost_usd || 0), 0);
                const successRate = runs.length ? (runs.filter(r => r.success).length / runs.length * 100).toFixed(0) : 'N/A';
                const prompt = [
                    `Week ending ${today}. Produce a concise Apex AI OS weekly review in markdown.`,
                    '',
                    `## Tasks (${tasks.length})`,
                    tasks.slice(0, 20).map(t => `- [${t.status}] ${t.title}`).join('\n') || 'None',
                    '',
                    `## AI Agent Activity`,
                    `- ${runs.length} runs · success rate ${successRate}% · total cost $${totalCost.toFixed(4)}`,
                    '',
                    `## Finance (${finance.length} transactions)`,
                    finance.slice(0, 10).map(t => `- ${t.category}: £${t.amount} — ${t.description}`).join('\n') || 'No data',
                    '',
                    `## Health (${workouts.length} workouts)`,
                    workouts.map(w => `- ${w.date}: ${w.type} ${w.duration_min}min`).join('\n') || 'No workouts logged',
                    '',
                    'Write the review with: Executive Summary (3 bullets), Wins, Concerns, Next Week Focus.',
                ].join('\n');
                const { result: msg } = await runtime.execute({
                    tier: 'fast', caller: 'weekly-review',
                    maxTokens: 1200,
                    messages: [{ role: 'user', content: prompt }]
                });
                const review = msg.content[0]?.text?.trim();
                if (review) {
                    await require('../agent-system/obsidian-client').obsidianWrite(
                        `13 Briefings/Weekly/Weekly-Review-${today}.md`,
                        `# Weekly Review — ${today}\n\n${review}`
                    );
                    console.log(`[WeeklyReview] Written to 13 Briefings/Weekly/Weekly-Review-${today}.md`);
                    require('./cron-logger').record('weekly_review', 'ok').catch(() => {});
                    try {
                        const _slackBrief = require('../services/slack/slack-briefings');
                        const _wkOf = today;
                        _slackBrief.postWeeklyReview({
                            weekOf: _wkOf,
                            completedTasks: tasks.filter(t => t.status === 'done').length,
                            totalAgentRuns: runs.length,
                            totalApiSpend: totalCost,
                            healthSummary: `${workouts.length} workouts`,
                            financeSummary: `${finance.length} transactions`,
                        }).catch(e => console.warn('[WeeklyReview] Slack post failed:', e.message));
                    } catch (_) {}
                }
            } catch (e) { console.warn('[WeeklyReview] error (non-fatal):', e.message); require('./cron-logger').record('weekly_review', 'error', e.message).catch(() => {}); }
        }
        function _nextSunday8am() {
            const d = new Date(); d.setHours(8, 0, 0, 0);
            const daysUntilSunday = (7 - d.getDay()) % 7 || 7;
            d.setDate(d.getDate() + daysUntilSunday);
            return d;
        }
        const _next = _nextSunday8am();
        setTimeout(function _weeklyReview() {
            _generateWeeklyReview();
            setInterval(_generateWeeklyReview, 7 * 24 * 60 * 60 * 1000);
        }, _next.getTime() - Date.now());
        console.log(`[WeeklyReview] Scheduled for ${_next.toDateString()} 08:00`);
    })();

    // ── Weekly adaptation refresh — Sundays at 1am ───────────────────────────
    (function _scheduleAdaptationRefresh() {
        function _nextSunday1am() {
            const d = new Date(); d.setHours(1, 0, 0, 0);
            const daysUntil = (7 - d.getDay()) % 7 || 7;
            d.setDate(d.getDate() + daysUntil);
            return d;
        }
        async function _runAdaptationRefresh() {
            try {
                const ae = require('../agent-system/adaptation-engine');
                const result = await ae.runCycle();
                console.log(`[AdaptCron] Cycle complete — totalActive=${result.totalActive} avgConf=${result.avgConfidence}`);
                require('./cron-logger').record('adaptation_refresh', 'ok').catch(() => {});
            } catch (e) {
                console.warn('[AdaptCron] refresh error (non-fatal):', e.message);
                require('./cron-logger').record('adaptation_refresh', 'error', e.message).catch(() => {});
            }
        }
        const _next = _nextSunday1am();
        setTimeout(function _adaptationRefresh() {
            _runAdaptationRefresh();
            setInterval(_runAdaptationRefresh, 7 * 24 * 60 * 60 * 1000);
        }, _next.getTime() - Date.now());
        console.log(`[AdaptCron] Weekly refresh scheduled for ${_next.toDateString()} 01:00`);
    })();

    // ── Weekly certification — Sundays at 3am ────────────────────────────────
    (function _scheduleWeeklyCertification() {
        function _nextSunday3am() {
            const d = new Date(); d.setHours(3, 0, 0, 0);
            const daysUntil = (7 - d.getDay()) % 7 || 7;
            d.setDate(d.getDate() + daysUntil);
            return d;
        }
        async function _runCertification() {
            try {
                const { runAll } = require('./certification/checker');
                const result = await runAll();
                console.log(`[CertCron] Weekly certification: pass=${result.pass} pass_count=${result.pass_count}/${result.clauses?.length}`);
                require('./cron-logger').record('weekly_certification', result.pass ? 'ok' : 'error', result.pass ? null : 'certification failed').catch(() => {});
            } catch (e) {
                console.warn('[CertCron] certification error (non-fatal):', e.message);
                require('./cron-logger').record('weekly_certification', 'error', e.message).catch(() => {});
            }
        }
        const _next = _nextSunday3am();
        setTimeout(function _certCron() {
            _runCertification();
            setInterval(_runCertification, 7 * 24 * 60 * 60 * 1000);
        }, _next.getTime() - Date.now());
        console.log(`[CertCron] Weekly certification scheduled for ${_next.toDateString()} 03:00`);
    })();

    // ── Weekly technical debt audit — Sundays at 2am ─────────────────────────
    (function _scheduleTechDebtAudit() {
        function _nextSunday2am() {
            const d = new Date(); d.setHours(2, 0, 0, 0);
            const daysUntil = (7 - d.getDay()) % 7 || 7;
            d.setDate(d.getDate() + daysUntil);
            return d;
        }
        async function _runTechDebtAudit() {
            if (!process.env.ANTHROPIC_API_KEY) return;
            const today = new Date().toISOString().split('T')[0];
            const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0];
            try {
                const [runsRes, stagesRes] = await Promise.allSettled([
                    sbAdmin.from('apex_agent_runs')
                        .select('task_id,success,cost_usd,complexity,duration_ms,created_at,agent_summary')
                        .gte('created_at', weekAgo).limit(500),
                    sbAdmin.from('apex_agent_stages')
                        .select('stage,success,error,duration_ms')
                        .gte('created_at', weekAgo).limit(2000),
                ]);
                const runs   = runsRes.value?.data   || [];
                const stages = stagesRes.value?.data || [];

                if (!runs.length) return;

                const totalRuns    = runs.length;
                const failedRuns   = runs.filter(r => !r.success).length;
                const totalCost    = runs.reduce((s, r) => s + (r.cost_usd || 0), 0);
                const avgDurMs     = runs.reduce((s, r) => s + (r.duration_ms || 0), 0) / totalRuns;
                const slowRuns     = runs.filter(r => (r.duration_ms || 0) > 120000).length;

                const stageFailures = {};
                for (const s of stages) {
                    if (!s.success) stageFailures[s.stage] = (stageFailures[s.stage] || 0) + 1;
                }
                const hotspots = Object.entries(stageFailures)
                    .sort((a, b) => b[1] - a[1])
                    .map(([stage, count]) => `${stage}: ${count} failures`)
                    .join(', ') || 'none';

                const report = [
                    `# Technical Debt Audit — ${today}`,
                    `*Generated by APEX AI OS automated debt engine*`,
                    '',
                    `## Agent Pipeline Health`,
                    `- **Runs this week:** ${totalRuns}`,
                    `- **Failure rate:** ${failedRuns}/${totalRuns} (${totalRuns ? Math.round(failedRuns/totalRuns*100) : 0}%)`,
                    `- **Total AI cost:** $${totalCost.toFixed(4)}`,
                    `- **Avg duration:** ${Math.round(avgDurMs / 1000)}s`,
                    `- **Slow runs (>2min):** ${slowRuns}`,
                    `- **Failure hotspots:** ${hotspots}`,
                    '',
                    `## Recommended Actions`,
                    failedRuns / Math.max(totalRuns, 1) > 0.3 ? `- ⚠️ Failure rate >30% — investigate recurring errors in apex_agent_stages` : `- ✅ Failure rate acceptable`,
                    slowRuns > 5 ? `- ⚠️ ${slowRuns} slow runs — check DEVELOPER agent retry escalation` : `- ✅ Pipeline speed normal`,
                    totalCost > 5 ? `- ⚠️ High weekly cost $${totalCost.toFixed(2)} — review complexity routing` : `- ✅ Cost within budget`,
                ].join('\n');

                const { obsidianWrite } = require('../agent-system/obsidian-client');
                await obsidianWrite(`15 System/TechDebt/${today}.md`, report)
                    .catch(e => console.warn('[TechDebt] vault write failed:', e.message));

                await sbAdmin.from('apex_notifications').insert({
                    title: `Weekly Tech Debt Audit — ${today}`,
                    body: `${failedRuns}/${totalRuns} failures · $${totalCost.toFixed(4)} cost · hotspots: ${hotspots}`,
                    type: 'system', read: false, created_at: new Date().toISOString(),
                }).catch(() => {});

                require('./cron-logger').record('tech_debt_audit', 'ok').catch(() => {});
                console.log(`[TechDebt] Weekly audit complete — ${failedRuns}/${totalRuns} failures, $${totalCost.toFixed(4)}`);
            } catch (e) {
                console.warn('[TechDebt] audit error (non-fatal):', e.message);
                require('./cron-logger').record('tech_debt_audit', 'error', e.message).catch(() => {});
            }
        }
        const _next = _nextSunday2am();
        setTimeout(function _techDebt() {
            _runTechDebtAudit();
            setInterval(_runTechDebtAudit, 7 * 24 * 60 * 60 * 1000);
        }, _next.getTime() - Date.now());
        console.log(`[TechDebt] Weekly audit scheduled for ${_next.toDateString()} 02:00`);
    })();

    // ── Weekly lesson consolidation — Sundays at 3am ─────────────────────────
    (function _scheduleLessonConsolidation() {
        async function _runLessonConsolidation() {
            try {
                const mem    = require('../agent-system/obsidian-memory');
                const engine = require('../agent-system/reflection-engine');
                const raw    = mem.getLessons();
                if (!raw || raw.length < 3000) return;
                const consolidated = engine.consolidateLessons(raw, 30);
                mem.write('01 Executive/Lessons.md', consolidated);
                console.log('[LessonCron] Lessons.md consolidated to 30 entries');
                await require('./cron-logger').record('lesson_consolidation', 'ok').catch(() => {});
            } catch (e) {
                console.warn('[LessonCron] consolidation failed (non-fatal):', e.message);
                await require('./cron-logger').record('lesson_consolidation', 'error', e.message).catch(() => {});
            }
        }
        function _nextSunday3am() {
            const d = new Date(); d.setHours(3, 0, 0, 0);
            const daysUntilSunday = (7 - d.getDay()) % 7 || 7;
            d.setDate(d.getDate() + daysUntilSunday);
            return d;
        }
        const _next = _nextSunday3am();
        setTimeout(function _lessonConsolidation() {
            _runLessonConsolidation();
            setInterval(_runLessonConsolidation, 7 * 24 * 60 * 60 * 1000);
        }, _next.getTime() - Date.now());
        console.log(`[LessonCron] Weekly consolidation scheduled for ${_next.toDateString()} 03:00`);
    })();

    // ── Weekly evolution cycle — Sundays at 05:30 UTC ────────────────────────
    (() => {
        const MS_WEEK = 7 * 24 * 60 * 60 * 1000;
        async function _runEvolutionCycle() {
            try {
                const _imp = require('../agent-system/improvement-executor');
                await _imp.generateRoadmap();
                console.log('[EvolutionCycle] Weekly roadmap generated');
                require('./cron-logger').record('evolution_cycle', 'ok').catch(() => {});
            } catch (e) {
                console.warn('[EvolutionCycle] error (non-fatal):', e.message);
                require('./cron-logger').record('evolution_cycle', 'error', e.message).catch(() => {});
            }
        }
        const now = new Date();
        const daysUntilSunday = (7 - now.getUTCDay()) % 7 || 7;
        const nextSundayMs = new Date(Date.UTC(
            now.getUTCFullYear(), now.getUTCMonth(),
            now.getUTCDate() + daysUntilSunday, 5, 30, 0
        )) - now;
        setTimeout(() => {
            _runEvolutionCycle();
            setInterval(_runEvolutionCycle, MS_WEEK);
        }, Math.max(nextSundayMs, 60000));
        console.log('[EvolutionCycle] Weekly roadmap scheduled for Sun 05:30 UTC');
    })();

    // ── News ingest — 6am daily ───────────────────────────────────────────────
    (function _scheduleNewsIngest() {
        const { ingestNews } = require('../agent-system/news-ingest');
        const _now = new Date(), _6am = new Date(_now);
        _6am.setHours(6, 0, 0, 0);
        if (_6am <= _now) _6am.setDate(_6am.getDate() + 1);
        // Initial run after 5min (avoid OOM spike during server cold-start)
        setTimeout(() => require('./cron-logger').wrapCron('news_ingest', () => ingestNews()).catch(e => console.warn('[News] startup ingest failed:', e.message)), 300000);
        setTimeout(function _dailyNews() {
            require('./cron-logger').wrapCron('news_ingest', () => ingestNews()).catch(e => console.warn('[News] ingest error:', e.message));
            setInterval(() => require('./cron-logger').wrapCron('news_ingest', () => ingestNews()).catch(e => console.warn('[News] ingest error:', e.message)), 24 * 60 * 60 * 1000);
        }, _6am.getTime() - _now.getTime());
        console.log(`[News] Daily ingest scheduled for 06:00, initial run in 30s`);
    })();

    // ── Calendar sync — every 30 minutes ─────────────────────────────────────
    (function _scheduleCalendarSync() {
        const { syncGoogleCalendar } = require('../routes/communications');
        const doSync = () => require('./cron-logger').wrapCron('calendar_sync', () => syncGoogleCalendar()
            .then(r => { if (r.count) console.log(`[Calendar] Auto-sync: ${r.count} events`); }))
            .catch(e => console.warn('[Calendar] sync error:', e.message));
        setTimeout(doSync, 360000); // initial run after 6min (spread startup load)
        setInterval(doSync, 30 * 60 * 1000);
        console.log('[Calendar] Auto-sync every 30 minutes');
    })();

    // ── Memory Architecture crons ─────────────────────────────────────────────

    // Working memory TTL cleanup — every 15 minutes
    setInterval(() => require('./cron-logger').wrapCron('wm_cleanup', () =>
        require('./memory/working-memory').clearExpired()
    ), 15 * 60 * 1000);

    // Memory consolidation engine — every hour
    setInterval(() => require('./cron-logger').wrapCron('mem_consolidation', async () => {
        const engine = require('./memory/consolidation-engine');
        const results = await engine.process(10);
        await engine.purgeOld(7);
        console.log(`[mem_consolidation] processed ${results.length} items`);
    }), 60 * 60 * 1000);

    // Weekly adaptation cycle — every Sunday at ~05:00 UTC
    // Runs on first Sunday after deploy, then weekly.
    (() => {
        const MS_WEEK = 7 * 24 * 60 * 60 * 1000;
        const now     = new Date();
        const daysUntilSunday = (7 - now.getUTCDay()) % 7 || 7;
        const nextSundayMs    = new Date(Date.UTC(
            now.getUTCFullYear(), now.getUTCMonth(),
            now.getUTCDate() + daysUntilSunday, 5, 0, 0
        )) - now;
        setTimeout(() => {
            require('./cron-logger').wrapCron('adaptation_cycle', () =>
                require('./memory/adaptation-cycle').runWeeklyCycle()
            );
            setInterval(() => require('./cron-logger').wrapCron('adaptation_cycle', () =>
                require('./memory/adaptation-cycle').runWeeklyCycle()
            ), MS_WEEK);
        }, Math.max(nextSundayMs, 60000));
    })();

    // ── Intelligence layer crons ──────────────────────────────────────────────

    // Knowledge validation — every hour (processes pending lesson submissions)
    setInterval(() => require('./cron-logger').wrapCron('knowledge_validation', async () => {
        const kv = require('./intelligence/knowledge-validator');
        const s  = await kv.processPending(20);
        console.log(`[knowledge_validation] processed=${s.processed} validated=${s.validated} rejected=${s.rejected}`);
    }), 60 * 60 * 1000);

    // Contradiction full scan — every Sunday at ~06:00 UTC
    (() => {
        const MS_WEEK = 7 * 24 * 60 * 60 * 1000;
        const now     = new Date();
        const daysUntilSunday = (7 - now.getUTCDay()) % 7 || 7;
        const nextSundayMs    = new Date(Date.UTC(
            now.getUTCFullYear(), now.getUTCMonth(),
            now.getUTCDate() + daysUntilSunday, 6, 0, 0
        )) - now;
        setTimeout(() => {
            require('./cron-logger').wrapCron('contradiction_scan', () =>
                require('./intelligence/contradiction-engine').fullScan()
            );
            setInterval(() => require('./cron-logger').wrapCron('contradiction_scan', () =>
                require('./intelligence/contradiction-engine').fullScan()
            ), MS_WEEK);
        }, Math.max(nextSundayMs, 60000));
    })();

    // Memory lifecycle cycle — every Sunday at ~07:00 UTC
    (() => {
        const MS_WEEK = 7 * 24 * 60 * 60 * 1000;
        const now     = new Date();
        const daysUntilSunday = (7 - now.getUTCDay()) % 7 || 7;
        const nextSundayMs    = new Date(Date.UTC(
            now.getUTCFullYear(), now.getUTCMonth(),
            now.getUTCDate() + daysUntilSunday, 7, 0, 0
        )) - now;
        setTimeout(() => {
            require('./cron-logger').wrapCron('lifecycle_cycle', () =>
                require('./intelligence/memory-lifecycle-engine').runLifecycleCycle()
            );
            setInterval(() => require('./cron-logger').wrapCron('lifecycle_cycle', () =>
                require('./intelligence/memory-lifecycle-engine').runLifecycleCycle()
            ), MS_WEEK);
        }, Math.max(nextSundayMs, 60000));
    })();

    // Weekly learning report + skill snapshot — every Sunday at ~08:00 UTC
    (() => {
        const MS_WEEK = 7 * 24 * 60 * 60 * 1000;
        const now     = new Date();
        const daysUntilSunday = (7 - now.getUTCDay()) % 7 || 7;
        const nextSundayMs    = new Date(Date.UTC(
            now.getUTCFullYear(), now.getUTCMonth(),
            now.getUTCDate() + daysUntilSunday, 8, 0, 0
        )) - now;
        setTimeout(async () => {
            require('./cron-logger').wrapCron('weekly_learning', async () => {
                const orgL  = require('./intelligence/organizational-learning-engine');
                const skillE = require('./intelligence/skill-evolution-engine');
                const [report, snapshot, consolidation, reflexionRank] = await Promise.allSettled([
                    orgL.generateWeeklyReport(),
                    skillE.takeWeeklySnapshot(),
                    require('./memory/consolidation-engine').consolidate().catch(() => {}),  // C3: episodic→semantic
                    require('./memory/reflexion-ranker').rankAndDecay().catch(() => {}),     // C4: lesson quality
                ]);
                console.log(`[weekly_learning] report=${report.status} snapshot=${snapshot.status} consolidation=${consolidation.status} reflexion=${reflexionRank.status}`);
            });
            setInterval(() => require('./cron-logger').wrapCron('weekly_learning', async () => {
                const orgL  = require('./intelligence/organizational-learning-engine');
                const skillE = require('./intelligence/skill-evolution-engine');
                await Promise.allSettled([
                    orgL.generateWeeklyReport(),
                    skillE.takeWeeklySnapshot(),
                    require('./memory/consolidation-engine').consolidate().catch(() => {}),
                    require('./memory/reflexion-ranker').rankAndDecay().catch(() => {}),
                ]);
            }), MS_WEEK);
        }, Math.max(nextSundayMs, 60000));
    })();

    // Improvement auto-queue processor — every 30 minutes (catch-up for auto-deploy items)
    setInterval(() => require('./cron-logger').wrapCron('improvement_autoqueue', () =>
        require('./intelligence/improvement-governor').processAutoQueue()
    ), 30 * 60 * 1000);

    // ── Cognitive Layer Crons ─────────────────────────────────────────────────
    if ((process.env.COGNITIVE_CRONS_ENABLED ?? 'true') !== 'false') {
        const MS_WEEK_COG = 7 * 24 * 60 * 60 * 1000;

        // Knowledge decay cycle — every Sunday at ~09:00 UTC
        (function _scheduleCognKnowledgeDecay() {
            const now2 = new Date();
            const daysToSun2 = (7 - now2.getUTCDay()) % 7;
            const nextSunMs2 = new Date(Date.UTC(
                now2.getUTCFullYear(), now2.getUTCMonth(),
                now2.getUTCDate() + daysToSun2, 9, 0, 0
            )) - now2;
            setTimeout(() => {
                require('./cron-logger').wrapCron('knowledge_decay', () =>
                    require('./cognitive/knowledge-decay-engine').runDecayCycle()
                );
                setInterval(() => require('./cron-logger').wrapCron('knowledge_decay', () =>
                    require('./cognitive/knowledge-decay-engine').runDecayCycle()
                ), MS_WEEK_COG);
            }, Math.max(nextSunMs2, 60000));
        })();

        // Cognitive evolution cycle — every Sunday at ~10:00 UTC
        (function _scheduleCognEvolution() {
            const now2 = new Date();
            const daysToSun2 = (7 - now2.getUTCDay()) % 7;
            const nextSunMs2 = new Date(Date.UTC(
                now2.getUTCFullYear(), now2.getUTCMonth(),
                now2.getUTCDate() + daysToSun2, 10, 0, 0
            )) - now2;
            setTimeout(() => {
                require('./cron-logger').wrapCron('cognitive_evolution', () =>
                    require('./cognitive/cognitive-evolution-engine').runEvolutionCycle()
                );
                setInterval(() => require('./cron-logger').wrapCron('cognitive_evolution', () =>
                    require('./cognitive/cognitive-evolution-engine').runEvolutionCycle()
                ), MS_WEEK_COG);
            }, Math.max(nextSunMs2, 60000));
        })();

        // Cognitive performance metrics — every Sunday at ~11:00 UTC
        (function _scheduleCognPerformance() {
            const now2 = new Date();
            const daysToSun2 = (7 - now2.getUTCDay()) % 7;
            const nextSunMs2 = new Date(Date.UTC(
                now2.getUTCFullYear(), now2.getUTCMonth(),
                now2.getUTCDate() + daysToSun2, 11, 0, 0
            )) - now2;
            setTimeout(() => {
                require('./cron-logger').wrapCron('cognitive_performance', () =>
                    require('./cognitive/cognitive-performance-engine').computeMetrics('weekly')
                );
                setInterval(() => require('./cron-logger').wrapCron('cognitive_performance', () =>
                    require('./cognitive/cognitive-performance-engine').computeMetrics('weekly')
                ), MS_WEEK_COG);
            }, Math.max(nextSunMs2, 60000));
        })();

        // Organizational intelligence report — every Sunday at ~12:00 UTC
        (function _scheduleCognOrgIntel() {
            const now2 = new Date();
            const daysToSun2 = (7 - now2.getUTCDay()) % 7;
            const nextSunMs2 = new Date(Date.UTC(
                now2.getUTCFullYear(), now2.getUTCMonth(),
                now2.getUTCDate() + daysToSun2, 12, 0, 0
            )) - now2;
            setTimeout(() => {
                require('./cron-logger').wrapCron('org_intelligence', () =>
                    require('./cognitive/organizational-intelligence-engine').generate('weekly')
                );
                setInterval(() => require('./cron-logger').wrapCron('org_intelligence', () =>
                    require('./cognitive/organizational-intelligence-engine').generate('weekly')
                ), MS_WEEK_COG);
            }, Math.max(nextSunMs2, 60000));
        })();

        // Behavioral modification expiry — nightly at 03:00 UTC (migration 034)
        setInterval(async () => {
            try {
                const { getSupabaseClient } = require('./clients');
                const { error } = await getSupabaseClient()
                    .from('behavioral_modifications')
                    .delete()
                    .lt('expires_at', new Date().toISOString())
                    .not('expires_at', 'is', null);
                if (error) console.warn('[BehaviorExpiry] cleanup error:', error.message);
                else console.log('[BehaviorExpiry] expired constraints cleared');
            } catch (e) { console.warn('[BehaviorExpiry] cron failed (non-fatal):', e.message); }
        }, 24 * 60 * 60 * 1000);
        // Weekly cognitive intelligence report — runs Sunday at 08:00 UTC
        (() => {
            const now3 = new Date();
            const nextSun3 = new Date(now3);
            nextSun3.setUTCHours(8, 0, 0, 0);
            const daysUntilSun3 = (7 - now3.getUTCDay()) % 7 || 7;
            nextSun3.setUTCDate(nextSun3.getUTCDate() + daysUntilSun3);
            setTimeout(() => {
                require('./cron-logger').wrapCron('cognitive_weekly_report', () =>
                    require('./cognitive/reporting/intelligence-evolution-reporter').generateWeeklyReport()
                );
                setInterval(() => require('./cron-logger').wrapCron('cognitive_weekly_report', () =>
                    require('./cognitive/reporting/intelligence-evolution-reporter').generateWeeklyReport()
                ), MS_WEEK_COG);
            }, Math.max(nextSun3.getTime() - now3.getTime(), 60000));
        })();
    } // end COGNITIVE_CRONS_ENABLED

    // ── Civilization Runtime — full autonomous cycle every 6 hours ────────────
    // DATA-5: Civilization Health cron migrated to civilization-health-engine.js (schema_version:2).
    // Health snapshots now written by civilization-runtime.js which calls
    // civilization-health-engine.snapshot() on its 6-hour cycle.
    (function _scheduleCivRuntime() {
        const MS_6H = 6 * 60 * 60 * 1000;
        setTimeout(() => {
            require('./cron-logger').wrapCron('civilization_runtime', async () => {
                const civRuntime = require('./intelligence/civilization-runtime');
                if (!civRuntime.isRunning()) {
                    civRuntime.start(MS_6H);
                    console.log('[civilization_runtime] autonomous cycle started (6h interval)');
                }
            });
        }, 60_000); // 60s after boot — fast enough to survive container warm windows
    })();

    // ── Intelligence reality loop — OODA cycle (15-min interval) ─────────────
    setTimeout(() => {
        try {
            require('./intelligence/reality-loop').start(15 * 60 * 1000); // 15-minute interval
            console.log('[Intelligence] Reality loop started (15min OODA cycle)');
        } catch (err) {
            console.warn('[Intelligence] Reality loop start failed (non-fatal):', err.message);
        }
    }, 60000); // 1-minute warm-up delay after server is stable

    // ── Memory consolidation — nightly at 2am (episodic→semantic promotion) ──
    (function _scheduleMemoryConsolidation() {
        const _now = new Date(), _2am = new Date(_now);
        _2am.setHours(2, 0, 0, 0);
        if (_2am <= _now) _2am.setDate(_2am.getDate() + 1);
        async function _runConsolidation() {
            try {
                const engine = require('./memory/consolidation-engine');
                const stats  = await engine.process(20);
                console.log('[MemConsolidate] processed batch — stats:', JSON.stringify(stats));
                require('./cron-logger').record('memory_consolidation', 'ok').catch(() => {});
                await engine.purgeOld(7).catch(() => {});
            } catch (e) {
                console.warn('[MemConsolidate] error (non-fatal):', e.message);
                require('./cron-logger').record('memory_consolidation', 'error', e.message).catch(() => {});
            }
        }
        setTimeout(function _nightlyConsolidation() {
            _runConsolidation();
            setInterval(_runConsolidation, 24 * 60 * 60 * 1000);
        }, _2am.getTime() - _now.getTime());
        console.log(`[MemConsolidate] Nightly consolidation in ${Math.round((_2am.getTime() - _now.getTime()) / 60000)}min`);
    })();
    // ── Ministry of Intelligence — knowledge & opportunity pulse (every 6h, +3h offset) ─
    setTimeout(() => {
        require('./cron-logger').wrapCron('ministry_intelligence', () =>
            require('./ministry').runIntelligenceMinistry()
        ).catch(() => {});
        setInterval(() => require('./cron-logger').wrapCron('ministry_intelligence', () =>
            require('./ministry').runIntelligenceMinistry()
        ).catch(() => {}), 6 * 60 * 60 * 1000);
    }, 3 * 60 * 60 * 1000 + 90_000);

    // ── Ministry of Operations — task queue health (every 4h) ────────────────
    setTimeout(() => {
        require('./cron-logger').wrapCron('ministry_operations', () =>
            require('./ministry').runOperationsMinistry()
        ).catch(() => {});
        setInterval(() => require('./cron-logger').wrapCron('ministry_operations', () =>
            require('./ministry').runOperationsMinistry()
        ).catch(() => {}), 4 * 60 * 60 * 1000);
    }, 120_000);

    // ── Ministry of Capital — resource & budget health (daily 06:00 UTC) ─────
    (function _scheduleCapitalMinistry() {
        const now = new Date();
        const next = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 6, 0, 0));
        if (next <= now) next.setUTCDate(next.getUTCDate() + 1);
        setTimeout(() => {
            require('./cron-logger').wrapCron('ministry_capital', () =>
                require('./ministry').runCapitalMinistry()
            ).catch(() => {});
            setInterval(() => require('./cron-logger').wrapCron('ministry_capital', () =>
                require('./ministry').runCapitalMinistry()
            ).catch(() => {}), 24 * 60 * 60 * 1000);
        }, Math.max(next - now, 60_000));
        console.log(`[Ministry:Capital] Next run: ${next.toISOString()}`);
    })();

    // ── Ministry of Governance — probe & compliance (daily 00:00 UTC) ────────
    (function _scheduleGovernanceMinistry() {
        const now = new Date();
        const next = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1, 0, 0, 0));
        setTimeout(() => {
            require('./cron-logger').wrapCron('ministry_governance', () =>
                require('./ministry').runGovernanceMinistry()
            ).catch(() => {});
            setInterval(() => require('./cron-logger').wrapCron('ministry_governance', () =>
                require('./ministry').runGovernanceMinistry()
            ).catch(() => {}), 24 * 60 * 60 * 1000);
        }, Math.max(next - now, 60_000));
        console.log(`[Ministry:Governance] Next run: ${next.toISOString()}`);
    })();

    // ── Ministry of Infrastructure — platform health (every 2h) ──────────────
    setTimeout(() => {
        require('./cron-logger').wrapCron('ministry_infrastructure', () =>
            require('./ministry').runInfrastructureMinistry()
        ).catch(() => {});
        setInterval(() => require('./cron-logger').wrapCron('ministry_infrastructure', () =>
            require('./ministry').runInfrastructureMinistry()
        ).catch(() => {}), 2 * 60 * 60 * 1000);
    }, 150_000);

    // ── Supreme Council — weekly strategic session (Mondays 09:00 UTC) ───────
    (function _scheduleCouncilSession() {
        const now = new Date();
        const daysToMon = (8 - now.getUTCDay()) % 7 || 7;
        const next = new Date(Date.UTC(
            now.getUTCFullYear(), now.getUTCMonth(),
            now.getUTCDate() + daysToMon, 9, 0, 0
        ));
        setTimeout(() => {
            require('./cron-logger').wrapCron('council_weekly_session', () =>
                require('./council/session').runWeeklySession()
            ).catch(() => {});
            setInterval(() => require('./cron-logger').wrapCron('council_weekly_session', () =>
                require('./council/session').runWeeklySession()
            ).catch(() => {}), 7 * 24 * 60 * 60 * 1000);
        }, Math.max(next - now, 60_000));
        console.log(`[CouncilSession] Weekly session scheduled for ${next.toISOString()}`);
    })();
}

module.exports = { start };
