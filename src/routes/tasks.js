'use strict';
const router = require('express').Router();
const { requireAppAccess } = require('../../lib/middleware');
const { _parseTasks, _startAutoPipeline, _runTask } = require('../../lib/auto-pipeline');
const _agentQueue = require('../../lib/agent-queue');
const sbAdmin = require('../../lib/clients').getSupabaseClient();

router.get('/api/tasks', requireAppAccess, async (req, res) => {
    try { res.json({ ok: true, ...(await _parseTasks()) }); }
    catch (err) { res.status(500).json({ ok: false, error: err.message }); }
});

router.post('/api/tasks/add', requireAppAccess, async (req, res) => {
    try {
        const { title } = req.body || {};
        if (!title || !title.trim()) return res.status(400).json({ ok: false, error: 'title required' });
        const newId = `TASK-${String(Date.now()).slice(-6)}`;
        await sbAdmin.from('apex_tasks').insert({ id: newId, title: title.trim(), status: 'pending' });
        res.json({ ok: true, task: { id: newId, title: title.trim() } });
    } catch (err) { res.status(500).json({ ok: false, error: err.message }); }
});

router.post('/api/tasks/run', requireAppAccess, async (req, res) => {
    const { taskId, force } = req.body || {};
    if (!taskId) return res.status(400).json({ ok: false, error: 'taskId required' });
    const { data: tasks } = await sbAdmin.from('apex_tasks').select('*').eq('id', taskId).single();
    if (!tasks) return res.status(404).json({ ok: false, error: `${taskId} not found` });
    if (tasks.status === 'in_progress') return res.status(409).json({ ok: false, error: `${taskId} is already running` });
    if (tasks.status === 'completed' && !force) return res.status(409).json({ ok: false, error: `${taskId} already completed — pass force:true to re-run` });
    await sbAdmin.from('apex_tasks')
        .update({ status: 'in_progress', updated_at: new Date().toISOString() })
        .eq('id', taskId);
    res.json({ ok: true, status: 'running', taskId });
    _agentQueue.enqueue(taskId, () => _startAutoPipeline(taskId), { label: tasks.title || taskId });
});

router.post('/api/tasks/notify', requireAppAccess, async (req, res) => {
    try {
        const { message, type } = req.body || {};
        if (!message) return res.status(400).json({ ok: false, error: 'message required' });
        await sbAdmin.from('apex_notifications').insert({
            id: `notif-${Date.now()}`,
            message,
            type: type || 'info'
        });
        res.json({ ok: true });
    } catch (err) { res.status(500).json({ ok: false, error: err.message }); }
});

router.post('/api/tasks/approve', requireAppAccess, async (req, res) => {
    const { taskId } = req.body || {};
    if (!taskId) return res.status(400).json({ ok: false, error: 'taskId required' });
    return _runTask(taskId, res);
});

module.exports = router;
