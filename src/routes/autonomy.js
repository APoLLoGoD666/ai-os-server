'use strict';
const router = require('express').Router();
const { requireAppAccess } = require('../../lib/middleware');

// Autonomy layer — full metrics report
router.get('/api/autonomy/metrics', requireAppAccess, async (req, res) => {
    try {
        const _autonomy = require('../../agent-system/autonomy-metrics');
        const metrics = await _autonomy.getFullMetrics();
        res.json({ ok: true, ...metrics });
    } catch (e) {
        res.status(500).json({ ok: false, error: e.message });
    }
});

// Autonomy layer — composite autonomy score only (fast path)
router.get('/api/autonomy/score', requireAppAccess, async (req, res) => {
    try {
        const _autonomy = require('../../agent-system/autonomy-metrics');
        const result = await _autonomy.computeAutonomyScore();
        res.json({ ok: true, ...result });
    } catch (e) {
        res.status(500).json({ ok: false, error: e.message });
    }
});

// Autonomy layer — decompose a goal into a plan
router.post('/api/autonomy/plan', requireAppAccess, async (req, res) => {
    try {
        const { goal, simulate = true, maxSubtasks = 5 } = req.body || {};
        if (!goal || typeof goal !== 'string') {
            return res.status(400).json({ ok: false, error: 'goal (string) is required' });
        }
        const _planner = require('../../agent-system/task-planner');
        const plan = await _planner.decomposeGoal(goal, { simulate, maxSubtasks: Math.min(maxSubtasks, 10) });
        const specs = _planner.planToSpecs(plan);
        res.json({ ok: true, plan, specs, simulated: simulate });
    } catch (e) {
        res.status(500).json({ ok: false, error: e.message });
    }
});

// Autonomy layer — assign work
router.post('/api/autonomy/assign', requireAppAccess, async (req, res) => {
    try {
        const { goal, simulate = true, concurrency = 2, maxSubtasks = 5 } = req.body || {};
        if (!goal || typeof goal !== 'string') {
            return res.status(400).json({ ok: false, error: 'goal (string) is required' });
        }
        const _coord = require('../../agent-system/multi-agent-coordinator');
        const result = await _coord.assignWork(goal, {
            simulate,
            concurrency: Math.min(concurrency, 4),
            maxSubtasks: Math.min(maxSubtasks, 10),
        });
        res.json({ ok: true, ...result });
    } catch (e) {
        res.status(500).json({ ok: false, error: e.message });
    }
});

// Autonomy layer — list goals
router.get('/api/autonomy/goals', requireAppAccess, (req, res) => {
    try {
        const _gt = require('../../agent-system/goal-tracker');
        const { status, limit = 50 } = req.query;
        const goals = status ? _gt.getGoals(status) : _gt.getGoals();
        res.json({ ok: true, goals: goals.slice(0, Math.min(parseInt(limit) || 50, 200)), total: goals.length });
    } catch (e) {
        res.status(500).json({ ok: false, error: e.message });
    }
});

// Autonomy layer — transition a goal's status
router.patch('/api/autonomy/goals/:id/status', requireAppAccess, (req, res) => {
    try {
        const _gt = require('../../agent-system/goal-tracker');
        const { id } = req.params;
        const { action, reason, outcome } = req.body || {};
        const ACTIONS = { start: 'startGoal', complete: 'completeGoal', block: 'blockGoal', cancel: 'cancelGoal' };
        const method = ACTIONS[action];
        if (!method) {
            return res.status(400).json({ ok: false, error: `action must be one of: ${Object.keys(ACTIONS).join(', ')}` });
        }
        let goal;
        if (action === 'complete') goal = _gt.completeGoal(id, outcome || {});
        else if (action === 'block')   goal = _gt.blockGoal(id, reason || 'blocked via API');
        else if (action === 'cancel')  goal = _gt.cancelGoal(id, reason || 'cancelled via API');
        else                           goal = _gt.startGoal(id);
        if (!goal) return res.status(404).json({ ok: false, error: `goal ${id} not found` });
        res.json({ ok: true, goal });
    } catch (e) {
        res.status(500).json({ ok: false, error: e.message });
    }
});

// Autonomy layer — generate a full system self-evaluation
router.get('/api/autonomy/evaluation', requireAppAccess, async (req, res) => {
    try {
        const _se = require('../../agent-system/self-evaluator');
        const ev  = await _se.generateSystemEvaluation();
        res.json({ ok: true, ...ev });
    } catch (e) {
        res.status(500).json({ ok: false, error: e.message });
    }
});

// Autonomy layer — return the most recently saved evaluation
router.get('/api/autonomy/evaluation/latest', requireAppAccess, (req, res) => {
    try {
        const _se = require('../../agent-system/self-evaluator');
        const ev  = _se.getLatestEvaluation();
        if (!ev) return res.status(404).json({ ok: false, error: 'no evaluation stored yet' });
        res.json({ ok: true, ...ev });
    } catch (e) {
        res.status(500).json({ ok: false, error: e.message });
    }
});

// Autonomy layer — evaluate a specific pipeline run
router.get('/api/autonomy/evaluation/run/:id', requireAppAccess, async (req, res) => {
    try {
        const _se = require('../../agent-system/self-evaluator');
        const ev  = await _se.generateRunEvaluation(req.params.id);
        res.json({ ok: true, ...ev });
    } catch (e) {
        res.status(500).json({ ok: false, error: e.message });
    }
});

// Autonomy layer — list all improvement proposals
router.get('/api/autonomy/improvements', requireAppAccess, (req, res) => {
    try {
        const _imp   = require('../../agent-system/improvement-executor');
        const { status, limit = 50 } = req.query;
        const all    = _imp.getTopImprovements(Math.min(parseInt(limit) || 50, 200));
        const result = status ? all.filter(p => p.status === status) : all;
        res.json({ ok: true, proposals: result, total: result.length });
    } catch (e) {
        res.status(500).json({ ok: false, error: e.message });
    }
});

// Autonomy layer — top-ranked improvement proposals
router.get('/api/autonomy/improvements/top', requireAppAccess, (req, res) => {
    try {
        const _imp = require('../../agent-system/improvement-executor');
        const limit = Math.min(parseInt(req.query.limit) || 10, 50);
        res.json({ ok: true, proposals: _imp.getTopImprovements(limit) });
    } catch (e) {
        res.status(500).json({ ok: false, error: e.message });
    }
});

// Autonomy layer — improvement executor stats
router.get('/api/autonomy/improvements/stats', requireAppAccess, (req, res) => {
    try {
        const _imp = require('../../agent-system/improvement-executor');
        res.json({ ok: true, ..._imp.getStats() });
    } catch (e) {
        res.status(500).json({ ok: false, error: e.message });
    }
});

module.exports = router;
