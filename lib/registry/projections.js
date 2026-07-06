'use strict';
// lib/registry/projections.js — Step 2: Projection Engine
// Every Registry entity exists across multiple projection planes.
// This module determines whether each projection is synchronized.

const fs   = require('fs');
const path = require('path');

const SCRIPTS_ROOT = path.join(__dirname, '../..');

const PROJECTION_TYPES = ['physical', 'repository', 'runtime', 'documentation', 'knowledge', 'dashboard', 'monitoring', 'memory'];

// Runtime families/types that are loaded into the Express process
const RUNTIME_FAMILIES = new Set(['RNT', 'RTE', 'AUT', 'GOV']);
const RUNTIME_TYPES    = new Set(['FILE', 'SERVICE', 'ROUTE', 'API', 'MIDDLEWARE', 'CONFIG']);

// Families that must appear in architecture docs to be considered documented
const DOC_REQUIRED_FAMILIES = new Set(['GOV', 'CIV', 'CORE', 'RNT', 'RTE', 'AUT']);

// ── Module-level caches (built lazily, one scan per process lifetime) ────────

let _serverContent   = null;
let _docIndex        = null;   // Map<ENT-ID, string[]> files that mention it
let _graphifyNodes   = null;   // Set<string> of source_file paths in graphify graph
let _dashboardContent = null;
let _telemetryContent = null;
let _vaultContent    = null;   // concatenated Claude-Memory vault text

function _loadServerContent() {
    if (_serverContent !== null) return _serverContent;
    try { _serverContent = fs.readFileSync(path.join(SCRIPTS_ROOT, 'server.js'), 'utf8'); }
    catch (_) { _serverContent = ''; }
    return _serverContent;
}

function _loadDocIndex() {
    if (_docIndex) return _docIndex;
    _docIndex = new Map();
    const docsDir = path.join(SCRIPTS_ROOT, 'docs');

    function scan(dir) {
        let entries;
        try { entries = fs.readdirSync(dir); } catch (_) { return; }
        for (const f of entries) {
            const full = path.join(dir, f);
            let stat;
            try { stat = fs.statSync(full); } catch (_) { continue; }
            if (stat.isDirectory()) { scan(full); continue; }
            if (!f.endsWith('.md')) continue;
            let content;
            try { content = fs.readFileSync(full, 'utf8'); } catch (_) { continue; }
            const ids = content.match(/ENT-\d{6}/g) || [];
            for (const id of ids) {
                if (!_docIndex.has(id)) _docIndex.set(id, []);
                const arr = _docIndex.get(id);
                const rel = path.relative(SCRIPTS_ROOT, full).replace(/\\/g, '/');
                if (!arr.includes(rel)) arr.push(rel);
            }
        }
    }

    scan(docsDir);
    return _docIndex;
}

function _loadGraphifyNodes() {
    if (_graphifyNodes) return _graphifyNodes;
    _graphifyNodes = new Set();
    const graphPath = path.join(SCRIPTS_ROOT, 'graphify-out', 'graph.json');
    try {
        const g = JSON.parse(fs.readFileSync(graphPath, 'utf8'));
        for (const n of (g.nodes || [])) {
            if (n.source_file) _graphifyNodes.add(n.source_file.replace(/\\/g, '/').toLowerCase());
        }
    } catch (_) {}
    return _graphifyNodes;
}

function _loadDashboardContent() {
    if (_dashboardContent !== null) return _dashboardContent;
    try { _dashboardContent = fs.readFileSync(path.join(SCRIPTS_ROOT, 'dashboard.html'), 'utf8'); }
    catch (_) { _dashboardContent = ''; }
    return _dashboardContent;
}

function _loadTelemetryContent() {
    if (_telemetryContent !== null) return _telemetryContent;
    try { _telemetryContent = fs.readFileSync(path.join(SCRIPTS_ROOT, 'src', 'routes', 'telemetry', 'index.js'), 'utf8'); }
    catch (_) { _telemetryContent = ''; }
    return _telemetryContent;
}

function _loadVaultContent() {
    if (_vaultContent !== null) return _vaultContent;
    const vaultDir = path.join('C:', 'Users', 'arwwo', 'Desktop', 'APEX', 'APEX AI OS', 'System', 'Claude-Memory');
    const parts = [];
    try {
        const files = fs.readdirSync(vaultDir).filter(f => f.endsWith('.md'));
        for (const f of files) {
            try { parts.push(fs.readFileSync(path.join(vaultDir, f), 'utf8')); } catch (_) {}
        }
    } catch (_) {}
    _vaultContent = parts.join('\n');
    return _vaultContent;
}

// ── Shared helpers ───────────────────────────────────────────────────────────

function _toAbsolute(registeredPath) {
    const p = (registeredPath || '')
        .replace(/^C:[\/\\]Users[\/\\]arwwo[\/\\]Desktop[\/\\]APEX[\/\\]Scripts[\/\\]?/, '')
        .replace(/\//g, path.sep)
        .replace(/\\/g, path.sep);
    return p ? path.join(SCRIPTS_ROOT, p) : null;
}

function _toRelative(registeredPath) {
    const abs = _toAbsolute(registeredPath);
    if (!abs) return null;
    return path.relative(SCRIPTS_ROOT, abs).replace(/\\/g, '/');
}

function _isSkippable(rawPath) {
    if (!rawPath) return true;
    const p = rawPath.trim();
    return !p || p.startsWith('UNKNOWN') || p.startsWith('EXTERNAL') ||
           p.startsWith('Supabase') || p.startsWith('http') || p === 'NONE' || p === 'SELF';
}

// ── Physical projection ──────────────────────────────────────────────────────

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
        return { projection: 'repository', status: 'DRIFT', detail: 'Not tracked in git repository' };
    }
}

// ── Runtime projection ───────────────────────────────────────────────────────
// Is this entity loaded into the running Express process?
// Check: entity's relative path appears in server.js (require/use), or is in a route file.

function checkRuntime(entity) {
    const isRuntimeEntity = RUNTIME_FAMILIES.has(entity.family) || RUNTIME_TYPES.has(entity.type);
    if (!isRuntimeEntity) return { projection: 'runtime', status: 'SKIP', reason: 'Not a runtime component' };
    if (_isSkippable(entity.path)) return { projection: 'runtime', status: 'SKIP', reason: 'No path' };

    const rel = _toRelative(entity.path);
    if (!rel) return { projection: 'runtime', status: 'SKIP', reason: 'Path not resolvable' };

    const server = _loadServerContent();
    // Check if the relative path (forward-slash normalized) is required in server.js
    const normalized = rel.replace(/\\/g, '/').replace(/\.(js|ts)$/, '');
    if (server.includes(rel) || server.includes(normalized) || server.includes('./' + normalized)) {
        return { projection: 'runtime', status: 'SYNC', detail: `Loaded in server.js` };
    }

    // Check route files
    const routesDir = path.join(SCRIPTS_ROOT, 'routes');
    try {
        const routeFiles = fs.readdirSync(routesDir);
        for (const f of routeFiles) {
            if (!f.endsWith('.js')) continue;
            let content;
            try { content = fs.readFileSync(path.join(routesDir, f), 'utf8'); } catch (_) { continue; }
            if (content.includes(normalized) || content.includes(rel)) {
                return { projection: 'runtime', status: 'SYNC', detail: `Loaded via routes/${f}` };
            }
        }
    } catch (_) {}

    return { projection: 'runtime', status: 'DRIFT', detail: 'Not loaded in server.js or any route file' };
}

// ── Documentation projection ─────────────────────────────────────────────────
// Is this entity referenced by ENT-ID in any architecture doc?

function checkDocumentation(entity) {
    const idx   = _loadDocIndex();
    const files = idx.get(entity.id);
    if (files && files.length > 0) {
        return { projection: 'documentation', status: 'SYNC', files };
    }
    // High-importance families must be documented
    if (DOC_REQUIRED_FAMILIES.has(entity.family)) {
        return { projection: 'documentation', status: 'DRIFT', detail: `${entity.id} not found in any docs/*.md file` };
    }
    return { projection: 'documentation', status: 'SKIP', reason: 'Entity not in doc-required family' };
}

// ── Knowledge projection ─────────────────────────────────────────────────────
// Is this entity's source file indexed in the graphify knowledge graph?

function checkKnowledge(entity) {
    if (_isSkippable(entity.path)) return { projection: 'knowledge', status: 'SKIP', reason: 'No path' };
    if (!['FILE', 'SQL'].includes(entity.type) && !['RNT', 'RTE', 'AUT', 'GOV'].includes(entity.family)) {
        return { projection: 'knowledge', status: 'SKIP', reason: 'Not a code/runtime entity' };
    }

    const rel = _toRelative(entity.path);
    if (!rel) return { projection: 'knowledge', status: 'SKIP', reason: 'Path not resolvable' };

    const nodes = _loadGraphifyNodes();
    const normalized = rel.replace(/\\/g, '/').toLowerCase();
    if (nodes.has(normalized)) {
        return { projection: 'knowledge', status: 'SYNC', detail: `Indexed in graphify: ${rel}` };
    }

    return { projection: 'knowledge', status: 'DRIFT', detail: `Not in graphify graph (run: graphify update .)` };
}

// ── Dashboard projection ─────────────────────────────────────────────────────
// Is this entity surface-visible in dashboard.html?

function checkDashboard(entity) {
    const dashboard = _loadDashboardContent();
    if (!dashboard) return { projection: 'dashboard', status: 'SKIP', reason: 'dashboard.html not readable' };

    if (dashboard.includes(entity.id)) {
        return { projection: 'dashboard', status: 'SYNC', detail: `${entity.id} referenced in dashboard.html` };
    }
    // Only executive/governance/civilisation entities are expected on the dashboard
    if (['GOV', 'CIV', 'EXEC'].includes(entity.family)) {
        return { projection: 'dashboard', status: 'DRIFT', detail: 'Governance entity absent from dashboard' };
    }
    return { projection: 'dashboard', status: 'SKIP', reason: 'Not a dashboard-required entity' };
}

// ── Monitoring projection ────────────────────────────────────────────────────
// Is this entity referenced in the telemetry/observability layer?

function checkMonitoring(entity) {
    const monitorable = ['TABLE', 'SERVICE', 'ROUTE', 'API', 'MIDDLEWARE'].includes(entity.type) ||
                        ['RNT', 'GOV', 'AUT'].includes(entity.family);
    if (!monitorable) return { projection: 'monitoring', status: 'SKIP', reason: 'Not a monitorable entity type' };

    const telemetry = _loadTelemetryContent();
    if (telemetry && (telemetry.includes(entity.id) || (entity.name && telemetry.includes(entity.name)))) {
        return { projection: 'monitoring', status: 'SYNC', detail: 'Referenced in telemetry route' };
    }

    // Check observability docs
    const obsPath = path.join(SCRIPTS_ROOT, 'docs', 'OBSERVABILITY-ATLAS.md');
    try {
        const obsContent = fs.readFileSync(obsPath, 'utf8');
        if (obsContent.includes(entity.id) || (entity.name && obsContent.includes(entity.name))) {
            return { projection: 'monitoring', status: 'SYNC', detail: 'Referenced in OBSERVABILITY-ATLAS.md' };
        }
    } catch (_) {}

    return { projection: 'monitoring', status: 'DRIFT', detail: 'Not referenced in telemetry layer or observability docs' };
}

// ── Memory projection ────────────────────────────────────────────────────────
// Is this entity present in the episodic memory / vault?

function checkMemory(entity) {
    const memoryWorthy = ['CIV', 'GOV', 'CORE', 'EXEC'].includes(entity.family) ||
                         ['SERVICE', 'TABLE', 'MIDDLEWARE'].includes(entity.type);
    if (!memoryWorthy) return { projection: 'memory', status: 'SKIP', reason: 'Not a memory-worthy entity type' };

    const vault = _loadVaultContent();
    if (vault && vault.includes(entity.id)) {
        return { projection: 'memory', status: 'SYNC', detail: 'Referenced in Claude-Memory vault' };
    }
    if (vault && entity.name && vault.toLowerCase().includes(entity.name.toLowerCase())) {
        return { projection: 'memory', status: 'SYNC', detail: 'Name referenced in Claude-Memory vault' };
    }

    return { projection: 'memory', status: 'DRIFT', detail: 'Not found in episodic memory vault' };
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
    checkRuntime,
    checkDocumentation,
    checkKnowledge,
    checkDashboard,
    checkMonitoring,
    checkMemory,
    checkProjection, checkAllProjections,
};
