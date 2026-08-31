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

router.post('/api/tasks/reject', requireAppAccess, async (req, res) => {
    const { taskId, reason } = req.body || {};
    if (!taskId) return res.status(400).json({ ok: false, error: 'taskId required' });
    const { data: task } = await sbAdmin.from('apex_tasks').select('id,status').eq('id', taskId).single();
    if (!task) return res.status(404).json({ ok: false, error: `${taskId} not found` });
    const rejectableStatuses = ['pending', 'awaiting_approval', 'approval_required', 'pending_approval'];
    if (!rejectableStatuses.includes(task.status)) {
        return res.status(409).json({ ok: false, error: `${taskId} cannot be rejected from status "${task.status}"` });
    }
    await sbAdmin.from('apex_tasks').update({ status: 'rejected', updated_at: new Date().toISOString() }).eq('id', taskId);
    await sbAdmin.from('apex_notifications').insert({
        id: `notif-${Date.now()}`,
        message: `⛔ ${taskId} rejected${reason ? ': ' + reason.slice(0, 200) : ''}`,
        type: 'info'
    }).catch(() => {});
    return res.json({ ok: true, taskId, status: 'rejected' });
});

router.get('/api/tasks/standing-approvals', requireAppAccess, async (req, res) => {
    try {
        const { data } = await sbAdmin.from('standing_approvals').select('*').order('id', { ascending: false }).limit(50);
        res.json({ ok: true, approvals: data || [] });
    } catch (err) { res.status(500).json({ ok: false, error: err.message }); }
});

// POST /api/tasks/undo — mark the most recent applied agent_action as undone.
// Body: { actionId? } — if omitted, finds the last undoable (status='applied') action.
// Returns: { ok, actionId, status, message }
// Explicit BLOCKED response if no undoable action exists or action is in a
// non-undoable state. Does not imply constitutional authority beyond DB status update.
router.post('/api/tasks/undo', requireAppAccess, async (req, res) => {
    try {
        const { actionId } = req.body || {};
        let targetId = actionId || null;
        if (!targetId) {
            // Find last applied (undoable) action
            const { data: last } = await sbAdmin
                .from('agent_actions')
                .select('id,status')
                .eq('status', 'applied')
                .order('id', { ascending: false })
                .limit(1)
                .single();
            if (!last) {
                return res.json({ ok: false, blocked: true, message: 'No undoable agent actions found' });
            }
            targetId = last.id;
        } else {
            // Verify the provided actionId is undoable
            const { data: action } = await sbAdmin
                .from('agent_actions')
                .select('id,status')
                .eq('id', targetId)
                .single();
            if (!action) return res.status(404).json({ ok: false, error: `Action ${targetId} not found` });
            if (action.status !== 'applied') {
                return res.status(409).json({ ok: false, blocked: true, message: `Action ${targetId} cannot be undone from status "${action.status}"` });
            }
        }
        const { error } = await sbAdmin
            .from('agent_actions')
            .update({ status: 'undone' })
            .eq('id', targetId);
        if (error) return res.status(500).json({ ok: false, error: error.message });
        return res.json({ ok: true, actionId: targetId, status: 'undone', message: `Action ${targetId} marked undone` });
    } catch (err) {
        res.status(500).json({ ok: false, error: err.message });
    }
});

module.exports = router;
