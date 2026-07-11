'use strict';
const router = require('express').Router();
const { requireAppAccess } = require('../../lib/middleware');
const { pgGetRecentAgentTasks, pgGetAgentTask } = require('../../lib/pg_helpers');

router.get('/agent-tasks', requireAppAccess, async (req, res) => {
    try {
        const tasks = await pgGetRecentAgentTasks(20);
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

router.get('/agent-task/:id', requireAppAccess, async (req, res) => {
    try {
        const task = await pgGetAgentTask(Number(req.params.id));
        if (!task) {
            return res.status(404).json({
                ok: false,
                error: "Agent task not found"
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
