'use strict';

// integrations.js — auto-loaded by _loadAgentRoutes()
// Registers all Notion, Slack, lead pipeline, and system status endpoints

const express = require('express');
const router = express.Router();
const requireAppAccess = require('../lib/app-auth');

// ── Lazy service accessors (won't crash if env vars missing at load time) ──────
function _notion(mod) {
    try { return require(`../services/notion/${mod}`); }
    catch (e) { console.warn(`[integrations] notion/${mod} load failed:`, e.message); return null; }
}
function _slack(mod) {
    try { return require(`../services/slack/${mod}`); }
    catch (e) { console.warn(`[integrations] slack/${mod} load failed:`, e.message); return null; }
}
function _pipeline(mod) {
    try { return require(`../services/pipelines/${mod}`); }
    catch (e) { console.warn(`[integrations] pipelines/${mod} load failed:`, e.message); return null; }
}

// ── POST /api/leads/inbound — process a new lead ────────────────────────────
router.post('/leads/inbound', requireAppAccess, async (req, res) => {
    const { name, email, company, domain, source, budget, notes } = req.body || {};
    if (!name) return res.status(400).json({ ok: false, error: 'name required' });
    const pipeline = _pipeline('lead-pipeline');
    if (!pipeline) return res.status(503).json({ ok: false, error: 'pipeline unavailable' });
    try {
        const result = await pipeline.processInboundLead({ name, email, company, domain, source, budget, notes });
        res.json(result);
    } catch (e) {
        console.error('[/leads/inbound]', e.message);
        res.status(500).json({ ok: false, error: e.message });
    }
});

// ── GET /api/tasks — get today's Notion tasks ───────────────────────────────
router.get('/tasks', requireAppAccess, async (req, res) => {
    const tasks = _notion('notion-tasks');
    if (!tasks) return res.status(503).json({ ok: false, error: 'notion unavailable' });
    try {
        const { domain } = req.query;
        const result = domain
            ? await tasks.getTasksByDomain(domain)
            : await tasks.getTodayTasks();
        res.json({ ok: true, results: result.results.map(tasks.extractTask) });
    } catch (e) {
        console.error('[/tasks]', e.message);
        res.status(500).json({ ok: false, error: e.message });
    }
});

// ── POST /api/tasks — create a Notion task ─────────────────────────────────
router.post('/tasks', requireAppAccess, async (req, res) => {
    const { name, status, priority, domain, dueDate, agent, project, notes } = req.body || {};
    if (!name) return res.status(400).json({ ok: false, error: 'name required' });
    const tasks = _notion('notion-tasks');
    if (!tasks) return res.status(503).json({ ok: false, error: 'notion unavailable' });
    try {
        const page = await tasks.createTask({ name, status, priority, domain, dueDate, agent, project, notes });
        res.json({ ok: true, id: page.id, url: page.url });
    } catch (e) {
        console.error('[POST /tasks]', e.message);
        res.status(500).json({ ok: false, error: e.message });
    }
});

// ── GET /api/projects — get active Notion projects ─────────────────────────
router.get('/projects', requireAppAccess, async (req, res) => {
    const projects = _notion('notion-projects');
    if (!projects) return res.status(503).json({ ok: false, error: 'notion unavailable' });
    try {
        const { domain } = req.query;
        const result = domain
            ? await projects.getProjectsByDomain(domain)
            : await projects.getActiveProjects();
        res.json({ ok: true, results: result.results.map(projects.extractProject) });
    } catch (e) {
        console.error('[/projects]', e.message);
        res.status(500).json({ ok: false, error: e.message });
    }
});

// ── POST /api/projects — create a Notion project ───────────────────────────
router.post('/projects', requireAppAccess, async (req, res) => {
    const { name } = req.body || {};
    if (!name) return res.status(400).json({ ok: false, error: 'name required' });
    const projects = _notion('notion-projects');
    if (!projects) return res.status(503).json({ ok: false, error: 'notion unavailable' });
    try {
        const page = await projects.createProject(req.body);
        res.json({ ok: true, id: page.id, url: page.url });
    } catch (e) {
        console.error('[POST /projects]', e.message);
        res.status(500).json({ ok: false, error: e.message });
    }
});

// ── GET /api/clients — get active Notion clients ────────────────────────────
router.get('/clients', requireAppAccess, async (req, res) => {
    const clients = _notion('notion-clients');
    if (!clients) return res.status(503).json({ ok: false, error: 'notion unavailable' });
    try {
        const { status } = req.query;
        const result = status === 'leads' ? await clients.getLeads() : await clients.getActiveClients();
        res.json({ ok: true, results: result.results.map(clients.extractClient) });
    } catch (e) {
        console.error('[/clients]', e.message);
        res.status(500).json({ ok: false, error: e.message });
    }
});

// ── POST /api/notion/sync — manual sync trigger ─────────────────────────────
router.post('/notion/sync', requireAppAccess, async (req, res) => {
    const { type = 'status' } = req.body || {};
    const syncMod = _notion('notion-sync');
    if (!syncMod) return res.status(503).json({ ok: false, error: 'notion unavailable' });
    if (type === 'agent_runs') {
        try {
            const { createClient } = require('@supabase/supabase-js');
            const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
            const { data } = await sb.from('apex_agent_runs').select('*').order('created_at', { ascending: false }).limit(20);
            const result = await syncMod.syncAgentRunsFromSupabase(data || []);
            return res.json({ ok: true, ...result });
        } catch (e) {
            return res.status(500).json({ ok: false, error: e.message });
        }
    }
    res.json({ ok: true, message: 'sync type not implemented: ' + type });
});

// ── POST /api/notion/log-decision — log a decision to Notion ───────────────
router.post('/notion/log-decision', requireAppAccess, async (req, res) => {
    const { title } = req.body || {};
    if (!title) return res.status(400).json({ ok: false, error: 'title required' });
    const syncMod = _notion('notion-sync');
    if (!syncMod) return res.status(503).json({ ok: false, error: 'notion unavailable' });
    try {
        const page = await syncMod.logDecision(req.body);
        res.json({ ok: true, id: page.id, url: page.url });
    } catch (e) {
        res.status(500).json({ ok: false, error: e.message });
    }
});

// ── POST /api/notion/knowledge-request — log a knowledge request ───────────
router.post('/notion/knowledge-request', requireAppAccess, async (req, res) => {
    const { request } = req.body || {};
    if (!request) return res.status(400).json({ ok: false, error: 'request required' });
    const syncMod = _notion('notion-sync');
    if (!syncMod) return res.status(503).json({ ok: false, error: 'notion unavailable' });
    try {
        const page = await syncMod.logKnowledgeRequest(req.body);
        res.json({ ok: true, id: page.id, url: page.url });
    } catch (e) {
        res.status(500).json({ ok: false, error: e.message });
    }
});

// ── POST /api/slack/alert — post a Slack alert ─────────────────────────────
router.post('/slack/alert', requireAppAccess, async (req, res) => {
    const { severity = 'info', title, details, system } = req.body || {};
    if (!title) return res.status(400).json({ ok: false, error: 'title required' });
    const alerts = _slack('slack-alerts');
    if (!alerts) return res.status(503).json({ ok: false, error: 'slack unavailable' });
    try {
        let result;
        if (severity === 'critical') result = await alerts.alertCritical(title, details, system);
        else if (severity === 'error') result = await alerts.alertError(title, details, system);
        else if (severity === 'warning') result = await alerts.alertWarning(title, details);
        else result = await alerts.alertSuccess(title, details);
        res.json({ ok: true, slack: result });
    } catch (e) {
        console.error('[/slack/alert]', e.message);
        res.status(500).json({ ok: false, error: e.message });
    }
});

// ── POST /api/slack/test — verify Slack connectivity ──────────────────────
router.post('/slack/test', requireAppAccess, async (req, res) => {
    const slackClient = _slack('slack-client');
    if (!slackClient) return res.status(503).json({ ok: false, error: 'slack module unavailable' });
    if (!process.env.SLACK_BOT_TOKEN) return res.status(503).json({ ok: false, error: 'SLACK_BOT_TOKEN not set' });
    try {
        const result = await slackClient.postToChannel('system', '🔌 APEX integration test');
        res.json({ ok: result.ok, slack: result });
    } catch (e) {
        res.status(500).json({ ok: false, error: e.message });
    }
});

// ── POST /api/briefing/daily — trigger daily briefing manually ─────────────
router.post('/briefing/daily', requireAppAccess, async (req, res) => {
    const pipeline = _pipeline('daily-briefing-pipeline');
    if (!pipeline) return res.status(503).json({ ok: false, error: 'pipeline unavailable' });
    try {
        const pgPool = (() => { try { return require('../pg_database'); } catch { return null; } })();
        const result = await pipeline.runDailyBriefing(pgPool);
        res.json(result);
    } catch (e) {
        console.error('[/briefing/daily]', e.message);
        res.status(500).json({ ok: false, error: e.message });
    }
});

// ── POST /api/briefing/weekly — trigger weekly review manually ─────────────
router.post('/briefing/weekly', requireAppAccess, async (req, res) => {
    const pipeline = _pipeline('weekly-review-pipeline');
    if (!pipeline) return res.status(503).json({ ok: false, error: 'pipeline unavailable' });
    try {
        const pgPool = (() => { try { return require('../pg_database'); } catch { return null; } })();
        const anthropic = new (require('@anthropic-ai/sdk'))({ apiKey: process.env.ANTHROPIC_API_KEY });
        const result = await pipeline.runWeeklyReview(pgPool, process.env.OBSIDIAN_URL, anthropic);
        res.json(result);
    } catch (e) {
        console.error('[/briefing/weekly]', e.message);
        res.status(500).json({ ok: false, error: e.message });
    }
});

// ── POST /api/agent/run — log agent run start to Notion ────────────────────
router.post('/agent/run', requireAppAccess, async (req, res) => {
    const syncMod = _notion('notion-sync');
    const agentsMod = _slack('slack-agents');
    const { name, agent, taskDescription, domain, model, supabaseRunId } = req.body || {};
    const results = {};
    if (syncMod) {
        try {
            const page = await syncMod.logAgentRun({ name, agent, taskDescription, domain, modelUsed: model, supabaseRunId, status: 'Running' });
            results.notion = { ok: true, id: page?.id };
        } catch (e) { results.notion = { ok: false, error: e.message }; }
    }
    if (agentsMod) {
        try {
            const r = await agentsMod.notifyRunStart({ runId: supabaseRunId, agent, taskDescription, domain, model });
            results.slack = { ok: r?.ok };
        } catch (e) { results.slack = { ok: false, error: e.message }; }
    }
    res.json({ ok: true, ...results });
});

// ── POST /api/agent/run-complete — log agent run completion to Notion ───────
router.post('/agent/run-complete', requireAppAccess, async (req, res) => {
    const syncMod = _notion('notion-sync');
    const agentsMod = _slack('slack-agents');
    const { notionPageId, supabaseRunId, status, costUsd, durationMs, tokenCount, errorMessage, agent } = req.body || {};
    const results = {};
    if (syncMod && notionPageId) {
        try {
            await syncMod.updateAgentRun(notionPageId, { status: status === 'success' ? 'Completed' : 'Failed', costUsd, durationMs, tokenCount, errorMessage });
            results.notion = { ok: true };
        } catch (e) { results.notion = { ok: false, error: e.message }; }
    }
    if (agentsMod) {
        try {
            const r = status === 'success'
                ? await agentsMod.notifyRunComplete({ runId: supabaseRunId, agent, costUsd, durationMs, tokenCount, status: 'completed' })
                : await agentsMod.notifyRunFailed({ runId: supabaseRunId, agent, error: errorMessage });
            results.slack = { ok: r?.ok };
        } catch (e) { results.slack = { ok: false, error: e.message }; }
    }
    res.json({ ok: true, ...results });
});

// ── GET /api/system/status — integration status (?ping=true for live checks)
router.get('/system/status', requireAppAccess, async (req, res) => {
    const notion = !!process.env.NOTION_API_KEY;
    const slack = !!process.env.SLACK_BOT_TOKEN;
    const anthropic = !!process.env.ANTHROPIC_API_KEY;
    const google = !!process.env.GOOGLE_API_KEY;
    const supabase = !!(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
    const github = !!process.env.GITHUB_TOKEN;
    const sentry = !!process.env.SENTRY_DSN;

    const out = {
        ok: true,
        integrations: { notion, slack, anthropic, google, supabase, github, sentry },
        uptime: process.uptime(),
        memory: (() => { const m = process.memoryUsage(); return { heapMb: Math.round(m.heapUsed/1024/1024), rssMb: Math.round(m.rss/1024/1024) }; })(),
        timestamp: new Date().toISOString(),
    };

    if (req.query.ping === 'true') {
        const ping = {};
        if (notion) {
            try {
                const nc = _notion('notion/notion-client');
                await nc.getClient().databases.retrieve({ database_id: nc.DB.tasks });
                ping.notion = { ok: true };
            } catch (e) { ping.notion = { ok: false, error: e.message }; }
        }
        if (slack) {
            try {
                const sc = _slack('slack/slack-client');
                const r = await sc.postToChannel('executive', '🔍 System status ping', null, null);
                ping.slack = { ok: !!r };
            } catch (e) { ping.slack = { ok: false, error: e.message }; }
        }
        if (supabase) {
            try {
                const pg = require('../pg_database');
                const t = Date.now(); await pg.query('SELECT 1'); ping.supabase = { ok: true, latencyMs: Date.now() - t };
            } catch (e) { ping.supabase = { ok: false, error: e.message }; }
        }
        out.ping = ping;
    }

    res.json(out);
});

module.exports = router;
