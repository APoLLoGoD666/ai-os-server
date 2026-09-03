'use strict';
const router = require('express').Router();
const { requireAppAccess } = require('../../lib/middleware');

router.post('/api/ruflo/task', requireAppAccess, async (req, res) => {
    try {
        const { agent, task, context } = req.body;
        if (!agent || !task) {
            return res.status(400).json({ ok: false, error: 'agent and task are required' });
        }
        const safeAgent = agent.replace(/[^a-zA-Z0-9_-]/g, '');
        const safeTask  = task.replace(/['"\\`$]/g, ' ').slice(0, 400);
        const safeCtx   = context ? context.replace(/['"\\`$]/g, ' ').slice(0, 200) : '';
        const description = safeCtx ? `${safeTask} | context: ${safeCtx}` : safeTask;

        const { spawnSync } = require('child_process');
        const result = spawnSync(process.execPath, [
            'node_modules/ruflo/bin/ruflo.js',
            'task', 'create',
            '-t', 'custom',
            '-d', description,
            '--tags', safeAgent
        ], { cwd: require('path').join(__dirname, '../../..'), timeout: 30000, encoding: 'utf8' });

        const stdout = (result.stdout || '').trim();
        const stderr = (result.stderr || '').trim();

        if (result.status !== 0) {
            const errMsg = stderr || result.error?.message || 'task create failed';
            console.error('[Ruflo] task create failed:', errMsg);
            return res.status(500).json({ ok: false, error: errMsg });
        }

        const taskIdMatch = stdout.match(/task-[\w-]+/);
        const taskId = taskIdMatch ? taskIdMatch[0] : null;
        console.log(`[Ruflo] task created: ${taskId} for agent: ${safeAgent}`);
        res.json({ ok: true, taskId, output: stdout });
    } catch (err) {
        console.error('[Ruflo] task dispatch error:', err.message);
        res.status(500).json({ ok: false, error: err.message || 'task dispatch failed' });
    }
});

router.get('/api/ruflo/status', requireAppAccess, async (req, res) => {
    try {
        const { spawnSync } = require('child_process');
        const r = spawnSync(process.execPath,
            ['node_modules/ruflo/bin/ruflo.js', 'status'],
            { cwd: require('path').join(__dirname, '../../..'), timeout: 10000, encoding: 'utf8' });
        res.json({ ok: true, output: (r.stdout || r.stderr || '').trim() });
    } catch (err) {
        res.status(500).json({ ok: false, error: err.message });
    }
});

router.get('/api/ruflo/tasks', requireAppAccess, async (req, res) => {
    try {
        const { spawnSync } = require('child_process');
        const r = spawnSync(process.execPath,
            ['node_modules/ruflo/bin/ruflo.js', 'task', 'list', '--all'],
            { cwd: require('path').join(__dirname, '../../..'), timeout: 10000, encoding: 'utf8' });
        res.json({ ok: true, output: (r.stdout || r.stderr || '').trim() });
    } catch (err) {
        res.status(500).json({ ok: false, error: err.message });
    }
});

router.get('/api/ruflo/memory/search', requireAppAccess, async (req, res) => {
    try {
        const query = (req.query.q || '').slice(0, 200).replace(/['"\\]/g, ' ');
        if (!query) return res.status(400).json({ ok: false, error: 'q is required' });
        const { spawnSync } = require('child_process');
        const r = spawnSync(process.execPath,
            ['node_modules/ruflo/bin/ruflo.js', 'memory', 'search', '-q', query],
            { cwd: require('path').join(__dirname, '../../..'), timeout: 15000, encoding: 'utf8' });
        res.json({ ok: true, output: (r.stdout || r.stderr || '').trim() });
    } catch (err) {
        res.status(500).json({ ok: false, error: err.message });
    }
});

module.exports = router;
