'use strict';
// goal-tracker.js — Persistent state machine for pending, running, completed, and blocked objectives.
// Stores goals as JSON files in the Obsidian vault under System/Goals/.
// No DB schema changes. No external deps beyond Node built-ins.

const fs   = require('fs');
const path = require('path');

const VAULT     = process.env.OBSIDIAN_VAULT_PATH || 'C:\\Users\\arwwo\\Desktop\\AI Scripts\\APEX AI OS';
const GOALS_DIR = path.join(VAULT, 'System', 'Goals');

const STATUS = Object.freeze({
    PENDING:   'pending',
    RUNNING:   'running',
    COMPLETED: 'completed',
    BLOCKED:   'blocked',
    CANCELLED: 'cancelled',
});

// ── Disk helpers ───────────────────────────────────────────────────────────────

function _ensureDir() {
    try { fs.mkdirSync(GOALS_DIR, { recursive: true }); } catch {}
}

function _goalPath(id) {
    return path.join(GOALS_DIR, `goal-${id}.json`);
}

function _load(id) {
    try { return JSON.parse(fs.readFileSync(_goalPath(id), 'utf8')); }
    catch { return null; }
}

function _save(goal) {
    _ensureDir();
    goal.updatedAt = new Date().toISOString();
    fs.writeFileSync(_goalPath(goal.id), JSON.stringify(goal, null, 2), 'utf8');
    return goal;
}

function _loadAll() {
    try {
        _ensureDir();
        return fs.readdirSync(GOALS_DIR)
            .filter(f => f.startsWith('goal-') && f.endsWith('.json'))
            .map(f => { try { return JSON.parse(fs.readFileSync(path.join(GOALS_DIR, f), 'utf8')); } catch { return null; } })
            .filter(Boolean)
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    } catch { return []; }
}

// ── Public API ─────────────────────────────────────────────────────────────────

// Create a new tracked objective
function addGoal(objective, options = {}) {
    _ensureDir();
    const { priority = 'medium', source = 'manual', parentId = null, planId = null } = options;
    const id   = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
    return _save({
        id, objective, priority, source, parentId, planId,
        status:        STATUS.PENDING,
        createdAt:     new Date().toISOString(),
        updatedAt:     new Date().toISOString(),
        startedAt:     null,
        completedAt:   null,
        blockedAt:     null,
        blockedReason: null,
        result:        null,
        subtaskIds:    [],
        retryCount:    0,
    });
}

function startGoal(id) {
    const g = _load(id);
    if (!g) return null;
    g.status    = STATUS.RUNNING;
    g.startedAt = new Date().toISOString();
    return _save(g);
}

function completeGoal(id, result = null) {
    const g = _load(id);
    if (!g) return null;
    g.status      = STATUS.COMPLETED;
    g.completedAt = new Date().toISOString();
    g.result      = result;
    return _save(g);
}

function blockGoal(id, reason = '') {
    const g = _load(id);
    if (!g) return null;
    g.status        = STATUS.BLOCKED;
    g.blockedAt     = new Date().toISOString();
    g.blockedReason = String(reason).slice(0, 300);
    return _save(g);
}

function cancelGoal(id, reason = '') {
    const g = _load(id);
    if (!g) return null;
    g.status        = STATUS.CANCELLED;
    g.blockedReason = String(reason).slice(0, 300);
    return _save(g);
}

// Reset a goal to PENDING for retry, incrementing retryCount
function retryGoal(id) {
    const g = _load(id);
    if (!g) return null;
    g.retryCount++;
    g.status = STATUS.PENDING;
    return _save(g);
}

// Get all goals, optionally filtered by status
function getGoals(status = null) {
    const all = _loadAll();
    return status ? all.filter(g => g.status === status) : all;
}

function getGoal(id) {
    return _load(id);
}

// Aggregate counts + completion rate
function getStats() {
    const all    = _loadAll();
    const counts = Object.fromEntries(Object.values(STATUS).map(s => [s, 0]));
    for (const g of all) {
        if (counts[g.status] !== undefined) counts[g.status]++;
    }
    const total     = all.length;
    const completed = counts[STATUS.COMPLETED];
    return {
        total,
        ...counts,
        completionRate:  total ? +(completed / total).toFixed(3) : 0,
        oldestPending:   all.find(g => g.status === STATUS.PENDING)?.createdAt || null,
    };
}

// Link a subtask ID to a parent goal
function linkSubtask(parentId, subtaskId) {
    const parent = _load(parentId);
    if (!parent) return null;
    if (!parent.subtaskIds.includes(subtaskId)) parent.subtaskIds.push(subtaskId);
    return _save(parent);
}

module.exports = {
    addGoal,
    startGoal,
    completeGoal,
    blockGoal,
    cancelGoal,
    retryGoal,
    getGoals,
    getGoal,
    getStats,
    linkSubtask,
    STATUS,
    GOALS_DIR,
};
