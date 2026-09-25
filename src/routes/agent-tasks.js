'use strict';
const router = require('express').Router();
const { requireAppAccess } = require('../../lib/middleware');
const { pgGetRecentAgentTasks, pgGetAgentTask } = require('../../lib/supabase-helpers');
const sbAdmin = require('../../lib/clients').getSupabaseClient();

// V-11-H-B1: agent_tasks already has `created_by UUID` (migration 040 backfilled
// to Master). Filter by created_by for Users; Master sees all rows.
router.get('/agent-tasks', requireAppAccess, async (req, res) => {
    try {
        const identity = req.identity || {};
        const isMaster = identity.role === 'master';
        let tasks;
        if (isMaster) {
            tasks = await pgGetRecentAgentTasks(20);
        } else {
            const { data } = await sbAdmin.from('agent_tasks')
                .select('*')
                .eq('created_by', identity.humanId)
                .order('id', { ascending: false })
                .limit(20);
            tasks = data || [];
        }
        res.status(200).json({
            ok: true,
            count: tasks.length,
            tasks
        });
    } catch (error) {
        console.error("AGENT TASKS ERROR:", error);
        res.status(500).json({
            ok: false,
            error: error.message
        });
    }
});

// V-11-H-B1: per-row ownership check on agent_tasks.created_by.
router.get('/agent-task/:id', requireAppAccess, async (req, res) => {
    try {
        const identity = req.identity || {};
        const isMaster = identity.role === 'master';
        const task = await pgGetAgentTask(Number(req.params.id));
        if (!task) {
            return res.status(404).json({
                ok: false,
                error: "Agent task not found"
            });
        }
        if (!isMaster && task.created_by && task.created_by !== identity.humanId) {
            return res.status(403).json({
                ok: false,
                error: 'FORBIDDEN',
                message: 'Not the owner of this task',
            });
        }
        return res.status(200).json({
            ok: true,
            task
        });
    } catch (error) {
        console.error("AGENT TASK ERROR:", error);
        return res.status(500).json({
            ok: false,
            error: error.message
        });
    }
});

module.exports = router;
