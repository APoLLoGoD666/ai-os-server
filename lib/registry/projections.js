'use strict';
// lib/registry/projections.js — Step 2: Projection Engine
// Every Registry entity exists across multiple projection planes.
// This module determines whether each projection is synchronized.

const fs   = require('fs');
const path = require('path');

const SCRIPTS_ROOT = path.join(__dirname, '../..');

// All projection types. physical and repository are implemented; others are scaffolded.
const PROJECTION_TYPES = ['physical', 'repository', 'runtime', 'documentation', 'knowledge', 'dashboard', 'monitoring', 'memory'];

function _toAbsolute(registeredPath) {
    const p = (registeredPath || '')
        .replace(/^C:[\/\\]Users[\/\\]arwwo[\/\\]Desktop[\/\\]APEX[\/\\]Scripts[\/\\]?/, '')
        .replace(/\//g, path.sep)
        .replace(/\\/g, path.sep);
    return p ? path.join(SCRIPTS_ROOT, p) : null;
}

function _isSkippable(rawPath) {
    if (!rawPath) return true;
    const p = rawPath.trim();
    return !p || p.startsWith('UNKNOWN') || p.startsWith('EXTERNAL') ||
           p.startsWith('Supabase') || p.startsWith('http') || p === 'NONE' || p === 'SELF';
}

// ── Physical projection ──────────────────────────────────────────────────────
// Does the entity's registered path exist on the local filesystem?

function checkPhysical(entity) {
    if (_isSkippable(entity.path)) {
        return { projection: 'physical', status: 'SKIP', reason: 'No local filesystem path' };
    }
    const abs = _toAbsolute(entity.path);
    if (!abs) return { projection: 'physical', status: 'SKIP', reason: 'Path not resolvable' };
    if (fs.existsSync(abs)) {
        return { projection: 'physical', status: 'SYNC', path: abs };
    }
    return { projection: 'physical', status: 'DRIFT', expected: abs, detail: 'Registered path does not exist on disk' };
}

// Scan all file/folder entities and return a drift report
function checkAllPhysical() {
    const engine  = require('./engine');
    const targets = engine.all().filter(e => ['FILE', 'SQL', 'SEED_SCRIPT', 'FOLDER', 'DATABASE_FILE'].includes(e.type));
    const results = { sync: [], drift: [], skip: [] };

    for (const e of targets) {
        const r = checkPhysical(e);
        if      (r.status === 'SYNC')  results.sync.push({ id: e.id, name: e.name, path: r.path });
        else if (r.status === 'DRIFT') results.drift.push({ id: e.id, name: e.name, expected: r.expected, detail: r.detail });
        else                           results.skip.push({ id: e.id, name: e.name, reason: r.reason });
    }

    return results;
}

// ── Repository projection ────────────────────────────────────────────────────
// Is this entity tracked in git? (basic check: is the path under the git repo?)

function checkRepository(entity) {
    if (_isSkippable(entity.path)) return { projection: 'repository', status: 'SKIP', reason: 'No path' };
    const abs = _toAbsolute(entity.path);
    if (!abs) return { projection: 'repository', status: 'SKIP', reason: 'Path not resolvable' };

    try {
        const { execSync } = require('child_process');
        const rel = path.relative(SCRIPTS_ROOT, abs);
        if (rel.startsWith('..')) return { projection: 'repository', status: 'SKIP', reason: 'Outside repo root' };
        const result = execSync(`git -C "${SCRIPTS_ROOT}" ls-files --error-unmatch "${rel}"`, { stdio: 'pipe' }).toString().trim();
        return result
            ? { projection: 'repository', status: 'SYNC', tracked: rel }
            : { projection: 'repository', status: 'DRIFT', detail: 'Path exists but not tracked by git' };
    } catch (_) {
        // git ls-files --error-unmatch exits 1 if not tracked
        return { projection: 'repository', status: 'DRIFT', detail: 'Not tracked in git repository' };
    }
}

// ── Other projection planes ──────────────────────────────────────────────────
// Scaffolded — return NOT_IMPLEMENTED until each plane is wired

function checkRuntime(entity) {
    return { projection: 'runtime', status: 'NOT_IMPLEMENTED', detail: 'Runtime projection requires service health registry — scaffold only' };
}

function checkDocumentation(entity) {
    return { projection: 'documentation', status: 'NOT_IMPLEMENTED', detail: 'Documentation projection requires ARCH-doc cross-reference index — scaffold only' };
}

function checkKnowledge(entity) {
    return { projection: 'knowledge', status: 'NOT_IMPLEMENTED', detail: 'Knowledge projection requires knowledge-graph write path — scaffold only' };
}

function checkDashboard(entity) {
    return { projection: 'dashboard', status: 'NOT_IMPLEMENTED', detail: 'Dashboard projection requires executive dashboard wiring — scaffold only' };
}

function checkMonitoring(entity) {
    return { projection: 'monitoring', status: 'NOT_IMPLEMENTED', detail: 'Monitoring projection requires observability registry — scaffold only' };
}

function checkMemory(entity) {
    return { projection: 'memory', status: 'NOT_IMPLEMENTED', detail: 'Memory projection requires episodic memory write path — scaffold only' };
}

// ── Unified projection check ─────────────────────────────────────────────────

const _handlers = {
    physical:      checkPhysical,
    repository:    checkRepository,
    runtime:       checkRuntime,
    documentation: checkDocumentation,
    knowledge:     checkKnowledge,
    dashboard:     checkDashboard,
    monitoring:    checkMonitoring,
    memory:        checkMemory,
};

function checkProjection(entity, projectionType) {
    const handler = _handlers[projectionType];
    if (!handler) return { projection: projectionType, status: 'UNKNOWN_TYPE' };
    return handler(entity);
}

function checkAllProjections(entity) {
    return PROJECTION_TYPES.map(t => checkProjection(entity, t));
}

module.exports = {
    PROJECTION_TYPES,
    checkPhysical, checkAllPhysical,
    checkRepository,
    checkProjection, checkAllProjections,
};
