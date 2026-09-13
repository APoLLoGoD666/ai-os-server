'use strict';
const router = require('express').Router();
const { requireAppAccess, requireOwnerScope } = require('../../lib/middleware');
const { _parseTasks, _startAutoPipeline, _runTask } = require('../../lib/auto-pipeline');
const _agentQueue = require('../../lib/agent-queue');
const sbAdmin = require('../../lib/clients').getSupabaseClient();

// V-11-H-B1: resolve caller's owner scope from req.identity. Returns
// { humanId, bypass, role } — bypass=true only for role='master'.
function _ownerScopeFromReq(req) {
    const identity = req.identity || {};
    return {
        humanId: identity.humanId || null,
        role:    identity.role    || 'user',
        bypass:  identity.role === 'master',
    };
}

// V-11-H-B1: scope=all requires role='master'; Users get 403.
function _rejectScopeAllForNonMaster(req, res) {
    if (req.query?.scope === 'all' && req.identity?.role !== 'master') {
        res.status(403).json({ ok: false, error: 'FORBIDDEN', message: 'scope=all requires master role' });
        return true;
    }
    return false;
}

router.get('/api/tasks', requireAppAccess, async (req, res) => {
    try {
        if (_rejectScopeAllForNonMaster(req, res)) return;
        const scope = _ownerScopeFromReq(req);
        // Master default: show all rows unless scope=me is explicitly requested.
        // Non-Master: always filter to caller's own rows.
        let filter = null;
        if (scope.bypass) {
            // Master. scope=all → no filter (full cross-account view).
            // Default: own + system (null) rows — same as any user, prevents leaking other accounts' data.
            if (req.query?.scope !== 'all') filter = { humanId: scope.humanId, bypass: false };
        } else {
            filter = { humanId: scope.humanId, bypass: false };
        }
        res.json({ ok: true, ...(await _parseTasks(filter)) });
    }
    catch (err) { res.status(500).json({ ok: false, error: err.message }); }
});

router.post('/api/tasks/add', requireAppAccess, async (req, res) => {
    try {
        const { title } = req.body || {};
        if (!title || !title.trim()) return res.status(400).json({ ok: false, error: 'title required' });
        const newId = `TASK-${String(Date.now()).slice(-6)}`;
        // V-11-H-B1: stamp new task with caller's humanId for ownership.
        const humanId = req.identity?.humanId || null;
        await sbAdmin.from('apex_tasks').insert({
            id: newId,
            title: title.trim(),
            status: 'pending',
            human_id: humanId,
        });
        res.json({ ok: true, task: { id: newId, title: title.trim() } });
    } catch (err) { res.status(500).json({ ok: false, error: err.message }); }
});

router.post('/api/tasks/run', requireAppAccess, async (req, res) => {
    const { taskId, force } = req.body || {};
    if (!taskId) return res.status(400).json({ ok: false, error: 'taskId required' });
    const { data: tasks } = await sbAdmin.from('apex_tasks').select('*').eq('id', taskId).single();
    if (!tasks) return res.status(404).json({ ok: false, error: `${taskId} not found` });
    // V-11-H-B1: ownership check — Master bypass, else task.human_id must match caller.
    const identity = req.identity || {};
    if (identity.role !== 'master' && tasks.human_id && tasks.human_id !== identity.humanId) {
        return res.status(403).json({ ok: false, error: 'FORBIDDEN', message: 'Not the owner of this task' });
    }
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
        // V-11-H-B1: stamp notification with caller's humanId.
        const humanId = req.identity?.humanId || null;
        await sbAdmin.from('apex_notifications').insert({
            id: `notif-${Date.now()}`,
            message,
            type: type || 'info',
            human_id: humanId,
        });
        res.json({ ok: true });
    } catch (err) { res.status(500).json({ ok: false, error: err.message }); }
});

router.post('/api/tasks/approve', requireAppAccess, async (req, res) => {
    const { taskId } = req.body || {};
    if (!taskId) return res.status(400).json({ ok: false, error: 'taskId required' });
    // V-11-H-B1 CRITICAL: verify ownership BEFORE _runTask is invoked.
    const { data: task, error: taskErr } = await sbAdmin
        .from('apex_tasks').select('id,human_id,metadata,title').eq('id', taskId).single();
    if (taskErr || !task) return res.status(404).json({ ok: false, error: `${taskId} not found` });
    const identity = req.identity || {};
    if (identity.role !== 'master' && task.human_id && task.human_id !== identity.humanId) {
        return res.status(403).json({ ok: false, error: 'FORBIDDEN', message: 'Not the owner of this task' });
    }

    // Council dispatch tasks: route to the domain agent instead of the auto-pipeline
    const meta = task.metadata || {};
    if (meta.type === 'council_dispatch' && meta.dispatch?.slug && meta.dispatch?.action) {
        await sbAdmin.from('apex_tasks')
            .update({ status: 'in_progress', updated_at: new Date().toISOString() })
            .eq('id', taskId);
        res.json({ ok: true, status: 'dispatching', taskId, agent: meta.dispatch.slug });
        setImmediate(async () => {
            try {
                const { invokeDomainAgent } = require('../../agent-system/domain-agents');
                const result = await invokeDomainAgent(meta.dispatch.slug, meta.dispatch.action, { maxTokens: 1500, humanId: task.human_id || null, council: true });
                const delegation = result.delegation || null;
                let officeResult = null;
                if (delegation && delegation.slug && delegation.task) {
                    try {
                        const agentLib = require('../../agent-system/agent-library');
                        officeResult = await agentLib.invokeAgent(delegation.slug, delegation.task);
                    } catch (oe) { officeResult = { reply: '[office agent error: ' + oe.message + ']' }; }
                }
                const updatedMeta = {
                    ...meta,
                    execution: {
                        agent:      meta.dispatch.slug,
                        reply:      result.reply.slice(0, 2000),
                        delegation,
                        office:     officeResult ? { agent: delegation.slug, reply: (officeResult.reply || '').slice(0, 1000) } : null,
                        timestamp:  new Date().toISOString(),
                    },
                };
                await sbAdmin.from('apex_tasks')
                    .update({ status: 'done', metadata: updatedMeta, updated_at: new Date().toISOString() })
                    .eq('id', taskId);
                const notifMsg = officeResult
                    ? `[${meta.dispatch.slug.toUpperCase()}] ${result.reply.slice(0, 150)}\n→ [${delegation.slug.toUpperCase()}] ${(officeResult.reply || '').slice(0, 150)}`
                    : `[${meta.dispatch.slug.toUpperCase()} AGENT] ${result.reply.slice(0, 300)}`;
                await sbAdmin.from('apex_notifications').insert({
                    id:       `notif-${Date.now()}`,
                    message:  notifMsg,
                    type:     'info',
                    human_id: task.human_id || null,
                }).catch(() => {});
                // Close decision outcome tracking loop
                if (meta.deliberationId) {
                    try {
                        const outcomes = require('../../lib/intelligence/decision-outcome-engine');
                        await outcomes.measureByDecisionId(
                            meta.deliberationId,
                            `${meta.dispatch.slug} agent executed: ${result.reply.slice(0, 300)}`,
                            result.escalation ? 'Agent re-escalated to council' : null,
                            `Council → ${meta.dispatch.slug}: ${result.reply.slice(0, 200)}`
                        );
                    } catch {}
                }
            } catch (e) {
                await sbAdmin.from('apex_tasks')
                    .update({ status: 'failed', metadata: { ...meta, execution_error: e.message }, updated_at: new Date().toISOString() })
                    .eq('id', taskId).catch(() => {});
            }
        });
        return;
    }

    return _runTask(taskId, res);
});

router.post('/api/tasks/reject', requireAppAccess, async (req, res) => {
    const { taskId, reason } = req.body || {};
    if (!taskId) return res.status(400).json({ ok: false, error: 'taskId required' });
    const { data: task } = await sbAdmin.from('apex_tasks').select('id,status,human_id,title,metadata').eq('id', taskId).single();
    if (!task) return res.status(404).json({ ok: false, error: `${taskId} not found` });
    // V-11-H-B1: ownership check before any status change.
    const identity = req.identity || {};
    if (identity.role !== 'master' && task.human_id && task.human_id !== identity.humanId) {
        return res.status(403).json({ ok: false, error: 'FORBIDDEN', message: 'Not the owner of this task' });
    }
    const rejectableStatuses = ['pending', 'awaiting_approval', 'approval_required', 'pending_approval'];
    if (!rejectableStatuses.includes(task.status)) {
        return res.status(409).json({ ok: false, error: `${taskId} cannot be rejected from status "${task.status}"` });
    }
    await sbAdmin.from('apex_tasks').update({ status: 'rejected', updated_at: new Date().toISOString() }).eq('id', taskId);
    // V-11-H-B1: propagate task owner onto the rejection notification.
    await sbAdmin.from('apex_notifications').insert({
        id: `notif-${Date.now()}`,
        message: `⛔ ${taskId} rejected${reason ? ': ' + reason.slice(0, 200) : ''}`,
        type: 'info',
        human_id: task.human_id || identity.humanId || null,
    }).catch(() => {});
    // Reject-as-lesson: feed the rejection reason into the lesson pipeline
    setImmediate(async () => {
        try {
            const meta = task.metadata || {};
            const parts = [`Task "${(task.title || taskId).slice(0, 150)}" was rejected`];
            if (reason) parts.push(`Reason: ${reason.slice(0, 300)}`);
            if (meta.recommendation) parts.push(`Council decision was: ${meta.recommendation.slice(0, 300)}`);
            await require('../../agent-system/obsidian-memory').logLesson(parts.join('. '), { taskId });
        } catch {}
    });
    return res.json({ ok: true, taskId, status: 'rejected' });
});

router.get('/api/tasks/standing-approvals', requireAppAccess, async (req, res) => {
    try {
        if (_rejectScopeAllForNonMaster(req, res)) return;
        const scope = _ownerScopeFromReq(req);
        let query = sbAdmin.from('standing_approvals').select('*').order('id', { ascending: false }).limit(50);
        // Master default: return all (historical behaviour). scope=me for Master narrows.
        // Non-Master: always filter to own rules.
        if (!scope.bypass) {
            query = query.eq('human_id', scope.humanId);
        } else if (req.query?.scope === 'me') {
            query = query.eq('human_id', scope.humanId);
        }
        const { data } = await query;
        res.json({ ok: true, approvals: data || [] });
    } catch (err) { res.status(500).json({ ok: false, error: err.message }); }
});

// POST /api/tasks/undo — mark the most recent applied agent_action as undone.
// Body: { actionId? } — if omitted, finds the last undoable (status='applied') action.
// Returns: { ok, actionId, status, message }
// Explicit BLOCKED response if no undoable action exists or action is in a
// non-undoable state. V-11-H-B1: ownership enforced on target action.
router.post('/api/tasks/undo', requireAppAccess, async (req, res) => {
    try {
        const { actionId } = req.body || {};
        const identity = req.identity || {};
        const isMaster = identity.role === 'master';
        let targetId = actionId || null;
        let action = null;
        if (!targetId) {
            // Find last applied (undoable) action — scoped to caller unless Master.
            let q = sbAdmin
                .from('agent_actions')
                .select('id,status,human_id')
                .eq('status', 'applied')
                .order('id', { ascending: false })
                .limit(1);
            if (!isMaster) q = q.eq('human_id', identity.humanId);
            const { data: last } = await q.single();
            if (!last) {
                return res.json({ ok: false, blocked: true, message: 'No undoable agent actions found' });
            }
            targetId = last.id;
            action   = last;
        } else {
            // Verify the provided actionId is undoable AND owned by caller.
            const { data: found } = await sbAdmin
                .from('agent_actions')
                .select('id,status,human_id')
                .eq('id', targetId)
                .single();
            if (!found) return res.status(404).json({ ok: false, error: `Action ${targetId} not found` });
            if (!isMaster && found.human_id && found.human_id !== identity.humanId) {
                return res.status(403).json({ ok: false, error: 'FORBIDDEN', message: 'Not the owner of this action' });
            }
            if (found.status !== 'applied') {
                return res.status(409).json({ ok: false, blocked: true, message: `Action ${targetId} cannot be undone from status "${found.status}"` });
            }
            action = found;
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
