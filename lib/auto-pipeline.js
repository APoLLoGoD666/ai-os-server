'use strict';
// lib/auto-pipeline.js — apex_tasks pipeline: parse, notify, timeline, run

const fs   = require('fs');
const path = require('path');

const sbAdmin              = require('./clients').getSupabaseClient();
const _bus                 = require('./event-bus');
const expandPrompt         = require('../agent-system/prompt-expander');
const runAgentTeam         = require('../agent-system/orchestrator');
const { restoreBackup }    = require('../agent-system/backup-manager');
const { previewCloudAutopilot, applyLatestCloudProposal } = require('../agent-system/cloud_autopilot');

const ROOT = path.join(__dirname, '..');

async function _parseTasks() {
    try {
        const { data } = await sbAdmin.from('apex_tasks').select('*').order('created_at');
        const tasks = data || [];
        return {
            pending:    tasks.filter(t => t.status === 'pending'),
            inProgress: tasks.filter(t => t.status === 'in_progress'),
            completed:  tasks.filter(t => t.status === 'completed'),
            failed:     tasks.filter(t => t.status === 'failed')
        };
    } catch (err) {
        console.error('[Tasks] _parseTasks error:', err.message);
        return { pending: [], inProgress: [], completed: [], failed: [] };
    }
}

async function _appendNotif(message, type = 'info') {
    try {
        const id = `notif-${Date.now()}`;
        await sbAdmin.from('apex_notifications').insert({ id, message, type });
    } catch (err) {
        console.error('[Tasks] _appendNotif error:', err.message);
    }
}

async function _appendTimeline(entry) {
    try {
        const id = `tl-${Date.now()}`;
        await sbAdmin.from('apex_timeline').insert({
            id,
            task_id:       entry.taskId,
            objective:     entry.objective,
            commit_hash:   entry.commitHash,
            files_changed: JSON.stringify(entry.filesChanged || []),
            duration:      entry.duration,
            completed_at:  entry.completedAt,
            agent_logs:    JSON.stringify(entry.agentLogs || []),
            success:       entry.success,
            error:         entry.error || null
        });
    } catch (err) {
        console.error('[Tasks] _appendTimeline error:', err.message);
    }
}

// ── Autonomous pipeline — runs in background after /api/tasks/run responds ────
async function _startAutoPipeline(taskId) {
    const { data: taskRow } = await sbAdmin.from('apex_tasks')
        .select('*').eq('id', taskId).eq('status', 'in_progress').single();
    if (!taskRow) { console.warn(`[AutoPipeline] ${taskId} not found in in_progress`); return; }
    const task = taskRow;

    const _markFailed = async (reason) => {
        try {
            await sbAdmin.from('apex_tasks')
                .update({ status: 'failed', updated_at: new Date().toISOString() })
                .eq('id', taskId);
            await _appendNotif(`❌ ${taskId} failed: ${reason}`, 'error');
        } catch {}
    };

    const _goalTracker = require('../agent-system/goal-tracker');
    let _goalId = null;

    try {
        const t0 = Date.now();
        console.log(`[AutoPipeline] ${taskId} — expanding prompt: "${task.title}"`);
        const spec = await expandPrompt(task.title);
        console.log(`[AutoPipeline] ${taskId} — spec ready, running agent team`);

        // Goal lifecycle — PENDING → RUNNING before pipeline starts
        try {
            const g = _goalTracker.addGoal(spec.objective, { source: 'autopipeline', planId: taskId, priority: 'medium' });
            _goalId = g?.id || null;
            if (_goalId) _goalTracker.startGoal(_goalId);
        } catch {}

        _bus.emit(_bus.E.AGENT_STARTED, { task_id: taskId, label: spec.objective });
        const result = await runAgentTeam(spec, taskId);
        const duration = Date.now() - t0;
        _bus.emit(_bus.E.AGENT_COMPLETED, { task_id: taskId, elapsed_ms: duration, ok: result.success });

        if (result.success) {
            await sbAdmin.from('apex_tasks')
                .update({ status: 'completed', updated_at: new Date().toISOString() })
                .eq('id', taskId);
            await _appendNotif(`✅ ${taskId} completed — ${spec.objective}. Commit: ${result.commitHash}`, 'success');
            await _appendTimeline({
                taskId,
                objective:    spec.objective,
                commitHash:   result.commitHash,
                filesChanged: spec.filesToModify,
                duration,
                completedAt:  new Date().toISOString(),
                agentLogs:    result.agentLogs,
                success:      true
            });
            // Goal lifecycle — RUNNING → COMPLETED
            try { if (_goalId) _goalTracker.completeGoal(_goalId, { commitHash: result.commitHash, cost: result.cost }); } catch {}
            console.log(`[AutoPipeline] ${taskId} done — commit ${result.commitHash}`);
            try {
                const { updateWikiAfterTask } = require('../agent-system/wiki-reader');
                await updateWikiAfterTask(taskId, spec.objective, 'completed — ' + result.commitHash);
            } catch (e) {
                console.warn('[AutoPipeline] wiki update failed:', e.message);
            }
        } else {
            await _markFailed(result.error || 'pipeline failed');
            await _appendTimeline({
                taskId,
                objective:    spec.objective || task.title,
                commitHash:   null,
                filesChanged: [],
                duration,
                completedAt:  new Date().toISOString(),
                agentLogs:    result.agentLogs,
                success:      false,
                error:        result.error
            });
            // Goal lifecycle — RUNNING → BLOCKED
            try { if (_goalId) _goalTracker.blockGoal(_goalId, result.error || 'pipeline failed'); } catch {}
        }
    } catch (err) {
        console.error(`[AutoPipeline] ${taskId} fatal:`, err.message);
        try { restoreBackup(taskId); } catch {}
        await _markFailed(err.message);
        // Goal lifecycle — RUNNING → BLOCKED on fatal exception
        try { if (_goalId) _goalTracker.blockGoal(_goalId, err.message); } catch {}
    }
}

async function _runTask(taskId, res) {
    const { data: taskRow } = await sbAdmin.from('apex_tasks')
        .select('*').eq('id', taskId).eq('status', 'pending').single();
    if (!taskRow) return res.status(404).json({ ok: false, error: `${taskId} not found in pending` });

    const task = taskRow;
    await sbAdmin.from('apex_tasks')
        .update({ status: 'in_progress', updated_at: new Date().toISOString() })
        .eq('id', taskId);

    // Backup before any changes
    const _bkSrv = fs.existsSync(path.join(ROOT, 'server.js'))
        ? fs.readFileSync(path.join(ROOT, 'server.js'), 'utf8') : null;
    const _bkDash = fs.existsSync(path.join(ROOT, 'public', 'dashboard.html'))
        ? fs.readFileSync(path.join(ROOT, 'public', 'dashboard.html'), 'utf8') : null;

    const _restore = () => {
        if (_bkSrv)  fs.writeFileSync(path.join(ROOT, 'server.js'),      _bkSrv,  'utf8');
        if (_bkDash) fs.writeFileSync(path.join(ROOT, 'public', 'dashboard.html'), _bkDash, 'utf8');
    };
    const _markFailed = async (reason) => {
        await sbAdmin.from('apex_tasks')
            .update({ status: 'failed', updated_at: new Date().toISOString() })
            .eq('id', taskId);
        await _appendNotif(`❌ ${taskId} failed: ${reason}`, 'error');
    };

    try {
        await previewCloudAutopilot(task.title);
        await applyLatestCloudProposal();

        // Syntax check
        const { spawnSync: _spSync } = require('child_process');
        const chk = _spSync(process.execPath, ['--check', 'server.js'], { cwd: ROOT, encoding: 'utf8' });
        if (chk.status !== 0) {
            _restore();
            await _markFailed('syntax check failed');
            return res.status(500).json({ ok: false, error: 'syntax check failed — restored backup' });
        }

        // Git commit + push fallback (if GitHub API push didn't happen)
        _spSync('git', ['add', '-A'], { cwd: ROOT });
        _spSync('git', ['commit', '-m', `fix(task): ${task.title} (${taskId})`], { cwd: ROOT, encoding: 'utf8' });
        _spSync('git', ['push', 'origin', 'main'], { cwd: ROOT, encoding: 'utf8', timeout: 30000 });

        await sbAdmin.from('apex_tasks')
            .update({ status: 'completed', updated_at: new Date().toISOString() })
            .eq('id', taskId);
        await _appendNotif(`✅ ${taskId} completed: ${task.title}`, 'success');
        return res.json({ ok: true, taskId, message: `${taskId} completed` });

    } catch (err) {
        _restore();
        await _markFailed(err.message);
        return res.status(500).json({ ok: false, error: err.message });
    }
}

module.exports = { _parseTasks, _startAutoPipeline, _runTask };
