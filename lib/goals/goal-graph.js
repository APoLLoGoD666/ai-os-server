'use strict';
// lib/goals/goal-graph.js — Goal hierarchy for APEX runtime
// Levels: VISION → OBJECTIVE → GOAL → PROJECT → TASK → ACTION
// Persistence: JSON file at data/goals.json — survives process restarts

const fs   = require('fs');
const path = require('path');

const LEVELS     = ['VISION', 'OBJECTIVE', 'GOAL', 'PROJECT', 'TASK', 'ACTION'];
const STORE_FILE = path.join(__dirname, '../../data/goals.json');

const _nodes = new Map();
const _edges = new Map();

let _nodeSeq = 0;
function _nodeId() { return 'G-' + String(++_nodeSeq).padStart(6, '0'); }
function _now()    { return new Date().toISOString(); }

// ── Persistence ───────────────────────────────────────────────────────────────

function _persist() {
    try {
        const data = {
            seq:   _nodeSeq,
            nodes: [..._nodes.entries()].map(([k, v]) => [k, { ...v }]),
            edges: [..._edges.entries()].map(([k, v]) => [k, [...v]]),
        };
        fs.writeFileSync(STORE_FILE, JSON.stringify(data), 'utf8');
    } catch (_) { /* non-fatal — in-memory state still valid */ }
}

function _load() {
    try {
        if (!fs.existsSync(STORE_FILE)) return;
        const data = JSON.parse(fs.readFileSync(STORE_FILE, 'utf8'));
        _nodeSeq = data.seq || 0;
        for (const [k, v] of (data.nodes || [])) _nodes.set(k, v);
        for (const [k, v] of (data.edges || [])) _edges.set(k, new Set(v));
    } catch (_) { /* corruption — start fresh; file will be overwritten on next write */ }
}

_load(); // runs synchronously at module init

// ── Graph operations ──────────────────────────────────────────────────────────

function createGoal(level, label, params = {}) {
    if (!LEVELS.includes(level)) return { ok: false, error: 'INVALID_LEVEL', valid: LEVELS };

    const id   = _nodeId();
    const node = {
        id,
        level,
        label:          label || 'Unnamed',
        priority:       typeof params.priority   === 'number' ? params.priority   : 50,
        impact:         typeof params.impact     === 'number' ? params.impact     : 50,
        costCents:      typeof params.costCents  === 'number' ? params.costCents  : 0,
        confidence:     typeof params.confidence === 'number' ? params.confidence : 80,
        attentionScore: null,
        score:          null,
        status:         'ACTIVE',
        tags:           Array.isArray(params.tags) ? params.tags : [],
        metadata:       params.metadata || {},
        createdAt:      _now(),
        updatedAt:      _now(),
        archivedAt:     null,
    };

    _nodes.set(id, node);
    _edges.set(id, new Set());
    _persist();
    return { ok: true, id, node };
}

function resolveGoal(query = {}) {
    const results = [];
    for (const [, node] of _nodes) {
        if (node.status === 'ARCHIVED')                       continue;
        if (query.level  && node.level  !== query.level)     continue;
        if (query.status && node.status !== query.status)    continue;
        if (query.tag    && !node.tags.includes(query.tag))  continue;
        if (query.id     && node.id     !== query.id)        continue;
        results.push(node);
    }
    return results;
}

function scoreGoal(id, weights = {}) {
    const node = _nodes.get(id);
    if (!node) return { ok: false, error: 'NOT_FOUND' };

    const wP = typeof weights.priority   === 'number' ? weights.priority   : 0.40;
    const wI = typeof weights.impact     === 'number' ? weights.impact     : 0.30;
    const wC = typeof weights.confidence === 'number' ? weights.confidence : 0.20;
    const wA = typeof weights.attention  === 'number' ? weights.attention  : 0.10;

    const attn  = node.attentionScore !== null ? node.attentionScore : node.priority;
    const score = Math.round(node.priority * wP + node.impact * wI + node.confidence * wC + attn * wA);

    node.score     = score;
    node.updatedAt = _now();
    return { ok: true, id, score, node };
}

function createDependency(fromId, toId) {
    if (!_nodes.has(fromId)) return { ok: false, error: 'FROM_NOT_FOUND' };
    if (!_nodes.has(toId))   return { ok: false, error: 'TO_NOT_FOUND'   };
    if (fromId === toId)     return { ok: false, error: 'SELF_DEPENDENCY' };
    _edges.get(fromId).add(toId);
    _persist();
    return { ok: true, fromId, toId };
}

function updateGoal(id, updates = {}) {
    const node = _nodes.get(id);
    if (!node) return { ok: false, error: 'NOT_FOUND' };

    const ALLOWED = ['label','priority','impact','costCents','confidence','status','tags','metadata','attentionScore'];
    for (const key of ALLOWED) {
        if (updates[key] !== undefined) node[key] = updates[key];
    }
    node.updatedAt = _now();
    _persist();
    return { ok: true, id, node };
}

function archiveGoal(id, reason = '') {
    const node = _nodes.get(id);
    if (!node) return { ok: false, error: 'NOT_FOUND' };
    node.status                 = 'ARCHIVED';
    node.archivedAt             = _now();
    node.metadata.archiveReason = reason;
    node.updatedAt              = _now();
    _persist();
    return { ok: true, id };
}

function recalculate(weights = {}) {
    const scored = [];
    for (const [id, node] of _nodes) {
        if (node.status === 'ARCHIVED') continue;
        const result = scoreGoal(id, weights);
        if (result.ok) scored.push({ id, score: result.score, level: node.level, label: node.label });
    }
    scored.sort((a, b) => b.score - a.score);
    return { ok: true, scored, totalActive: scored.length };
}

function getDependencies(id) {
    const deps = _edges.get(id);
    if (!deps) return { ok: false, error: 'NOT_FOUND' };
    return { ok: true, id, dependencies: [...deps] };
}

function getTopGoal(weights = {}) {
    const result = recalculate(weights);
    if (!result.ok || result.scored.length === 0) return null;
    return _nodes.get(result.scored[0].id) || null;
}

module.exports = {
    LEVELS,
    createGoal,
    resolveGoal,
    scoreGoal,
    createDependency,
    updateGoal,
    archiveGoal,
    recalculate,
    getDependencies,
    getTopGoal,
    _persist,  // exported for tests
    _load,     // exported for tests
};
