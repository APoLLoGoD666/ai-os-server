'use strict';
const router = require('express').Router();
const { requireAppAccess } = require('../../lib/middleware');
const sbAdmin = require('../../lib/clients').getSupabaseClient();
const _mo = require('../../agent-system/master-orchestrator');
const { runMasterOrchestrator, runFeature, parseRoadmap, runFeatureWithPermission, autoApproveStandardPermissions } =
    require('../../agent-system/master-orchestrator');
const { classifyCapture } = require('../../agent-system/capture-classifier');

router.post('/api/master/office-hours', requireAppAccess, async (req, res) => {
    try {
        const { topic } = req.body;
        if (!topic) return res.status(400).json({ ok: false, error: 'topic required' });
        const result = await _mo.officeHours(topic);
        res.json({ ok: true, ...result });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

router.post('/api/master/qa-review', requireAppAccess, async (req, res) => {
    try {
        const { featureId, files } = req.body;
        if (!featureId) return res.status(400).json({ ok: false, error: 'featureId required' });
        const result = await _mo.qaLead(featureId, files || []);
        res.json({ ok: true, ...result });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

router.post('/api/master/release-check', requireAppAccess, async (req, res) => {
    try {
        const { features } = req.body;
        const result = await _mo.releaseCheck(features || []);
        res.json({ ok: true, ...result });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

router.post('/api/master/retro', requireAppAccess, async (req, res) => {
    try {
        const { period } = req.body;
        const result = await _mo.retro(period || 'week');
        res.json({ ok: true, ...result });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

router.post('/api/master/benchmark', requireAppAccess, async (req, res) => {
    try {
        const { urls } = req.body;
        if (!Array.isArray(urls) || !urls.length) return res.status(400).json({ ok: false, error: 'urls array required' });
        const result = await _mo.benchmark(urls);
        res.json({ ok: true, ...result });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

router.post('/api/master/investigate', requireAppAccess, async (req, res) => {
    try {
        const { error: errorDesc, context } = req.body;
        if (!errorDesc) return res.status(400).json({ ok: false, error: 'error description required' });
        const result = await _mo.investigate(errorDesc, context || {});
        res.json({ ok: true, ...result });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

router.post('/api/master/code-review', requireAppAccess, async (req, res) => {
    try {
        const { files, context: ctx } = req.body;
        if (!Array.isArray(files) || !files.length) return res.status(400).json({ ok: false, error: 'files array required' });
        const result = await _mo.codeReview(files, ctx || '');
        res.json({ ok: true, ...result });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

router.post('/api/master/eng-review', requireAppAccess, async (req, res) => {
    try {
        const { featureId, plan } = req.body;
        if (!featureId) return res.status(400).json({ ok: false, error: 'featureId required' });
        const result = await _mo.planEngReview(featureId, plan || {});
        res.json({ ok: true, ...result });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

router.post('/api/master/design-review', requireAppAccess, async (req, res) => {
    try {
        const { featureId, spec } = req.body;
        if (!featureId) return res.status(400).json({ ok: false, error: 'featureId required' });
        const result = await _mo.planDesignReview(featureId, spec || '');
        res.json({ ok: true, ...result });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

router.post('/api/master/design-consult', requireAppAccess, async (req, res) => {
    try {
        const { brief } = req.body;
        if (!brief) return res.status(400).json({ ok: false, error: 'brief required' });
        const result = await _mo.designConsultation(brief);
        res.json({ ok: true, ...result });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

router.post('/api/master/design-shotgun', requireAppAccess, async (req, res) => {
    try {
        const { brief, variants } = req.body;
        if (!brief) return res.status(400).json({ ok: false, error: 'brief required' });
        const result = await _mo.designShotgun(brief, variants || 3);
        res.json({ ok: true, ...result });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

router.post('/api/master/document-release', requireAppAccess, async (req, res) => {
    try {
        const { features, version } = req.body;
        const result = await _mo.documentRelease(features || [], version || '');
        res.json({ ok: true, ...result });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

router.post('/api/master/canary', requireAppAccess, async (req, res) => {
    try {
        const { urls, assertions } = req.body;
        if (!Array.isArray(urls) || !urls.length) return res.status(400).json({ ok: false, error: 'urls array required' });
        const result = await _mo.canary(urls, assertions || []);
        res.json({ ok: true, ...result });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

router.post('/api/master/ship', requireAppAccess, async (req, res) => {
    try {
        const { featureId, tag, force } = req.body;
        if (!featureId) return res.status(400).json({ ok: false, error: 'featureId required' });
        const result = await _mo.ship(featureId, { tag, force });
        res.json({ ok: true, ...result });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

router.post('/api/master/codex', requireAppAccess, async (req, res) => {
    try {
        const { query } = req.body;
        if (!query) return res.status(400).json({ ok: false, error: 'query required' });
        const result = await _mo.codex(query);
        res.json({ ok: true, ...result });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

router.post('/api/master/quality-gate', requireAppAccess, async (req, res) => {
    try {
        const { html, urls, featureId } = req.body;
        const _imp = require('../../agent-system/impeccable-validator');
        const _ba = require('../../agent-system/browser-agent');
        const results = {};

        if (html) {
            const [full, motionR, contrastR, interactionR] = await Promise.all([
                _imp.fullAudit(html),
                _imp.motion(html),
                _imp.contrast(html),
                _imp.interaction(html)
            ]);
            results.impeccable = full;
            results.motion = motionR;
            results.contrast = contrastR;
            results.interaction = interactionR;
        }

        if (Array.isArray(urls) && urls.length) {
            results.vitals = [];
            for (const url of urls.slice(0, 3)) {
                try { results.vitals.push(await _ba.webVitals(url)); }
                catch (e) { results.vitals.push({ url, error: e.message }); }
            }
        }

        const passed = (
            (!results.impeccable || results.impeccable.passed) &&
            (!results.vitals || results.vitals.every(v => v.ratings?.lcp !== 'poor'))
        );

        if (featureId) {
            const _mem = require('../../agent-system/obsidian-memory');
            _mem.write(`11 Agents/Reports/QualityGate-${featureId}.md`,
                `# Quality Gate: ${featureId}\n\n**Passed:** ${passed}\n\n` +
                (results.impeccable ? `## Impeccable\n${JSON.stringify(results.impeccable.summary, null, 2)}\n\n` : '') +
                (results.vitals ? `## Web Vitals\n${results.vitals.map(v => `- ${v.url}: LCP=${v.vitals?.lcp}ms (${v.ratings?.lcp})`).join('\n')}` : '')
            );
        }

        res.json({ ok: true, passed, results, featureId });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

router.post('/api/master/autoplan', requireAppAccess, async (req, res) => {
    try {
        const { description, workstream } = req.body;
        if (!description) return res.status(400).json({ ok: false, error: 'description required' });
        const result = await _mo.autoplan(description, workstream);
        res.json({ ok: true, ...result });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

router.post('/api/master/pair', requireAppAccess, async (req, res) => {
    try {
        const { task, currentCode, lastError } = req.body;
        if (!task) return res.status(400).json({ ok: false, error: 'task required' });
        const result = await _mo.pairAgent(task, currentCode || '', lastError || '');
        res.json({ ok: true, ...result });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

router.post('/api/master/careful', requireAppAccess, async (req, res) => {
    try {
        const { file, change, existing } = req.body;
        if (!file || !change) return res.status(400).json({ ok: false, error: 'file and change required' });
        const result = await _mo.careful(file, change, existing || '');
        res.json({ ok: true, ...result });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

router.post('/api/master/freeze', requireAppAccess, async (req, res) => {
    try {
        const { branch } = req.body;
        const result = await _mo.freeze(branch || 'main');
        res.json({ ok: true, ...result });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

router.post('/api/master/qa-run', requireAppAccess, async (req, res) => {
    try {
        const { featureId, urls, checklist } = req.body;
        if (!featureId) return res.status(400).json({ ok: false, error: 'featureId required' });
        const result = await _mo.qaRun(featureId, urls || [], checklist || []);
        res.json({ ok: true, ...result });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

router.get('/api/master/roadmap', requireAppAccess, async (req, res) => {
    try {
        const roadmap = parseRoadmap();
        const total = Object.values(roadmap)
            .reduce((a, ws) => a + ws.pending.length + ws.completed.length, 0);
        const completed = Object.values(roadmap)
            .reduce((a, ws) => a + ws.completed.length, 0);
        res.json({ ok: true, roadmap, total, completed,
            remaining: total - completed });
    } catch (e) {
        res.status(500).json({ ok: false, error: e.message });
    }
});

router.get('/api/master/metrics', requireAppAccess, async (req, res) => {
    try {
        let roadmap = {};
        try { roadmap = parseRoadmap(); } catch {}
        const total = Object.values(roadmap).reduce((a, ws) => a + (ws.pending || []).length + (ws.completed || []).length, 0);
        const completed = Object.values(roadmap).reduce((a, ws) => a + (ws.completed || []).length, 0);
        const safeCount = r => (r && typeof r.count === 'number') ? r.count : 0;
        const safeQ = async (fn) => { try { return await fn(); } catch (e) { console.warn('[metrics] query fallback:', e.message); return {}; } };
        const [taskRes, timelineRes, runRes] = await Promise.all([
            safeQ(() => sbAdmin.from('apex_tasks').select('id', { count: 'exact', head: true })),
            safeQ(() => sbAdmin.from('apex_timeline').select('id', { count: 'exact', head: true })),
            safeQ(() => sbAdmin.from('apex_agent_runs').select('task_id,success,cost_usd,duration_ms').limit(500))
        ]);
        const runs     = (runRes && Array.isArray(runRes.data)) ? runRes.data : [];
        const runCount = runs.length;
        const succeded = runs.filter(r => r.success).length;
        const spend    = runs.reduce((s, r) => s + (Number(r.cost_usd) || 0), 0);
        const wsPrefix = { C: 'Communications', F: 'Finance', H: 'Health', B: 'Business', D: 'Daily', S: 'Spiritual', U: 'University', J: 'Journaling' };
        const wsCost = {};
        for (const run of runs) {
            const prefix = (run.task_id || '').replace(/^FEAT-/, '')[0];
            const ws = wsPrefix[prefix] || 'Other';
            wsCost[ws] = (wsCost[ws] || 0) + (Number(run.cost_usd) || 0);
        }
        res.json({
            ok: true,
            roadmap:        { total, completed, pending: total - completed, pct: total ? Math.round(completed / total * 100) : 0 },
            tasks:          safeCount(taskRes),
            pipelineRuns:   safeCount(timelineRes) || runCount,
            agentRuns:      runCount,
            successRate:    runCount ? Math.round(succeded / runCount * 100) : null,
            totalCostUsd:   spend.toFixed(4),
            costByWorkstream: Object.fromEntries(Object.entries(wsCost).map(([k, v]) => [k, Number(v).toFixed(4)]))
        });
    } catch (e) {
        console.error('[metrics] 500:', e.message, e.stack);
        res.status(500).json({ ok: false, error: e.message });
    }
});

let _checkPendingLocked = false;
async function checkPendingMasterTasks() {
    if (_checkPendingLocked) return;
    _checkPendingLocked = true;
    try {
        const { data, error } = await sbAdmin
            .from('apex_notifications')
            .select('*')
            .in('type', ['master_task', 'master_run'])
            .eq('read', false)
            .order('created_at', { ascending: true })
            .limit(10);
        if (error) { console.error('[Master] checkPending query error:', error.message); return; }
        if (!data || !data.length) return;
        console.log(`[Master] checkPendingMasterTasks: ${data.length} pending task(s)`);
        for (const row of data) {
            let info = {};
            try { info = JSON.parse(row.message); } catch (_) {}
            if (info.status === 'executing') {
                console.log(`[Master] skipping already-executing task ${row.id}`);
                continue;
            }
            await sbAdmin.from('apex_notifications')
                .update({ message: JSON.stringify({ ...info, status: 'executing' }) })
                .eq('id', row.id);
            if (row.type === 'master_task') {
                const featureId = info.featureId;
                if (!featureId) continue;
                console.log(`[Master] Executing queued feature: ${featureId}`);
                runFeatureWithPermission(featureId)
                    .then(() => {
                        sbAdmin.from('apex_notifications')
                            .update({ read: true })
                            .eq('id', row.id)
                            .then(() => console.log(`[Master] ${featureId} marked complete`));
                    })
                    .catch(e => {
                        console.error(`[Master] queued ${featureId} error:`, e.message);
                        sbAdmin.from('apex_notifications')
                            .update({ read: true, message: JSON.stringify({ ...info, status: 'failed', error: e.message }) })
                            .eq('id', row.id);
                    });
            } else if (row.type === 'master_run') {
                const workstreams = info.workstreams || null;
                console.log('[Master] Executing queued master run');
                runMasterOrchestrator(workstreams)
                    .catch(e => console.error('[Master] queued master run error:', e.message));
            }
        }
    } catch (e) {
        console.error('[Master] checkPendingMasterTasks error:', e.message);
    } finally {
        _checkPendingLocked = false;
    }
}

// Export for server.js to use in startup polling
module.exports.checkPendingMasterTasks = checkPendingMasterTasks;

router.post('/api/master/run', requireAppAccess, async (req, res) => {
    const { workstreams } = req.body || {};
    await sbAdmin.from('apex_notifications').insert({
        id: `master-run-${Date.now()}`,
        message: JSON.stringify({ workstreams: workstreams || null, status: 'queued' }),
        type: 'master_run',
        read: false
    });
    res.json({ ok: true, status: 'queued',
        message: 'Master orchestrator queued' });
    setImmediate(() => checkPendingMasterTasks());
});

router.post('/api/master/feature', requireAppAccess, async (req, res) => {
    const { featureId } = req.body || {};
    if (!featureId) return res.status(400).json({ ok: false,
        error: 'featureId required' });
    const roadmap = parseRoadmap();
    let found = false;
    for (const [, ws] of Object.entries(roadmap)) {
        if (ws.pending.find(f => f.id === featureId)) { found = true; break; }
    }
    if (!found) return res.status(404).json({ ok: false,
        error: `${featureId} not found or already complete` });
    const payload = {
        id: `master-task-${featureId}-${Date.now()}`,
        message: JSON.stringify({ featureId, status: 'queued' }),
        type: 'master_task',
        read: false
    };
    console.log('[Master] queuing task:', JSON.stringify(payload));
    await sbAdmin.from('apex_notifications').insert(payload);
    res.json({ ok: true, status: 'queued', featureId });
    setImmediate(() => checkPendingMasterTasks());
});

router.get('/api/master/permissions', requireAppAccess, async (req, res) => {
    try {
        const { data, error } = await sbAdmin
            .from('apex_notifications')
            .select('*')
            .eq('type', 'permission')
            .eq('read', false)
            .order('created_at', { ascending: false });
        if (error) throw new Error(error.message);
        res.json({ ok: true, permissions: data || [] });
    } catch (e) {
        res.status(500).json({ ok: false, error: e.message });
    }
});

router.post('/api/master/approve', requireAppAccess, async (req, res) => {
    const { featureId, approved } = req.body || {};
    if (!featureId) return res.status(400).json({ ok: false, error: 'featureId required' });

    await sbAdmin.from('apex_notifications')
        .delete()
        .eq('type', 'permission')
        .like('message', `%"featureId":"${featureId}"%`);

    if (approved) {
        res.json({ ok: true, status: 'running', featureId });
        setImmediate(() =>
            runFeatureWithPermission(featureId)
                .catch(e => console.error('[Master] approve error:', e.message))
        );
    } else {
        const _roadmapPath = require('path').join(__dirname, '../../..', 'ROADMAP.md');
        try {
            const _fs = require('fs');
            let _content = _fs.readFileSync(_roadmapPath, 'utf8');
            _content = _content.replace(
                new RegExp(`^- \\[ \\] (${featureId}: .+)$`, 'm'),
                '- [-] $1 *(skipped)*'
            );
            _fs.writeFileSync(_roadmapPath, _content, 'utf8');
        } catch (e) {
            console.warn('[Master] ROADMAP.md skip failed:', e.message);
        }
        await sbAdmin.from('apex_notifications').insert({
            id: `skip-${featureId}-${Date.now()}`,
            message: `${featureId} denied — skipped by user`,
            type: 'info',
            read: false
        });
        res.json({ ok: true, status: 'skipped', featureId });
    }
});

router.post('/api/capture', requireAppAccess, async (req, res) => {
    const { type, content, source } = req.body || {};
    if (!content) return res.status(400).json({ ok: false, error: 'content required' });
    try {
        const result = await classifyCapture({ type: type || 'note', content, source: source || 'manual' });
        await sbAdmin.from('apex_notifications').insert({
            id: `capture-${Date.now()}`,
            message: JSON.stringify({ type, content: content.slice(0, 200), source, classification: result }),
            type: result.confidence > 0.8 ? 'capture_auto' : 'capture_review',
            read: false
        });
        console.log(`[Capture] ${type} → ${result.workstream} (${result.confidence})`);
        res.json({ ok: true, ...result });
    } catch (e) {
        res.status(500).json({ ok: false, error: e.message });
    }
});

router.get('/api/agent/status', requireAppAccess, async (req, res) => {
    try {
        const { data } = await sbAdmin.from('apex_agents').select('slug,name,status');
        res.json({ ok: true, agents: data || [] });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

router.post('/api/admin/sre/run', requireAppAccess, async (req, res) => {
    try {
        const { scenarioIds, label, setAsBaseline = false } = req.body;
        const syntheticHarness = require('../../lib/synthetic');
        const result = await syntheticHarness.run(syntheticHarness.EXECUTION_MODE.SYNTHETIC, {
            scenarioIds: scenarioIds || [],
            label:       label || 'admin_trigger',
            setAsBaseline,
        });
        res.json({ success: true, result });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
